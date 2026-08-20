/**
 * OpenTUI fullscreen shell for mdtation.
 *
 * OpenTUI's native core only loads under Bun, so the interactive shell runs via
 * `bun src/bin.ts <file>`. Layout is a column flex: menu bar / breadcrumb /
 * body / status bar. Key dispatch is pure (toChord -> matchKey -> run) and the
 * shell keeps at most one overlay (src/ui/overlay.ts), which sees keys first.
 * The body is a single `TextRenderable` with `wrapMode: "none"`: the frame is
 * pre-wrapped by `render()` and must never be re-wrapped by OpenTUI.
 */
import { createCliRenderer, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent, MouseEvent } from "@opentui/core";
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { styled } from "./styled.ts";
import type { Overlay } from "./overlay.ts";
import { Crumb, Dropdown, MenuBar, StatusBar } from "./chrome.ts";
import { Help } from "./help.ts";
import { Palette } from "./palette.ts";
import { Modal } from "./modal.ts";
import { copy } from "./clipboard.ts";
import { CommentStore, copyFormat } from "../core/comment.ts";
import { create, markers, storePath } from "../core/comments.ts";
import { nextComment, prevComment } from "../core/nav.ts";
import { parseDocument, type Document } from "../core/document.ts";
import { box, toggle } from "../core/edit.ts";
import { displayWidth } from "../core/unicode.ts";
import { crumb } from "../core/crumb.ts";
import { loadConfig, type View } from "../core/config.ts";
import { menus, specs, step } from "../core/menu.ts";
import { GUTTER_WIDTH, render as renderFrame, statusBar } from "../core/renderer.ts";
import { clampViewport, createViewport, jumpToLine, pan, type Viewport } from "../core/viewport.ts";
import { COMMANDS, matchKey, reduceCommand, toChord, type CommandId } from "../core/commands.ts";

/** Rows of chrome above the body (menu bar + breadcrumb). */
const HEADER = 2;
/** Rows of chrome below the body (status bar). */
const FOOTER = 1;
/** View-menu command -> the flag it flips. */
const VIEW: Partial<Record<CommandId, keyof View>> = {
  viewColor: "color",
  viewEmphasis: "emphasis",
  viewSyntax: "syntax",
};

export class TuiShell {
  readonly renderer: CliRenderer;
  doc: Document;
  dirty = false;
  /** Set once `q` was refused on a dirty file; the next `q` discards. */
  private guard = false;
  readonly store: CommentStore;
  private readonly file: string;
  overlay: Overlay | null = null;
  private readonly spec = specs(menus(COMMANDS));
  /** View toggles, seeded from `mdtation.json`; flips are session-only. */
  private flags: View = loadConfig(process.cwd()).view;
  private readonly bar: MenuBar;
  private readonly crumb: Crumb;
  private readonly text: TextRenderable;
  private readonly status: StatusBar;
  private view: Viewport;
  /** Index of the open menu, or null. */
  private cur = -1;

  constructor(renderer: CliRenderer, doc: Document, file = "", store = new CommentStore()) {
    this.renderer = renderer;
    this.doc = doc;
    this.file = file;
    this.store = store;
    this.view = clampViewport(this.fit(), doc.lines.length);
    this.bar = new MenuBar(renderer, this.spec, basename(file), {
      hover: (i) => this.cur >= 0 && this.cur !== i && this.menuOpen(i),
      toggle: (i) => (this.cur === i ? this.close() : this.menuOpen(i)),
    });
    this.crumb = new Crumb(renderer);
    this.text = new TextRenderable(renderer, {
      id: "body",
      content: "",
      width: "100%",
      flexGrow: 1,
      flexShrink: 1,
      selectable: false,
      wrapMode: "none",
      onMouseScroll: (e) => this.wheel(e),
      onMouseDown: (e) => this.click(e),
    });
    this.status = new StatusBar(renderer, { click: () => this.close() });
    renderer.root.flexDirection = "column";
    for (const n of [this.bar.node, this.crumb.node, this.text, this.status.node]) {
      renderer.root.add(n);
    }
    renderer.useMouse = true;
    renderer.keyInput.on("keypress", this.onKey);
    renderer.on("resize", () => this.resize());
    this.draw();
  }

  get vp(): Viewport {
    return this.view;
  }

  private fit(): Viewport {
    const width = this.renderer.width || 80;
    const height = Math.max(1, (this.renderer.height || 24) - HEADER - FOOTER);
    return createViewport(this.view?.offset ?? 0, this.view?.cursor ?? 0, width, height);
  }

  /** Move the cursor to `line` (clamped, scrolled on-screen) and redraw. */
  setCursor(line: number): void {
    this.view = jumpToLine(this.view, line, this.doc.lines.length);
    this.draw();
  }

  /** Show `o` (replacing any open overlay). It sees keys first until closed. */
  open(o: Overlay): void {
    this.close();
    this.overlay = o;
    this.renderer.root.add(o.node);
    this.renderer.requestRender();
  }

  close(): void {
    const o = this.overlay;
    this.overlay = null;
    this.cur = -1;
    this.bar.active = null;
    if (o) {
      this.renderer.root.remove(o.node);
      o.dispose?.();
    }
    this.renderer.requestRender();
  }

  /** Live menu model: View entries carry their current check state. */
  private menus() {
    return menus(COMMANDS, (id) => {
      const k = VIEW[id as CommandId];
      return k && this.flags[k];
    });
  }

  private menuOpen(i: number): void {
    this.open(
      new Dropdown(this.renderer, this.menus()[i]!, this.spec[i]!, {
        run: (id) => {
          this.close();
          this.run(id as CommandId);
        },
        close: () => this.close(),
        switch: (d) => this.menuOpen(step(i, d, this.spec.length)),
      }),
    );
    this.cur = i;
    this.bar.active = i;
  }

  /** Wheel pans the window; the cursor is dragged along so it stays visible. */
  private wheel(e: MouseEvent): void {
    const dir = e.scroll?.direction;
    if (dir !== "up" && dir !== "down") {
      return;
    }
    this.view = pan(this.view, dir === "down" ? 3 : -3, this.doc.lines.length);
    this.draw();
  }

  private click(e: MouseEvent): void {
    if (this.overlay instanceof Dropdown) {
      this.close();
      return;
    }
    const row = e.y - this.text.y;
    if (row < 0 || row >= this.view.height || this.doc.lines.length === 0) {
      return;
    }
    const line = Math.min(this.view.offset + row, this.doc.lines.length - 1);
    this.view = { ...this.view, cursor: line };
    const b = box(this.doc.lines[line] ?? "");
    const col = e.x - this.text.x - GUTTER_WIDTH;
    const left = b ? displayWidth(this.doc.lines[line]!.slice(0, b.at)) : -1;
    if (b && col >= left && col <= left + 2) {
      this.toggle();
      return;
    }
    this.draw();
  }

  /** Flip the task box on the cursor line and mark the document dirty. */
  private toggle(): void {
    const text = toggle(this.doc.text, this.view.cursor);
    if (text === null) {
      this.draw("NO CHECKBOX");
      return;
    }
    this.doc = parseDocument(text);
    this.dirty = true;
    this.draw();
  }

  private save(): void {
    if (this.file) {
      void writeFile(this.file, this.doc.text);
    }
    this.dirty = false;
    this.draw("SAVED");
  }

  draw(mode = this.dirty ? "UNSAVED" : "VIEW"): void {
    const marks = markers(this.store, this.doc);
    this.bar.label = this.dirty ? `${basename(this.file)} ●` : basename(this.file);
    this.crumb.text = crumb(this.doc, this.view.cursor);
    this.text.content = styled(
      renderFrame(this.doc, this.view, { ...this.flags, markers: marks }).join("\n"),
    );
    this.status.update(statusBar(this.doc, this.view, { markers: marks }), mode);
    this.renderer.requestRender();
  }

  /** Open the comment modal for the cursor line; ↵ adds + persists the comment. */
  private comment(): void {
    const line = this.view.cursor;
    this.open(
      new Modal(this.renderer, {
        title: "Comment",
        quote: this.doc.lines[line] ?? "",
        submit: (text) => {
          this.store.add(create(this.doc, line, text));
          if (this.file) {
            void this.store.save(storePath(this.file));
          }
          this.close();
          this.draw("SAVED");
        },
        close: () => this.close(),
      }),
    );
  }

  /** Copy the structured reference of the comment under the cursor (OSC-52 + file). */
  private copy(): void {
    const c = this.store
      .all()
      .find((x) => this.store.resolve(x.anchor, this.doc)?.startLine === this.view.cursor);
    if (!c) {
      this.draw("NO COMMENT HERE");
      return;
    }
    copy(this.file || "mdtation.md", copyFormat(c, this.doc));
    this.draw("COPIED");
  }

  /** Run a command by id. */
  private run(id: CommandId): void {
    const total = this.doc.lines.length;
    switch (id) {
      case "help":
        this.open(new Help(this.renderer, () => this.close()));
        return;
      case "palette":
        this.open(
          new Palette(
            this.renderer,
            (x) => this.run(x as CommandId),
            () => this.close(),
          ),
        );
        return;
      case "comment":
        this.comment();
        return;
      case "copy":
        this.copy();
        return;
      case "toggle":
        this.toggle();
        return;
      case "save":
        this.save();
        return;
      case "viewColor":
      case "viewEmphasis":
      case "viewSyntax": {
        const k = VIEW[id]!;
        this.flags = { ...this.flags, [k]: !this.flags[k] };
        this.draw();
        return;
      }
      case "quit":
        if (this.dirty && !this.guard) {
          this.guard = true;
          this.draw("UNSAVED · q again to discard · ^S saves");
          return;
        }
        break;
      case "nextComment":
        this.view = nextComment(this.view, total, this.store, this.doc);
        this.draw();
        return;
      case "prevComment":
        this.view = prevComment(this.view, total, this.store, this.doc);
        this.draw();
        return;
    }
    const action = reduceCommand(id, this.view, this.doc.lines.length);
    if (action.quit) {
      this.dispose();
    } else if (action.vp) {
      this.view = action.vp;
      this.draw();
    }
  }

  private onKey = (e: KeyEvent): void => {
    if (this.overlay?.key(e)) {
      return;
    }
    if (e.name === "f10") {
      this.menuOpen(0);
      return;
    }
    const id = matchKey(toChord(e))?.id as CommandId | undefined;
    if (id !== "quit") {
      this.guard = false;
    }
    if (id) {
      e.preventDefault(); // keep the opening key out of an overlay's input
      this.run(id);
    }
  };

  private resize(): void {
    this.view = clampViewport(this.fit(), this.doc.lines.length);
    this.draw();
  }

  dispose(): void {
    this.renderer.keyInput.off("keypress", this.onKey);
    this.renderer.destroy();
    // OpenTUI's destroy() may not drain the process on its own, so the shell
    // owns a hard exit once the user quits (q / Ctrl-c).
    process.exit(0);
  }
}

/** Mount the fullscreen TUI for `doc`. `file` is shown in the menu bar. The shell runs until the user quits. */
export async function runTui(doc: Document, file = ""): Promise<TuiShell> {
  const store = file ? await CommentStore.load(storePath(file)) : new CommentStore();
  return new TuiShell(await createCliRenderer({ useMouse: true }), doc, file, store);
}
