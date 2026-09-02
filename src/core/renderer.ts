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
import { paint, SGR, strip } from "./sgr.ts";
import { highlight } from "./syntax.ts";
import { isRow, isSep, laid, rule } from "./table.ts";
import { colWidth, displayWidth } from "./unicode.ts";

export interface RenderOptions {
  /** 0-based line indices that carry a comment. */
  readonly markers?: readonly number[];
  /** Pre-laid inline comment rows per line (see `inline.rows`); drawn after the line's own rows. */
  readonly inline?: ReadonlyMap<number, readonly string[]>;
  /** Emit ANSI styling (bold / italic / colors). Default false. */
  readonly color?: boolean;
  /** Color bold / italic / links (needs `color`). Default true. */
  readonly emphasis?: boolean;
  /** Render bold/italic/underline/strike as terminal text decoration. Default false. */
  readonly deco?: boolean;
  /** Highlight fenced code (needs `color`). Default true. */
  readonly syntax?: boolean;
  /** Caret row inside the cursor line's block (wrap rows, then inline note rows). Default 0. */
  readonly seg?: number;
  /** Status-bar hint for the comment under the caret (author and snippet). */
  readonly note?: string;
  /** One-column cursor glyph. Default `>`. */
  readonly caret?: string;
  /** Index into `CHECKS`: how task boxes are drawn. Default 0 (`[ ]`/`[x]`). */
  readonly check?: number;
  /** Show heading `#` marks. Default true. */
  readonly hashes?: boolean;
  /** Show inline marks (`**`, `_`, backticks). Default true. */
  readonly marks?: boolean;
  /** Show link urls after the label. Default true. */
  readonly links?: boolean;
  /** Code fence rows: `ticks` as written, `fence` a thin rule, `hide` no row. Default `ticks`. */
  readonly fences?: "ticks" | "fence" | "hide";
  /** Show table pipes and the separator row as written (else bars and a rule). Default true. */
  readonly pipes?: boolean;
  /** Blockquotes: `bar` a dim `│` per level, `>` as written, `hide` indent only. Default `bar`. */
  readonly quote?: "bar" | ">" | "hide";
  /** Flow a paragraph's lines (one sentence per line in source) into one wrapped block. Default false. */
  readonly flow?: boolean;
  /** Indent the first line of each paragraph, book style. Default false. */
  readonly indent?: boolean;
  /** Lay the cursor line's rows on a slab, for readers who lose the caret (needs `color`). */
  readonly highlight?: boolean;
}

/** Width (in columns) of the gutter prepended to every rendered line. */
export const GUTTER_WIDTH = 2;

/** Task-box styles, `[open, done]`, cycled by `View › Next checkbox style`. */
export const CHECKS = [
  ["[ ]", "[x]"],
  ["✗", "✓"],
  ["○", "●"],
  ["☐", "☑"],
] as const;

/** Thin rule drawn for thematic breaks and (in hide-markup mode) fence rows. */

/** Heading level (1-6) -> accent color. */
const HEADING_COLOR: Readonly<Record<number, string>> = {
  1: SGR.white,
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

/** Rule standing in for a fence: as wide as the block's longest line (at least 3, at most `cols`). */
function fenceRule(
  doc: Document,
  block: { startLine: number; endLine: number },
  cols: number,
): string {
  const w = Math.max(3, ...doc.lines.slice(block.startLine + 1, block.endLine).map(displayWidth));
  return "\u2500".repeat(Math.min(cols, w));
}

/** Plain paragraph text: not a heading, code, rule, table row, quote, list, or frontmatter. */
function prose(doc: Document, line: number, opts: RenderOptions): boolean {
  const raw = doc.lines[line];
  if (raw === undefined || !raw.trim()) {
    return false;
  }
  const close = fence(doc.lines);
  return !(
    (close > 0 && line <= close) ||
    headingAt(doc, line) ||
    codeBlockAt(doc, line) ||
    isRule(raw) ||
    isRow(raw) ||
    /^\s*>/.test(raw) ||
    styleList(raw, opts) !== undefined
  );
}

/** Minimal inline markdown: `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, links.
 * Marks are dropped whenever the inner text gets styled or markup is hidden. */
const INLINE =
  /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|~~(.+?)~~|\*([^*]+?)\*|\b_([^_]+?)_\b/g;

function styleInline(text: string, opts: RenderOptions): string {
  const tint = opts.color === true && opts.emphasis !== false;
  const deco = opts.deco === true;
  const on = tint || deco;
  const links = opts.links !== false;
  // With marks shown, the `**`/`_`/backticks stay inside the styled span; off strips them.
  const keep = opts.marks !== false;
  if (!on && keep && links) {
    return text;
  }
  const sgr = (d: string, c: string) => (deco ? d : "") + (tint ? c : "");
  // One pass, so a styled span is never re-matched by a later rule.
  return text.replace(
    INLINE,
    (
      m,
      t: string,
      u: string,
      b1: string,
      b2: string,
      c: string,
      s: string,
      i1: string,
      i2: string,
    ) => {
      if (t !== undefined) {
        if (!on && links) {
          return m;
        }
        const label = paint(on, sgr(SGR.underline, SGR.blue), keep ? `[${t}]` : t);
        if (!links) {
          return label;
        }
        return (keep ? label : label + " ") + paint(tint, SGR.dim, `(${u})`);
      }
      const inner = b1 ?? b2 ?? c ?? s ?? i1 ?? i2;
      const body = keep ? m : inner;
      if (b1 !== undefined || b2 !== undefined) {
        return paint(on, sgr(SGR.bold, SGR.yellow), body);
      }
      if (c !== undefined) {
        return paint(tint, SGR.gray, body);
      }
      if (s !== undefined) {
        return paint(deco, SGR.strike, body);
      }
      return paint(on, sgr(SGR.italic, SGR.magenta), body);
    },
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
function wrapStyled(text: string, width: number, hang = 0): string[] {
  const rows: string[] = [];
  let cur = "";
  let cols = 0;
  let open = "";
  // Last space in `cur`: where a word break can happen (index into cur, cols before it, styles open there).
  let gap = -1;
  let gapCols = 0;
  let gapOpen = "";
  // oxlint-disable-next-line no-control-regex -- SGR escapes are the point here
  for (const tok of text.match(/\u001b\[[0-9;]*m|./gsu) ?? []) {
    if (tok.startsWith("\x1b")) {
      open = tok === SGR.reset ? "" : open + tok;
      cur += tok;
      continue;
    }
    const w = colWidth(tok);
    const limit = rows.length ? width - hang : width;
    if (cols + w > limit && cols > 0) {
      if (gap >= 0) {
        // Break at the last space: the word in progress moves whole to the next row.
        const rest = cur.slice(gap + 1);
        rows.push(cur.slice(0, gap) + (gapOpen ? SGR.reset : ""));
        cur = gapOpen + rest;
        cols -= gapCols + 1;
      } else {
        rows.push(cur + (open ? SGR.reset : ""));
        cur = open;
        cols = 0;
      }
      gap = -1;
    }
    if (tok === " ") {
      gap = cur.length;
      gapCols = cols;
      gapOpen = open;
    }
    cur += tok;
    cols += w;
  }
  if (cur.length > 0 || rows.length === 0) {
    rows.push(cur);
  }
  return rows;
}

/** Caret gutter for a continuation or inline note row. */
function caret(opts: RenderOptions): string {
  const g = opts.caret ?? ">";
  return `${paint(opts.color === true, SGR.green, g)} `;
}

/** Gutter cell: caret on the cursor line, else a comment mark (`▶`, or the count past one).
 * In color the mark is a yellow background instead, kept even under the caret. */
function gutterFor(
  line: number,
  vp: Viewport,
  cursorOn: boolean,
  counts: ReadonlyMap<number, number>,
  opts: RenderOptions,
): string {
  const cursor = line === vp.cursor && cursorOn;
  const n = counts.get(line) ?? 0;
  const color = opts.color === true;
  const g = cursor
    ? (opts.caret ?? ">")
    : n === 0
      ? " "
      : n === 1
        ? color
          ? " "
          : "▶"
        : String(Math.min(n, 9));
  if (!color || (!cursor && n === 0)) {
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
      return paint(color, SGR.dim, opts.fences === "fence" ? fenceRule(doc, block, cols) : raw);
    }
    return color && opts.syntax !== false ? highlight(raw, block.lang ?? null) : raw;
  }
  if (isRule(raw)) {
    return paint(color, SGR.dim, "\u2500".repeat(cols));
  }
  const q = /^(\s*)((?:>\s?)+)(.*)$/.exec(raw);
  if (q && opts.quote !== ">") {
    const depth = q[2]!.split(">").length - 1;
    const lead =
      opts.quote === "hide" ? "  ".repeat(depth) : paint(color, SGR.gray, "│ ".repeat(depth));
    // Inline styles end in a reset, so re-arm gray after each one to keep the whole quote muted.
    const text = styleInline(q[3]!, opts).replaceAll(SGR.reset, SGR.reset + SGR.gray);
    return q[1] + lead + paint(color, SGR.gray, text);
  }
  if (prose(doc, line, opts) && !prose(doc, line - 1, opts)) {
    let text = raw;
    if (opts.flow) {
      const parts = [raw.trim()];
      for (let i = line + 1; prose(doc, i, opts); i++) {
        parts.push(doc.lines[i]!.trim());
      }
      text = parts.join(" ");
    }
    return styleInline(opts.indent ? `  ${text}` : text, opts);
  }
  return styleList(raw, opts) ?? styleInline(raw, opts);
}

/** Style an aligned table row: gray borders, dimmed separator. With markup
 * hidden the separator becomes a rule and edge pipes go, inner ones turn `│`. */
function styleTable(row: string, opts: RenderOptions): string {
  const color = opts.color === true;
  if (opts.pipes !== false) {
    // Plain output keeps the source separator, so piped markdown round-trips; on screen it is a rule.
    if (!color) {
      return row;
    }
    return isSep(row)
      ? paint(color, SGR.gray, rule(row))
      : row.replace(/\|/g, paint(color, SGR.gray, "|"));
  }
  if (isSep(row)) {
    return paint(color, SGR.dim, "\u2500".repeat(displayWidth(row) - 4));
  }
  return row.slice(2, -2).replace(/ \| /g, ` ${paint(color, SGR.dim, "\u2502")} `);
}

export function hidden(doc: Document, line: number, opts: RenderOptions = {}): boolean {
  if (opts.flow && prose(doc, line, opts) && prose(doc, line - 1, opts)) {
    return true;
  }
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

/** Display width of `s` with SGR codes stripped. */
function bare(s: string): number {
  return displayWidth(strip(s));
}

/** Hanging prefix for a wrapped line's continuation rows: quote bars, list indent, prose indent. */
function cont(line: number, raw: string, doc: Document, opts: RenderOptions): string {
  if (headingAt(doc, line) || codeBlockAt(doc, line) || isRule(raw)) {
    return "";
  }
  const q = /^(\s*)((?:>\s?)+)/.exec(raw);
  if (q && opts.quote !== ">") {
    const depth = q[2]!.split(">").length - 1;
    const bars =
      opts.quote === "hide"
        ? "  ".repeat(depth)
        : paint(opts.color === true, SGR.gray, "\u2502 ".repeat(depth));
    return q[1] + bars;
  }
  const m = raw.match(/^( *)([-*+\u2022]|\d+\.)\s+(.*)$/);
  if (m) {
    return " ".repeat(m[1]!.length + m[2]!.length + 1 + (/^\[( |x|X)\] /.test(m[3]!) ? 2 : 0));
  }
  // No prose branch: the book indent belongs to the paragraph's first row only,
  // so its wrapped rows hang flush left.
  return "";
}

/** Display rows for one line: wrapped, with the hanging prefix on continuation rows. */
export function flow(doc: Document, line: number, opts: RenderOptions, cols: number): string[] {
  const raw = doc.lines[line] ?? "";
  const lead = cont(line, raw, doc, opts);
  const rows = wrapStyled(bodyFor(line, raw, doc, opts, cols), cols, bare(lead));
  return rows.map((r, i) => (i ? lead + r : r));
}

export function render(doc: Document, vp: Viewport, opts: RenderOptions = {}): string[] {
  const counts = new Map<number, number>();
  for (const m of opts.markers ?? []) {
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  const cursorOn = vp.cursor >= vp.offset && vp.cursor < vp.offset + vp.height;
  const start = Math.max(0, vp.offset);
  const height = Math.max(0, vp.height);
  // Hidden lines take no row, so look past `height` lines to fill the screen.
  const end = Math.min(doc.lines.length, start + 2 * height);
  const cols = Math.max(1, vp.width - GUTTER_WIDTH);
  const lines: string[] = [];
  // Rows of the first line's block that have already scrolled off the top.
  let skip = Math.max(0, vp.skip ?? 0);
  const push = (row: string): void => {
    if (skip > 0) {
      skip--;
    } else if (lines.length < height) {
      lines.push(row);
    }
  };
  for (let i = start; i < end && lines.length < height; i++) {
    if (hidden(doc, i, opts)) {
      continue;
    }
    // The cursor line's own rows sit on a slab; its inline notes keep theirs.
    const hot = opts.highlight === true && opts.color === true && i === vp.cursor;
    const row = tableRow(doc, i, opts);
    if (row !== null) {
      // Tables never wrap: a too-wide row is cut so its columns stay aligned.
      const g = gutterFor(i, vp, cursorOn, counts, opts);
      push(g + lit(styleTable(cut(row, cols), opts), cols, hot));
      continue;
    }
    const chunks = flow(doc, i, opts, cols);
    const extras = opts.inline?.get(i) ?? [];
    // The caret sits on one row of the cursor line's block; other rows keep the plain gutter.
    const at = i === vp.cursor ? Math.min(opts.seg ?? 0, chunks.length + extras.length - 1) : 0;
    chunks.forEach((chunk, ri) => {
      const g =
        ri === 0
          ? gutterFor(i, vp, cursorOn && at === 0, counts, opts)
          : i === vp.cursor && ri === at
            ? caret(opts)
            : "  ";
      push(g + lit(chunk, cols, hot));
    });
    extras.forEach((extra, k) => {
      push((i === vp.cursor && chunks.length + k === at ? caret(opts) : "  ") + extra);
    });
  }
  return lines;
}

/** `row` on a slab spanning the pane, or untouched when `on` is false.
 * Every reset inside re-opens the slab; the gutter is left out of it so the
 * caret and the gap before the text stay clear of the color. */
function lit(row: string, cols: number, on: boolean): string {
  if (!on) {
    return row;
  }
  const fill = " ".repeat(Math.max(0, cols - bare(row)));
  return SGR.bgLine + row.replaceAll(SGR.reset, SGR.reset + SGR.bgLine) + fill + SGR.reset;
}

/** Aligned table row for `line` (code blocks excluded), else null. */
function tableRow(doc: Document, line: number, opts: RenderOptions): string | null {
  return codeBlockAt(doc, line) ? null : laid(doc.lines, line, opts.pipes !== false);
}

/** Keep the first `cols` display columns of `text`, ending in `…` when something was dropped. */
function cut(text: string, cols: number): string {
  if (displayWidth(text) <= cols) {
    return text;
  }
  let out = "";
  let w = 0;
  for (const ch of text) {
    if (w + colWidth(ch) > cols - 1) {
      break;
    }
    out += ch;
    w += colWidth(ch);
  }
  return out + "\u2026";
}

/** Screen rows `line` takes: 0 when hidden, 1 for table rows, more when it wraps. */
export function span(doc: Document, line: number, vp: Viewport, opts: RenderOptions = {}): number {
  if (hidden(doc, line, opts)) {
    return 0;
  }
  const extra = opts.inline?.get(line)?.length ?? 0;
  if (tableRow(doc, line, opts) !== null) {
    return 1 + extra;
  }
  const cols = Math.max(1, vp.width - GUTTER_WIDTH);
  return flow(doc, line, opts, cols).length + extra;
}

/** Status line: cursor position, comment count, an edit hint when the cursor row has comments, mode. */
export function statusBar(doc: Document, vp: Viewport, opts: RenderOptions = {}): string {
  const count = opts.markers?.length ?? 0;
  const cur = Math.min(vp.cursor + 1, doc.lines.length);
  const plural = count === 1 ? "" : "s";
  const here = opts.markers?.filter((m) => m === vp.cursor).length ?? 0;
  const hint = opts.note ? `  ${opts.note}` : here ? `  ${here} here  (e to edit)` : "";
  if (!opts.color) {
    return `Ln ${cur}/${doc.lines.length}  ${count} comment${plural}${hint}`;
  }
  const num = SGR.green;
  const label = SGR.dim;
  const mode = SGR.gray;
  return `${label}Ln${SGR.reset} ${num}${cur}/${doc.lines.length}${SGR.reset}  ${num}${count}${SGR.reset} comment${plural}${hint && `${mode}${hint}${SGR.reset}`}  ${mode}view${SGR.reset}`;
}
