/**
 * OpenTUI fullscreen shell for mdtation.
 *
 * OpenTUI's native core only loads under Bun ("native FFI is not available for
 * this runtime yet" on Node), so the interactive shell is exercised via
 * `bun run src/bin.ts <file>`. The key → viewport dispatch is extracted into a
 * pure `reduceKey` so the scroll logic is unit-testable without the native core.
 *
 * v1: keyboard navigation (j/k, Ctrl-f/b, Space, G/g, q, Ctrl-c) and a single
 * text renderable that mirrors `Renderer.render`'s frame each move. Mouse
 * (wheel/click to place cursor) is enabled but wired in a later slice.
 */
import { createCliRenderer, TextRenderable } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { Document } from "../core/document.ts";
import { render as renderFrame } from "../core/renderer.ts";
import {
  clampViewport,
  createViewport,
  jumpToLine,
  moveCursor,
  pageDown,
  pageUp,
  type Viewport,
} from "../core/viewport.ts";

export interface Key {
  name?: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  option?: boolean;
}

export interface KeyAction {
  /** New viewport, or undefined when nothing changed. */
  readonly vp?: Viewport;
  /** Quit the shell. */
  readonly quit?: boolean;
}

/** Pure key → viewport dispatch. No terminal state is touched. */
export function reduceKey(vp: Viewport, total: number, key: Key): KeyAction {
  const { name, ctrl } = key;
  if ((ctrl && name === "c") || name === "q") {
    return { quit: true };
  }
  if (name === "j" || name === "down") {
    return { vp: moveCursor(vp, 1, total) };
  }
  if (name === "k" || name === "up") {
    return { vp: moveCursor(vp, -1, total) };
  }
  if ((ctrl && name === "f") || name === " ") {
    return { vp: pageDown(vp, total) };
  }
  if (ctrl && name === "b") {
    return { vp: pageUp(vp, total) };
  }
  if (name === "g") {
    return { vp: jumpToLine(vp, 0, total) };
  }
  if (name === "G") {
    return { vp: jumpToLine(vp, Math.max(0, total - 1), total) };
  }
  return {};
}

function viewportFor(renderer: CliRenderer): Viewport {
  const width = renderer.width || 80;
  const height = Math.max(1, renderer.height || 24);
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
    this.text = new TextRenderable(renderer, {
      id: "mdtation-doc",
      content: "",
    });
    renderer.root.add(this.text);
    renderer.useMouse = true;
    renderer.keyInput.on("keypress", this.onKey);
    renderer.on("resize", () => this.onResize());
    this.draw();
  }

  private draw = (): void => {
    this.text.content = renderFrame(this.doc, this.vp).join("\n");
    this.renderer.requestRender();
  };

  private onKey = (e: unknown): void => {
    const action = reduceKey(this.vp, this.doc.lines.length, e as Key);
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
    // OpenTUI's destroy() may not drain the process on its own, so the
    // shell owns a hard exit once the user quits (q / Ctrl-c).
    process.exit(0);
  }
}

/** Mount the fullscreen TUI for `doc`. Resolves only if the renderer could not
 * be created (rejects), otherwise the shell runs until the user quits. */
export async function runTui(doc: Document): Promise<TuiShell> {
  const renderer = await createCliRenderer({ useMouse: true });
  const shell = new TuiShell(renderer, doc);
  return shell;
}
