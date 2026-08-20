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
import { wrapLine, displayWidth } from "./unicode.ts";

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

/** Does `line` look like a GFM table row: `|`-delimited with at least 2 cells. */
function isTableRow(line: string): boolean {
  const t = line.trim();
  return /^\|.*\|$/.test(t) && t.split("|").length >= 4;
}

/** Is `line` a separator row (`| --- | :---- |` with optional colons)? */
function isSepRow(line: string): boolean {
  return parseCells(line).every((c) => /^-*:?-+:?\s*$/.test(c) && c.includes("-"));
}

/** Parse `| a | b |` into `["a","b"]`. */
function parseCells(row: string): string[] {
  const t = row.trim();
  return t
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

/** Align a run of plain table rows into even-width columns. */
export function tableLayout(rows: string[]): string[] {
  const cellRows = rows.map(parseCells);
  const ncol = Math.max(...cellRows.map((c) => c.length));
  const widths: number[] = Array.from({ length: ncol }, () => 0);
  for (const cells of cellRows) {
    for (let c = 0; c < cells.length; c++) {
      widths[c] = Math.max(widths[c]!, displayWidth(cells[c]!));
    }
  }
  const out = cellRows.map((cells) => {
    const parts: string[] = [];
    for (let c = 0; c < ncol; c++) {
      const cell = cells[c] ?? "";
      const pad = widths[c]! - displayWidth(cell);
      parts.push(cell + " ".repeat(Math.max(0, pad)));
    }
    return `| ${parts.join(" | ")} |`;
  });
  return out;
}

/** Style an aligned table row: gray borders, dimmed separator. */
function colorTable(row: string, sep: boolean): string {
  if (sep) {
    return `${SGR.dim}${row}${SGR.reset}`;
  }
  return row.replace(/\|/g, `${SGR.gray}|${SGR.reset}`);
}

/** Detect runs of table rows (whose 2nd line is a separator) and align them.
 * Lines inside fenced code blocks are never treated as tables. Mutates `rows`
 * in place and records which rows are tables in `flags`. */
function markTables(rows: string[], flags: boolean[], start: number, doc: Document): void {
  const n = rows.length;
  let i = 0;
  while (i < n) {
    const sl = start + i;
    if (codeBlockAt(doc, sl) || !isTableRow(rows[i]!)) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && !codeBlockAt(doc, start + j) && isTableRow(rows[j]!)) {
      j++;
    }
    const laid = tableLayout(rows.slice(i, j));
    if (laid.length >= 2 && isSepRow(laid[1]!)) {
      for (let k = 0; k < laid.length; k++) {
        rows[i + k] = laid[k]!;
        flags[i + k] = true;
      }
    }
    i = j;
  }
}

export function render(doc: Document, vp: Viewport, opts: RenderOptions = {}): string[] {
  const markers = new Set(opts.markers ?? []);
  const color = opts.color === true;
  const cursorOn = vp.cursor >= vp.offset && vp.cursor < vp.offset + vp.height;
  const start = Math.max(0, vp.offset);
  const height = Math.max(0, vp.height);
  const end = Math.min(doc.lines.length, start + height);
  const colWidth = Math.max(1, vp.width - GUTTER_WIDTH);
  const src: string[] = [];
  for (let i = start; i < end; i++) {
    src.push(doc.lines[i] ?? "");
  }
  const flags: boolean[] = Array.from({ length: src.length }, () => false);
  markTables(src, flags, start, doc);
  const lines: string[] = [];
  for (let i = start; i < end; i++) {
    const idx = i - start;
    const body = src[idx]!;
    if (flags[idx]) {
      const g = gutterFor(i, vp, cursorOn, markers, color);
      lines.push(g + (color ? colorTable(body, isSepRow(body)) : body));
      continue;
    }
    const chunks = wrapLine(body, colWidth);
    chunks.forEach((chunk, ri) => {
      const g = ri === 0 ? gutterFor(i, vp, cursorOn, markers, color) : "  ";
      lines.push(g + bodyFor(i, chunk, doc, color));
    });
  }
  return lines;
}

/** Status line: cursor position, comment count, mode. */
export function statusBar(doc: Document, vp: Viewport, opts: RenderOptions = {}): string {
  const count = new Set(opts.markers ?? []).size;
  const cur = Math.min(vp.cursor + 1, doc.lines.length);
  const plural = count === 1 ? "" : "s";
  const plain = `Ln ${cur}/${doc.lines.length} · ${count} comment${plural}`;
  if (!opts.color) {
    return plain;
  }
  const num = SGR.green;
  const label = SGR.dim;
  const mode = SGR.gray;
  return `${label}Ln${SGR.reset} ${num}${cur}/${doc.lines.length}${SGR.reset} · ${num}${count}${SGR.reset} comment${plural} · ${mode}view${SGR.reset}`;
}
