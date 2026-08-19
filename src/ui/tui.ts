/**
 * OpenTUI fullscreen shell for mdtation.
 *
 * OpenTUI's native core only loads under Bun ("OpenTUI native FFI is not
 * available for this runtime yet" on Node), so the interactive shell is run via
 * `bun src/bin.ts <file>`. All key → viewport dispatch is pure
 * (toChord -> matchKey -> reduceCommand, in core/commands.ts) and unit-tested
 * without the native core. v1 wires a single text renderable that mirrors
 * `Renderer.render`'s frame plus a menu-bar line; mouse (wheel/click) is
 * enabled but wired in a later slice.
 */
import { createCliRenderer, TextRenderable } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { Document } from "../core/document.ts";
import { render as renderFrame } from "../core/renderer.ts";
import { clampViewport, createViewport, type Viewport } from "../core/viewport.ts";
import { COMMANDS, matchKey, menuBar, reduceCommand, toChord, type Key } from "../core/commands.ts";

/** Rows reserved at the top of the screen for the menu bar. */
const MENU_HEIGHT = 1;

function viewportFor(renderer: CliRenderer): Viewport {
  const width = renderer.width || 80;
  const height = Math.max(1, (renderer.height || 24) - MENU_HEIGHT);
  return createViewport(0, 0, width, height);
}

export class TuiShell {
  readonly renderer: CliRenderer;
  private readonly text: TextRenderable;
  private readonly doc: Document;
  private vp: Viewport;

  constructor(renderer: CliRenderer, doc: Document) {
    this.renderer = renderer;
    this.doc = doc;
    this.vp = clampViewport(viewportFor(renderer), doc.lines.length);
    this.text = new TextRenderable(renderer, { id: "mdtation-doc", content: "" });
    renderer.root.add(this.text);
    renderer.useMouse = true;
    renderer.keyInput.on("keypress", this.onKey);
    renderer.on("resize", () => this.onResize());
    this.draw();
  }

  private draw = (): void => {
    const width = this.vp.width;
    const menu = menuBar(COMMANDS).padEnd(width).slice(0, width);
    this.text.content = [menu, ...renderFrame(this.doc, this.vp, { color: true })].join("\n");
    this.renderer.requestRender();
  };

  private onKey = (e: unknown): void => {
    const action = reduceCommand(matchKey(toChord(e as Key))?.id, this.vp, this.doc.lines.length);
    if (action.quit) {
      this.dispose();
    } else if (action.vp) {
      this.vp = action.vp;
      this.draw();
    }
  };

  private onResize = (): void => {
    this.vp = clampViewport(viewportFor(this.renderer), this.doc.lines.length);
    this.draw();
  };

  dispose(): void {
    this.renderer.keyInput.off("keypress", this.onKey);
    this.renderer.destroy();
    // OpenTUI's destroy() may not drain the process on its own, so the shell
    // owns a hard exit once the user quits (q / Ctrl-c).
    process.exit(0);
  }
}

/** Mount the fullscreen TUI for `doc`. The shell runs until the user quits. */
export async function runTui(doc: Document): Promise<TuiShell> {
  const renderer = await createCliRenderer({ useMouse: true });
  const shell = new TuiShell(renderer, doc);
  return shell;
}
