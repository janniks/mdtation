/**
 * Pure renderer. Given a parsed Document and a Viewport it produces the frame:
 * the slice of visible lines, each prefixed by a 2-column gutter that marks the
 * cursor line and any commented lines.
 *
 * Output is plain text by default (deterministic for golden tests and pipable
 * via `mdtation --no-tui`). When `RenderOptions.color` is set, the frame is
 * styled with ANSI SGR (bold / italic / colors) for the OpenTUI shell; fenced
 * code is syntax-highlighted via `highlight` (fences dimmed, inner code
 * tokenized). Theming lives here as pure functions so it is golden-testable.
 */
import type { Document, Heading } from "./document.ts";
import type { Viewport } from "./viewport.ts";
import { highlight } from "./syntax.ts";

export interface RenderOptions {
  /** 0-based line indices that carry a comment. */
  readonly markers?: readonly number[];
  /** Emit ANSI styling (bold / italic / colors). Default false. */
  readonly color?: boolean;
}

/** Width (in columns) of the gutter prepended to every rendered line. */
export const GUTTER_WIDTH = 2;

/** ANSI SGR escapes. Only emitted when color is requested. */
const SGR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  strike: "\x1b[9m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
} as const;

/** Heading level (1-6) -> accent color. */
const HEADING_COLOR: Readonly<Record<number, string>> = {
  1: SGR.red,
  2: SGR.cyan,
  3: SGR.blue,
  4: SGR.magenta,
  5: SGR.gray,
  6: SGR.gray,
};

function headingAt(doc: Document, line: number): Heading | undefined {
  return doc.headings.find((h) => h.startLine === line);
}

/** Return the fenced code block covering `line`, if any. */
function codeBlockAt(doc: Document, line: number) {
  return doc.codeBlocks.find((b) => line >= b.startLine && line <= b.endLine);
}

/** Minimal inline markdown: `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`. */
function styleInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, (_, p: string) => `${SGR.bold}${p}${SGR.reset}`)
    .replace(/`([^`]+)`/g, (_, p: string) => `${SGR.gray}${p}${SGR.reset}`)
    .replace(/~~(.+?)~~/g, (_, p: string) => `${SGR.strike}${p}${SGR.reset}`)
    .replace(/\*([^*]+?)\*/g, (_, p: string) => `${SGR.italic}${p}${SGR.reset}`);
}

/** Color the bullet/number of a markdown list item; `undefined` for non-list lines. */
function styleList(raw: string): string | undefined {
  const ul = raw.match(/^( *)([-*+\u2022])\s+(.*)$/);
  if (ul) {
    return `${SGR.cyan}${ul[1]}${ul[2]}${SGR.reset} ${ul[3]}`;
  }
  const ol = raw.match(/^( *)(\d+\.)\s+(.*)$/);
  if (ol) {
    return `${SGR.cyan}${ol[1]}${ol[2]}${SGR.reset} ${ol[3]}`;
  }
  return undefined;
}

/** Hard-wrap `text` into chunks no wider than `width` columns. */
function hardWrap(text: string, width: number): string[] {
  if (width <= 0) {
    return [text];
  }
  const rows: string[] = [];
  for (let i = 0; i < text.length; i += width) {
    rows.push(text.slice(i, i + width));
  }
  return rows;
}

function gutterFor(
  line: number,
  vp: Viewport,
  cursorOn: boolean,
  markers: ReadonlySet<number>,
  color: boolean,
): string {
  let g: string;
  if (line === vp.cursor && cursorOn) {
    g = "> ";
  } else if (markers.has(line)) {
    g = "● ";
  } else {
    g = "  ";
  }
  if (color) {
    if (g === "> ") {
      return `${SGR.green}${g}${SGR.reset}`;
    }
    if (g === "● ") {
      return `${SGR.yellow}${g}${SGR.reset}`;
    }
  }
  return g;
}

function bodyFor(line: number, raw: string, doc: Document, color: boolean): string {
  if (!color) {
    return raw;
  }
  const heading = headingAt(doc, line);
  if (heading) {
    return `${SGR.bold}${HEADING_COLOR[heading.level] ?? SGR.gray}${raw}${SGR.reset}`;
  }
  const block = codeBlockAt(doc, line);
  if (block) {
    if (line === block.startLine || line === block.endLine) {
      return `${SGR.dim}${raw}${SGR.reset}`;
    }
    return highlight(raw, block.lang ?? null);
  }
  return styleList(raw) ?? styleInline(raw);
}

export function render(doc: Document, vp: Viewport, opts: RenderOptions = {}): string[] {
  const markers = new Set(opts.markers ?? []);
  const color = opts.color === true;
  const cursorOn = vp.cursor >= vp.offset && vp.cursor < vp.offset + vp.height;
  const start = Math.max(0, vp.offset);
  const height = Math.max(0, vp.height);
  const end = Math.min(doc.lines.length, start + height);
  const colWidth = Math.max(1, vp.width - GUTTER_WIDTH);
  const lines: string[] = [];
  for (let i = start; i < end; i++) {
    const raw = doc.lines[i] ?? "";
    const chunks = raw.length > colWidth ? hardWrap(raw, colWidth) : [raw];
    chunks.forEach((chunk, ri) => {
      const g = ri === 0 ? gutterFor(i, vp, cursorOn, markers, color) : "  ";
      lines.push(g + bodyFor(i, chunk, doc, color));
    });
  }
  return lines;
}
