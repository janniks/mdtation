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
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { styled } from "./styled.ts";
import type { Overlay } from "./overlay.ts";
import { Crumb, Dropdown, MenuBar, StatusBar } from "./chrome.ts";
import { Help } from "./help.ts";
import { Palette } from "./palette.ts";
import { Modal } from "./modal.ts";
import { copy } from "./clipboard.ts";
import { CommentStore, copyFormat } from "../core/comment.ts";
import { create, markers } from "../core/comments.ts";
import { load, save } from "../core/store.ts";
import { report } from "../core/report.ts";
import { end, field, set } from "../core/front.ts";
import { cycle, DEFAULTS, rows as settings, type Values } from "../core/settings.ts";
import { nextComment, prevComment } from "../core/nav.ts";
import { parseDocument, type Document } from "../core/document.ts";
import { box, toggle } from "../core/edit.ts";
import { displayWidth } from "../core/unicode.ts";
import { crumb } from "../core/crumb.ts";
import { loadConfig } from "../core/config.ts";
import { menus, specs, step } from "../core/menu.ts";
import { GUTTER_WIDTH, render as renderFrame, statusBar } from "../core/renderer.ts";
import {
  clampViewport,
  createViewport,
  jumpToLine,
  moveCursor,
  type Viewport,
} from "../core/viewport.ts";
import { COMMANDS, matchKey, reduceCommand, toChord, type CommandId } from "../core/commands.ts";

/** Rows of chrome below the body (status bar). */
const FOOTER = 1;
/** Cursor glyphs cycled by `View › Next caret glyph`. */
const CARETS = [">", "+", "▶", "›", "●"];

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
  /** View-menu toggles keyed by command id, seeded from `mdtation.json`; flips are session-only. */
  private on: Record<string, boolean>;
  /** Settings palette values (scroll margin, beta flags). */
  private prefs: Values = DEFAULTS;
  private glyph = 0;
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
    const cfg = loadConfig(process.cwd()).view;
    this.on = {
      viewColor: cfg.color,
      viewEmphasis: cfg.emphasis,
      viewSyntax: cfg.syntax,
      viewMarkup: false,
      viewFront: false,
      viewCrumb: true,
      viewArchive: false,
    };
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
    const header = this.on.viewCrumb ? 2 : 1;
    const height = Math.max(1, (this.renderer.height || 24) - header - FOOTER);
    return {
      ...createViewport(
        this.view?.offset ?? 0,
        this.view?.cursor ?? 0,
        width,
        height,
        Number(this.prefs.margin),
      ),
      first: this.on.viewFront ? 0 : end(this.doc.lines) + 1,
    };
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
    return menus(COMMANDS, (id) => this.on[id]);
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

  /** Wheel moves the cursor; the window follows once the cursor hits the scroll margin. */
  private wheel(e: MouseEvent): void {
    const dir = e.scroll?.direction;
    if (dir !== "up" && dir !== "down") {
      return;
    }
    this.view = moveCursor(this.view, dir === "down" ? 3 : -3, this.doc.lines.length);
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
    const f = this.prefs.front === "on" ? field(this.doc.lines, line) : null;
    if ((b && col >= left && col <= left + 2) || (f && col > f.key.length)) {
      this.toggle();
      return;
    }
    this.draw();
  }

  /** Flip the task box on the cursor line, or edit a frontmatter field there; marks the document dirty. */
  private toggle(): void {
    const line = this.view.cursor;
    const f = this.prefs.front === "on" ? field(this.doc.lines, line) : null;
    if (f) {
      this.open(
        new Modal(this.renderer, {
          title: `Edit ${f.key}`,
          quote: this.doc.lines[line] ?? "",
          value: f.value,
          submit: (value) => this.edit(set(this.doc.text, line, value)),
          close: () => this.close(),
        }),
      );
      return;
    }
    this.edit(toggle(this.doc.text, line));
  }

  /** Replace the document text (null = nothing editable here). */
  private edit(text: string | null): void {
    if (text === null) {
      this.draw("NOTHING TO EDIT");
      return;
    }
    this.doc = parseDocument(text);
    this.dirty = true;
    this.draw();
  }

  /** Write all comments (with provenance) to a temp file and open it in `$EDITOR`. */
  private editor(): void {
    const path = join(tmpdir(), "mdtation-comments.md");
    writeFileSync(path, report(this.store, this.doc, this.file));
    this.renderer.suspend();
    spawnSync(process.env.EDITOR ?? "vi", [path], { stdio: "inherit" });
    this.renderer.resume();
    this.draw();
  }

  private persist(): void {
    if (this.file) {
      void save(this.file, this.store);
    }
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
    this.crumb.node.visible = this.on.viewCrumb === true;
    this.crumb.text = crumb(this.doc, this.view.cursor, Number(this.prefs.crumb) || Infinity);
    this.text.content = styled(
      renderFrame(this.doc, this.view, {
        color: this.on.viewColor,
        emphasis: this.on.viewEmphasis,
        syntax: this.on.viewSyntax,
        markup: !this.on.viewMarkup,
        caret: CARETS[this.glyph],
        markers: marks,
      }).join("\n"),
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
          this.persist();
          this.close();
          this.draw("SAVED");
        },
        close: () => this.close(),
      }),
    );
  }

  /** Copy the structured reference of the comment under the cursor (OSC-52 + file).
   * With `View › Archive comments on copy`, the comment is archived (recoverable via `--restore`). */
  private copy(): void {
    const c = this.store
      .live()
      .find((x) => this.store.resolve(x.anchor, this.doc)?.startLine === this.view.cursor);
    if (!c) {
      this.draw("NO COMMENT HERE");
      return;
    }
    copy(copyFormat(c, this.doc));
    if (this.on.viewArchive) {
      this.store.archive(c.id);
      this.persist();
      this.draw("COPIED · ARCHIVED");
      return;
    }
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
      case "editor":
        this.editor();
        return;
      case "settings":
        this.open(
          new Palette(
            this.renderer,
            (x) => {
              this.prefs = cycle(this.prefs, x.slice(4));
              this.resize();
            },
            () => this.close(),
            { title: "Settings", items: () => settings(this.prefs), stay: true },
          ),
        );
        return;
      case "viewCaret":
        this.glyph = (this.glyph + 1) % CARETS.length;
        this.draw();
        return;
      case "toggle":
        this.toggle();
        return;
      case "save":
        this.save();
        return;
      case "viewColor":
      case "viewEmphasis":
      case "viewSyntax":
      case "viewMarkup":
      case "viewFront":
      case "viewCrumb":
      case "viewArchive":
        this.on[id] = !this.on[id];
        this.view = clampViewport(this.fit(), total);
        this.draw();
        return;
      case "quit":
        if (this.dirty && !this.guard) {
          this.guard = true;
          this.draw("UNSAVED · q again to discard · ^s saves");
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
  const store = file ? await load(file) : new CommentStore();
  return new TuiShell(await createCliRenderer({ useMouse: true }), doc, file, store);
}
