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
import {
  bold,
  createCliRenderer,
  dim,
  fg,
  italic,
  strikethrough,
  StyledText,
  TextRenderable,
} from "@opentui/core";
import type { CliRenderer, TextChunk } from "@opentui/core";
import { spans, type Span } from "../core/ansi.ts";
import type { Document } from "../core/document.ts";
import { render as renderFrame, statusBar } from "../core/renderer.ts";
import { clampViewport, createViewport, moveCursor, type Viewport } from "../core/viewport.ts";
import { COMMANDS, matchKey, menuBar, reduceCommand, toChord, type Key } from "../core/commands.ts";

/** Rows reserved at the top of the screen for the menu bar. */
const MENU_HEIGHT = 1;
/** Rows reserved at the bottom of the screen for the status line. */
const STATUS_HEIGHT = 1;

function viewportFor(renderer: CliRenderer): Viewport {
  const width = renderer.width || 80;
  const height = Math.max(1, (renderer.height || 24) - MENU_HEIGHT - STATUS_HEIGHT);
  return createViewport(0, 0, width, height);
}

/** One styled chunk per SGR span. OpenTUI does not parse escape bytes itself. */
function chunk(s: Span): TextChunk {
  let c: TextChunk = { __isChunk: true, text: s.text };
  if (s.fg) c = fg(s.fg)(c);
  if (s.bold) c = bold(c);
  if (s.dim) c = dim(c);
  if (s.italic) c = italic(c);
  if (s.strike) c = strikethrough(c);
  return c;
}

/** SGR-escaped frame text -> OpenTUI StyledText. */
function styled(text: string): StyledText {
  return new StyledText(spans(text).map(chunk));
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
      width: renderer.width || 80,
      height: renderer.height || 24,
      selectable: false,
      onMouseScroll: (e) => this.onMouseScroll(e),
      onMouseDown: (e) => this.onMouseDown(e),
    });
    renderer.root.add(this.text);
    renderer.useMouse = true;
    renderer.keyInput.on("keypress", this.onKey);
    renderer.on("resize", () => this.onResize());
    this.draw();
  }

  private onMouseScroll = (e: { scroll?: { delta: number } }): void => {
    const delta = e.scroll?.delta ?? 0;
    if (delta === 0) {
      return;
    }
    this.vp = moveCursor(this.vp, delta > 0 ? 3 : -3, this.doc.lines.length);
    this.draw();
  };

  private onMouseDown = (e: { y: number }): void => {
    const row = e.y - MENU_HEIGHT; // skip the menu bar
    const total = this.doc.lines.length;
    if (row < 0 || row >= this.vp.height || total === 0) {
      return;
    }
    const line = this.vp.offset + row;
    this.vp = { ...this.vp, cursor: Math.max(0, Math.min(line, total - 1)) };
    this.draw();
  };

  private draw = (): void => {
    const rows = [
      menuBar(COMMANDS),
      ...renderFrame(this.doc, this.vp, { color: true }),
      statusBar(this.doc, this.vp, { color: true }),
    ];
    this.text.content = styled(rows.join("\n"));
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
    this.text.width = this.renderer.width;
    this.text.height = this.renderer.height;
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
