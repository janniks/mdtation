/**
 * GFM table helpers: row parsing, column layout, cell hit-testing and alignment edits.
 * Pure: the renderer aligns runs with `layout`; the shell re-parses after `align`.
 * A table run is a block of consecutive `|`-rows whose 2nd line is a separator row.
 */

import { colWidth, displayWidth } from "./unicode.ts";

export interface Cell {
  readonly row: number;
  readonly col: number;
  /** Line index of the table's separator row. */
  readonly sep: number;
}

const SEP = /^(:?)(-+)(:?)$/;

/** Parse `| a | b |` (edge pipes optional) into `["a","b"]`. */
export function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Does `line` look like a table row: `|`-delimited with at least 2 cells.
 * Edge pipes are optional, so ragged source tables still qualify. */
export function isRow(line: string): boolean {
  return line.includes("|") && cells(line).length >= 2;
}

/** Is `line` a separator row (`| --- | :---- |` with optional colons)? */
export function isSep(line: string): boolean {
  return isRow(line) && cells(line).every((c) => SEP.test(c));
}

/** Align a run of plain table rows into even-width columns. */
export function layout(rows: readonly string[]): string[] {
  const grid = rows.map(cells);
  const ncol = Math.max(...grid.map((c) => c.length));
  const widths: number[] = Array.from({ length: ncol }, () => 0);
  for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      widths[c] = Math.max(widths[c]!, displayWidth(row[c]!));
    }
  }
  return grid.map((row) => {
    const parts: string[] = [];
    for (let c = 0; c < ncol; c++) {
      const text = row[c] ?? "";
      parts.push(text + " ".repeat(Math.max(0, widths[c]! - displayWidth(text))));
    }
    return `| ${parts.join(" | ")} |`;
  });
}

/** `[start, end)` of the table run containing `line`, or null. */
function run(lines: readonly string[], line: number): [number, number] | null {
  if (line < 0 || line >= lines.length || !isRow(lines[line]!)) {
    return null;
  }
  let start = line;
  while (start > 0 && isRow(lines[start - 1]!)) {
    start--;
  }
  let end = line + 1;
  while (end < lines.length && isRow(lines[end]!)) {
    end++;
  }
  return end - start >= 2 && isSep(lines[start + 1]!) ? [start, end] : null;
}

/** Cell under display column `x` of the aligned rendering of `line`, or null outside a table. */
export function cell(lines: readonly string[], line: number, x: number): Cell | null {
  const r = run(lines, line);
  if (!r) {
    return null;
  }
  const laid = layout(lines.slice(r[0], r[1]))[line - r[0]]!;
  let col = -1;
  let at = 0;
  for (const ch of laid) {
    if (at > x) {
      break;
    }
    if (ch === "|") {
      col++;
    }
    at += colWidth(ch);
  }
  return { row: line, col: Math.max(0, Math.min(col, cells(laid).length - 1)), sep: r[0] + 1 };
}

/** Cycle `col`'s alignment on separator line `sep` of `text`; null when not a separator or out of range. */
export function align(text: string, sep: number, col: number): string | null {
  const lines = text.split("\n");
  const raw = lines[sep];
  if (raw === undefined || !isSep(raw)) {
    return null;
  }
  const parts = raw.split("|");
  const i = col + (raw.trim().startsWith("|") ? 1 : 0);
  const m = /^(\s*)(\S+)(\s*)$/.exec(parts[i] ?? "");
  const cur = m ? SEP.exec(m[2]!) : null;
  if (col < 0 || !cur) {
    return null;
  }
  const next = cur[1] && cur[3] ? "---:" : cur[1] ? ":---:" : cur[3] ? "---" : ":---";
  parts[i] = m![1]! + next.replace("---", cur[2]!) + m![3]!;
  lines[sep] = parts.join("|");
  return lines.join("\n");
}
