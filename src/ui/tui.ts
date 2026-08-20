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
import { styled } from "./styled.ts";
import type { Overlay } from "./overlay.ts";
import { Crumb, Dropdown, MenuBar, StatusBar } from "./chrome.ts";
import type { Document } from "../core/document.ts";
import { crumb } from "../core/crumb.ts";
import { menus, specs, step } from "../core/menu.ts";
import { render as renderFrame, statusBar } from "../core/renderer.ts";
import { clampViewport, createViewport, jumpToLine, pan, type Viewport } from "../core/viewport.ts";
import { COMMANDS, matchKey, reduceCommand, toChord, type CommandId } from "../core/commands.ts";

/** Rows of chrome above the body (menu bar + breadcrumb). */
const HEADER = 2;
/** Rows of chrome below the body (status bar). */
const FOOTER = 1;

export class TuiShell {
  readonly renderer: CliRenderer;
  readonly doc: Document;
  overlay: Overlay | null = null;
  private readonly menu = menus(COMMANDS);
  private readonly spec = specs(this.menu);
  private readonly bar: MenuBar;
  private readonly crumb: Crumb;
  private readonly text: TextRenderable;
  private readonly status: StatusBar;
  private view: Viewport;
  /** Index of the open menu, or null. */
  private cur = -1;

  constructor(renderer: CliRenderer, doc: Document, file = "") {
    this.renderer = renderer;
    this.doc = doc;
    this.view = clampViewport(this.fit(), doc.lines.length);
    this.bar = new MenuBar(renderer, this.spec, file, {
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

  private menuOpen(i: number): void {
    this.open(
      new Dropdown(this.renderer, this.menu[i]!, this.spec[i]!, {
        run: (id) => {
          this.close();
          this.run(id as CommandId);
        },
        close: () => this.close(),
        switch: (d) => this.menuOpen(step(i, d, this.menu.length)),
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
    const line = this.view.offset + row;
    this.view = { ...this.view, cursor: Math.min(line, this.doc.lines.length - 1) };
    this.draw();
  }

  draw(): void {
    this.crumb.text = crumb(this.doc, this.view.cursor);
    this.text.content = styled(renderFrame(this.doc, this.view, { color: true }).join("\n"));
    this.status.update(statusBar(this.doc, this.view), "VIEW");
    this.renderer.requestRender();
  }

  /** Run a command by id. Overlay openers are wired here by the orchestrator. */
  private run(id: CommandId): void {
    switch (id) {
      case "help":
      case "palette":
      case "comment":
      case "copy":
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
    if (id) {
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
  return new TuiShell(await createCliRenderer({ useMouse: true }), doc, file);
}
