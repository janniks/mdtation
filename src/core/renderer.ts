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
import { paint, SGR } from "./sgr.ts";
import { highlight } from "./syntax.ts";
import { isRow, isSep, layout } from "./table.ts";
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
  /** One-column glyph for a row with one comment. Default `✦`. */
  readonly mark?: string;
  /** Index into `CHECKS`: how task boxes are drawn. Default 0 (`[ ]`/`[x]`). */
  readonly check?: number;
  /** Show heading `#` marks. Default true. */
  readonly hashes?: boolean;
  /** Show inline marks (`**`, `_`, backticks, link urls). Default true. */
  readonly marks?: boolean;
  /** Code fence rows: `ticks` as written, `fence` a thin rule, `hide` no row. Default `ticks`. */
  readonly fences?: "ticks" | "fence" | "hide";
  /** Show table pipes and the separator row as written (else bars and a rule). Default true. */
  readonly pipes?: boolean;
}

/** Width (in columns) of the gutter prepended to every rendered line. */
export const GUTTER_WIDTH = 2;

/** Task-box styles, `[open, done]`, cycled by `View › Next checkbox style`. */
export const CHECKS = [
  ["[ ]", "[x]"],
  ["☐", "☑"],
  ["○", "●"],
  ["◯", "◉"],
  ["✗", "✓"],
] as const;

/** Thin rule drawn for thematic breaks and (in hide-markup mode) fence rows. */
const RULE = "\u2500".repeat(20);

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
  const markup = opts.marks !== false;
  if (!emphasis && markup) {
    return text;
  }
  // Links first: later rules emit `\x1b[` escapes that would match the link's `[`.
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t: string, u: string) => {
      const label = paint(emphasis, SGR.underline + SGR.blue, t);
      return markup ? `${label} ${paint(emphasis, SGR.dim, `(${u})`)}` : label;
    })
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a: string, b: string) =>
      paint(emphasis, SGR.bold + SGR.yellow, a ?? b),
    )
    .replace(/`([^`]+)`/g, (_, p: string) => paint(emphasis, SGR.gray, p))
    .replace(/~~(.+?)~~/g, (_, p: string) => paint(emphasis, SGR.strike, p))
    .replace(/\*([^*]+?)\*|\b_([^_]+?)_\b/g, (_, a: string, b: string) =>
      paint(emphasis, SGR.italic + SGR.magenta, a ?? b),
    );
}

/** Color the bullet/number of a markdown list item; `undefined` for non-list lines. */
function styleList(raw: string, opts: RenderOptions): string | undefined {
  const m = raw.match(/^( *)([-*+\u2022]|\d+\.)\s+(.*)$/);
  if (!m) {
    return undefined;
  }
  const color = opts.color === true;
  const mark = paint(color, SGR.cyan, `${m[1]}${m[2]}`);
  const task = m[3]!.match(/^\[( |x|X)\] (.*)$/);
  if (!task) {
    return `${mark} ${styleInline(m[3]!, opts)}`;
  }
  const done = task[1] !== " ";
  const glyph = CHECKS[opts.check ?? 0]![done ? 1 : 0];
  const box = paint(color, done ? SGR.green : SGR.dim, glyph);
  return `${mark} ${box} ${styleInline(task[2]!, opts)}`;
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

/** Gutter cell: caret on the cursor line, else the mark for one comment or the count.
 * A commented row keeps its background even under the caret. */
function gutterFor(
  line: number,
  vp: Viewport,
  cursorOn: boolean,
  counts: ReadonlyMap<number, number>,
  opts: RenderOptions,
): string {
  const cursor = line === vp.cursor && cursorOn;
  const n = counts.get(line) ?? 0;
  const g = cursor
    ? (opts.caret ?? ">")
    : n === 0
      ? " "
      : n === 1
        ? (opts.mark ?? "✦")
        : String(Math.min(n, 9));
  if (opts.color !== true || (!cursor && n === 0)) {
    return `${g} `;
  }
  return `${paint(true, n > 0 ? SGR.bgYellow + SGR.black : SGR.green, g)} `;
}

function bodyFor(
  line: number,
  raw: string,
  doc: Document,
  opts: RenderOptions,
  cols: number,
): string {
  const color = opts.color === true;
  // Frontmatter: the closing fence is a full-width rule (the opener gets no row, see `hidden`).
  if (line === fence(doc.lines)) {
    return paint(color, SGR.dim, "\u2500".repeat(cols));
  }
  const heading = headingAt(doc, line);
  if (heading) {
    const text = opts.hashes !== false ? raw : raw.replace(/^#+\s*/, "");
    return paint(color, SGR.bold + (HEADING_COLOR[heading.level] ?? SGR.gray), text);
  }
  const block = codeBlockAt(doc, line);
  if (block) {
    if (line === block.startLine || line === block.endLine) {
      return paint(color, SGR.dim, opts.fences === "fence" ? RULE : raw);
    }
    return color && opts.syntax !== false ? highlight(raw, block.lang ?? null) : raw;
  }
  if (isRule(raw)) {
    return paint(color, SGR.dim, RULE);
  }
  return styleList(raw, opts) ?? styleInline(raw, opts);
}

/** Style an aligned table row: gray borders, dimmed separator. With markup
 * hidden the separator becomes a rule and edge pipes go, inner ones turn `│`. */
function styleTable(row: string, opts: RenderOptions): string {
  const color = opts.color === true;
  if (opts.pipes !== false) {
    return !color
      ? row
      : isSep(row)
        ? paint(color, SGR.dim, row)
        : row.replace(/\|/g, paint(color, SGR.gray, "|"));
  }
  if (isSep(row)) {
    return paint(color, SGR.dim, "\u2500".repeat(displayWidth(row) - 4));
  }
  return row.slice(2, -2).replace(/ \| /g, ` ${paint(color, SGR.dim, "\u2502")} `);
}

/** Detect runs of table rows (whose 2nd line is a separator) and align them.
 * Lines inside fenced code blocks are never treated as tables. Mutates `rows`
 * in place and records which rows are tables in `flags`. */
function markTables(rows: string[], flags: boolean[], start: number, doc: Document): void {
  const n = rows.length;
  let i = 0;
  while (i < n) {
    const sl = start + i;
    if (codeBlockAt(doc, sl) || !isRow(rows[i]!)) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && !codeBlockAt(doc, start + j) && isRow(rows[j]!)) {
      j++;
    }
    const laid = layout(rows.slice(i, j));
    if (laid.length >= 2 && isSep(laid[1]!)) {
      for (let k = 0; k < laid.length; k++) {
        rows[i + k] = laid[k]!;
        flags[i + k] = true;
      }
    }
    i = j;
  }
}

/** Lines that get no row: the frontmatter opener and the blank run right after its closer. */
export function hidden(doc: Document, line: number, opts: RenderOptions = {}): boolean {
  if (opts.fences === "hide") {
    const block = codeBlockAt(doc, line);
    if (block && (line === block.startLine || line === block.endLine)) {
      return true;
    }
  }
  const close = fence(doc.lines);
  if (close <= 0) {
    return false;
  }
  if (line === 0) {
    return true;
  }
  for (let i = close + 1; i <= line; i++) {
    if (doc.lines[i]!.trim() !== "") {
      return false;
    }
  }
  return line > close;
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
    if (hidden(doc, i, opts)) {
      continue;
    }
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
