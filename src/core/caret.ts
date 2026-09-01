/**
 * Visual-row caret on top of the line viewport. Pure.
 * A caret addresses one rendered row: `line` plus `seg`, the row index inside
 * that line's block (wrap segments first, then inline comment rows).
 * `rows(line)` is the block height (0 when hidden), as `span()` reports it.
 */
import type { Viewport } from "./viewport.ts";

export interface Caret {
  readonly line: number;
  readonly seg: number;
}

export type Rows = (line: number) => number;

/** Move one visual row up or down, skipping hidden lines; clamps at the ends. */
export function step(c: Caret, d: 1 | -1, total: number, rows: Rows): Caret {
  if (d > 0) {
    if (c.seg + 1 < rows(c.line)) {
      return { line: c.line, seg: c.seg + 1 };
    }
    for (let l = c.line + 1; l < total; l++) {
      if (rows(l) > 0) return { line: l, seg: 0 };
    }
    return c;
  }
  if (c.seg > 0) {
    return { line: c.line, seg: c.seg - 1 };
  }
  for (let l = c.line - 1; l >= 0; l--) {
    if (rows(l) > 0) return { line: l, seg: rows(l) - 1 };
  }
  return c;
}

/** Caret for the screen row `row` below the window's top caret `top`, or null past the end. */
export function place(top: Caret, row: number, total: number, rows: Rows): Caret | null {
  // The first line contributes only the rows left after `top.seg` scrolled off.
  let acc = -top.seg;
  for (let l = Math.max(0, top.line); l < total; l++) {
    const n = rows(l);
    if (row < acc + n) {
      return { line: l, seg: row - acc };
    }
    acc += n;
  }
  return null;
}

/** Rendered rows from `a` down to `b`; negative when `b` sits above `a`. */
export function gap(a: Caret, b: Caret, rows: Rows): number {
  if (a.line > b.line) {
    return -gap(b, a, rows);
  }
  let n = b.seg - a.seg;
  for (let l = a.line; l < b.line; l++) n += rows(l);
  return n;
}

/** The document's last rendered row. */
function end(total: number, rows: Rows): Caret {
  return pin({ line: total - 1, seg: Infinity }, total, rows);
}

/** Clamp a stale caret onto a real row of its (or the nearest visible) line. */
export function pin(c: Caret, total: number, rows: Rows): Caret {
  const line = Math.max(0, Math.min(c.line, total - 1));
  const n = rows(line);
  if (n > 0) {
    return { line, seg: Math.max(0, Math.min(c.seg, n - 1)) };
  }
  return step({ line, seg: 0 }, line + 1 < total ? 1 : -1, total, rows);
}

/** The window's top row: the caret keeps `margin` rows on each side, and the
 * window never shows blank rows below the last one while the document can fill it.
 * Row-granular, so scrolling advances one wrapped row at a time and a tall block
 * may start half off the top. */
export function fit(vp: Viewport, c: Caret, total: number, rows: Rows): Caret {
  if (total <= 0 || vp.height <= 0) {
    return { line: vp.offset, seg: vp.skip ?? 0 };
  }
  const m = Math.max(0, Math.min(vp.margin ?? 0, Math.floor((vp.height - 1) / 2)));
  const home = pin({ line: vp.first ?? 0, seg: 0 }, total, rows);
  const tail = end(total, rows);
  let top = pin({ line: vp.offset, seg: vp.skip ?? 0 }, total, rows);
  // The caret may have moved above the window; never start below it.
  if (gap(top, c, rows) < 0) {
    top = c;
  }
  // Margin above, then caret plus margin below, both measured in rendered rows.
  while (gap(home, top, rows) > 0 && gap(top, c, rows) < m) {
    top = step(top, -1, total, rows);
  }
  const below = Math.min(m, gap(c, tail, rows));
  while (gap(top, c, rows) + 1 + below > vp.height) {
    top = step(top, 1, total, rows);
  }
  // Pull back off the end so the last row sits at the bottom edge, not above it.
  while (gap(home, top, rows) > 0 && gap(top, tail, rows) + 1 < vp.height) {
    top = step(top, -1, total, rows);
  }
  return top;
}
