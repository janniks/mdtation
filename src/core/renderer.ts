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
import { end as fence } from "./front.ts";
import type { Viewport } from "./viewport.ts";
import { highlight } from "./syntax.ts";
import { colWidth, displayWidth } from "./unicode.ts";

export interface RenderOptions {
  /** 0-based line indices that carry a comment. */
  readonly markers?: readonly number[];
  /** Emit ANSI styling (bold / italic / colors). Default false. */
  readonly color?: boolean;
  /** Color bold / italic / links (needs `color`). Default true. */
  readonly emphasis?: boolean;
  /** Highlight fenced code (needs `color`). Default true. */
  readonly syntax?: boolean;
  /** One-column cursor glyph. Default `>`. */
  readonly caret?: string;
  /** Show markdown markup (inline marks, heading hashes, fence lines). Default true. */
  readonly markup?: boolean;
}

/** Width (in columns) of the gutter prepended to every rendered line. */
export const GUTTER_WIDTH = 2;

/** Thin rule drawn for thematic breaks and (in hide-markup mode) fence rows. */
const RULE = "\u2500".repeat(20);

/** ANSI SGR escapes. Only emitted when color is requested. */
const SGR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  strike: "\x1b[9m",
  underline: "\x1b[4m",
  black: "\x1b[30m",
  bgYellow: "\x1b[43m",
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

/** Minimal inline markdown: `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, links.
 * Marks are dropped whenever the inner text gets styled or markup is hidden. */
function styleInline(text: string, opts: RenderOptions): string {
  const emphasis = opts.color === true && opts.emphasis !== false;
  const markup = opts.markup !== false;
  if (!emphasis && markup) {
    return text;
  }
  const paint = (sgr: string, inner: string) => (emphasis ? `${sgr}${inner}${SGR.reset}` : inner);
  // Links first: later rules emit `\x1b[` escapes that would match the link's `[`.
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t: string, u: string) => {
      const label = paint(SGR.underline + SGR.blue, t);
      return markup ? `${label} ${paint(SGR.dim, `(${u})`)}` : label;
    })
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a: string, b: string) =>
      paint(SGR.bold + SGR.yellow, a ?? b),
    )
    .replace(/`([^`]+)`/g, (_, p: string) => paint(SGR.gray, p))
    .replace(/~~(.+?)~~/g, (_, p: string) => paint(SGR.strike, p))
    .replace(/\*([^*]+?)\*|\b_([^_]+?)_\b/g, (_, a: string, b: string) =>
      paint(SGR.italic + SGR.magenta, a ?? b),
    );
}

/** Color the bullet/number of a markdown list item; `undefined` for non-list lines. */
function styleList(raw: string, opts: RenderOptions): string | undefined {
  const m = raw.match(/^( *)([-*+\u2022]|\d+\.)\s+(.*)$/);
  if (!m) {
    return undefined;
  }
  const mark = opts.color ? `${SGR.cyan}${m[1]}${m[2]}${SGR.reset}` : `${m[1]}${m[2]}`;
  return `${mark} ${styleInline(m[3]!, opts)}`;
}

/** Thematic break: three or more `-`, `*` or `_` on their own line. */
function isRule(raw: string): boolean {
  return /^ {0,3}([-*_])( *\1){2,} *$/.test(raw);
}

/** Like `wrapLine`, but SGR escapes are zero-width and every chunk is closed
 * with a reset and reopened with the styles still active. */
function wrapStyled(text: string, width: number): string[] {
  const rows: string[] = [];
  let cur = "";
  let cols = 0;
  let open = "";
  // oxlint-disable-next-line no-control-regex -- SGR escapes are the point here
  for (const tok of text.match(/\u001b\[[0-9;]*m|./gsu) ?? []) {
    if (tok.startsWith("\x1b")) {
      open = tok === SGR.reset ? "" : open + tok;
      cur += tok;
      continue;
    }
    const w = colWidth(tok);
    if (cols + w > width && cols > 0) {
      rows.push(cur + (open ? SGR.reset : ""));
      cur = open;
      cols = 0;
    }
    cur += tok;
    cols += w;
  }
  if (cur.length > 0 || rows.length === 0) {
    rows.push(cur);
  }
  return rows;
}

/** Gutter cell: the caret on the cursor line, else `★` for one comment or the count. */
function gutterFor(
  line: number,
  vp: Viewport,
  cursorOn: boolean,
  counts: ReadonlyMap<number, number>,
  opts: RenderOptions,
): string {
  const color = opts.color === true;
  if (line === vp.cursor && cursorOn) {
    const g = `${opts.caret ?? ">"} `;
    return color ? `${SGR.green}${g}${SGR.reset}` : g;
  }
  const n = counts.get(line) ?? 0;
  if (n === 0) {
    return "  ";
  }
  const g = n === 1 ? "★" : String(Math.min(n, 9));
  return color ? `${SGR.bgYellow}${SGR.black}${g}${SGR.reset} ` : `${g} `;
}

function bodyFor(
  line: number,
  raw: string,
  doc: Document,
  opts: RenderOptions,
  cols: number,
): string {
  const color = opts.color === true;
  const markup = opts.markup !== false;
  const paint = (sgr: string, s: string) => (color ? `${sgr}${s}${SGR.reset}` : s);
  // Frontmatter: the opening fence stays blank, the closing one is a full-width rule.
  const close = fence(doc.lines);
  if (close > 0 && line === 0) {
    return "";
  }
  if (line === close) {
    return paint(SGR.dim, "\u2500".repeat(cols));
  }
  const heading = headingAt(doc, line);
  if (heading) {
    const text = markup ? raw : raw.replace(/^#+\s*/, "");
    return paint(SGR.bold + (HEADING_COLOR[heading.level] ?? SGR.gray), text);
  }
  const block = codeBlockAt(doc, line);
  if (block) {
    if (line === block.startLine || line === block.endLine) {
      const rule = line === block.startLine && block.lang ? `${RULE} ${block.lang}` : RULE;
      return paint(SGR.dim, markup ? raw : rule);
    }
    return color && opts.syntax !== false ? highlight(raw, block.lang ?? null) : raw;
  }
  if (isRule(raw)) {
    return paint(SGR.dim, RULE);
  }
  return styleList(raw, opts) ?? styleInline(raw, opts);
}

/** Does `line` look like a GFM table row: `|`-delimited with at least 2 cells.
 * Edge pipes are optional, so ragged source tables still qualify. */
function isTableRow(line: string): boolean {
  return line.includes("|") && parseCells(line).length >= 2;
}

/** Is `line` a separator row (`| --- | :---- |` with optional colons)? */
function isSepRow(line: string): boolean {
  return parseCells(line).every((c) => /^-*:?-+:?\s*$/.test(c) && c.includes("-"));
}

/** Parse `| a | b |` (edge pipes optional) into `["a","b"]`. */
function parseCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
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

/** Style an aligned table row: gray borders, dimmed separator. With markup
 * hidden the separator becomes a rule and edge pipes go, inner ones turn `│`. */
function styleTable(row: string, opts: RenderOptions): string {
  const color = opts.color === true;
  const paint = (sgr: string, s: string) => (color ? `${sgr}${s}${SGR.reset}` : s);
  if (opts.markup !== false) {
    return !color
      ? row
      : isSepRow(row)
        ? paint(SGR.dim, row)
        : row.replace(/\|/g, paint(SGR.gray, "|"));
  }
  if (isSepRow(row)) {
    return paint(SGR.dim, "\u2500".repeat(displayWidth(row)));
  }
  return row.slice(2, -2).replace(/ \| /g, ` ${paint(SGR.dim, "\u2502")} `);
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
  const counts = new Map<number, number>();
  for (const m of opts.markers ?? []) {
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  const cursorOn = vp.cursor >= vp.offset && vp.cursor < vp.offset + vp.height;
  const start = Math.max(0, vp.offset);
  const height = Math.max(0, vp.height);
  const end = Math.min(doc.lines.length, start + height);
  const cols = Math.max(1, vp.width - GUTTER_WIDTH);
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
      const g = gutterFor(i, vp, cursorOn, counts, opts);
      lines.push(g + styleTable(body, opts));
      continue;
    }
    wrapStyled(bodyFor(i, body, doc, opts, cols), cols).forEach((chunk, ri) => {
      lines.push((ri === 0 ? gutterFor(i, vp, cursorOn, counts, opts) : "  ") + chunk);
    });
  }
  return lines;
}

/** Status line: cursor position, comment count, mode. */
export function statusBar(doc: Document, vp: Viewport, opts: RenderOptions = {}): string {
  const count = opts.markers?.length ?? 0;
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
