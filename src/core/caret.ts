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
      return { line: l, seg: Math.max(0, row - acc) };
    }
    acc += n;
  }
  return null;
}

/** Rendered rows from `a` down to `b`; negative when `b` sits above `a`.
 * With `cap`, stops counting once the magnitude reaches it (callers only ask "at least N"). */
export function gap(a: Caret, b: Caret, rows: Rows, cap = Infinity): number {
  if (a.line > b.line) {
    return -gap(b, a, rows, cap);
  }
  let n = b.seg - a.seg;
  for (let l = a.line; l < b.line && n < cap; l++) n += rows(l);
  return n;
}

/** Whether `b` sits strictly below `a`. */
function after(a: Caret, b: Caret): boolean {
  return b.line > a.line || (b.line === a.line && b.seg > a.seg);
}

/** The document's last rendered row. */
export function end(total: number, rows: Rows): Caret {
  return pin({ line: total - 1, seg: Infinity }, total, rows);
}

/** Clamp a stale caret onto a real row of its (or the nearest visible) line. */
export function pin(c: Caret, total: number, rows: Rows): Caret {
  const line = Math.max(0, Math.min(c.line, total - 1));
  const n = rows(line);
  if (n > 0) {
    return { line, seg: Math.max(0, Math.min(c.seg, n - 1)) };
  }
  // Nothing visible below (say, trailing lines merged into a flowed paragraph): go up instead.
  const down = step({ line, seg: 0 }, 1, total, rows);
  return rows(down.line) > 0 ? down : step({ line, seg: 0 }, -1, total, rows);
}

/** Top row that puts the first row of `c`'s line on screen row `row`, whatever changed around it.
 * No margin, no fill: a negative `seg` on the first line is blank rows above it. */
export function hold(vp: Viewport, c: Caret, row: number, total: number, rows: Rows): Caret {
  const home = pin({ line: vp.first ?? 0, seg: 0 }, total, rows);
  let top = { line: c.line, seg: -Math.min(row, vp.height - 1 - c.seg) };
  while (top.seg < 0 && after(home, { line: top.line, seg: 0 })) {
    const up = step({ line: top.line, seg: 0 }, -1, total, rows);
    top = { line: up.line, seg: top.seg + up.seg + 1 };
  }
  return after(c, top) ? c : top;
}

/** The window's top row: the caret keeps `margin` rows on each side, and the
 * window never shows blank rows below the last one while the document can fill it.
 * Row-granular, so scrolling advances one wrapped row at a time and a tall block
 * may start half off the top.
 * With `row`, the screen row the caret stood on before a move, the window follows by the
 * smallest shift: the margin asks for no more than the caret had, and blank rows stay. */
export function fit(vp: Viewport, c: Caret, total: number, rows: Rows, row?: number): Caret {
  if (total <= 0 || vp.height <= 0) {
    return { line: vp.offset, seg: vp.skip ?? 0 };
  }
  const m = Math.max(0, Math.min(vp.margin ?? 0, Math.floor((vp.height - 1) / 2)));
  const home = pin({ line: vp.first ?? 0, seg: 0 }, total, rows);
  const tail = end(total, rows);
  const lead = Math.min(0, vp.skip ?? 0);
  let top =
    row !== undefined && lead < 0
      ? { line: home.line, seg: lead }
      : pin({ line: vp.offset, seg: vp.skip ?? 0 }, total, rows);
  // After a move from screen row `row` the margin asks for no more than the caret already had.
  const above = Math.min(m, Math.max(0, row ?? m));
  const under = Math.min(m, Math.max(0, vp.height - 1 - (row ?? 0)));
  // The caret may have moved above the window; never start below it.
  if (after(c, top)) {
    top = c;
  }
  // Margin above, then caret plus margin below, both measured in rendered rows.
  while (after(home, top) && gap(top, c, rows, above) < above) {
    top = step(top, -1, total, rows);
  }
  const below = Math.min(under, gap(c, tail, rows, m));
  while (gap(top, c, rows, vp.height) + 1 + below > vp.height) {
    top = step(top, 1, total, rows);
  }
  // Pull back off the end so the last row sits at the bottom edge, not above it.
  while (row === undefined && after(home, top) && gap(top, tail, rows, vp.height) + 1 < vp.height) {
    top = step(top, -1, total, rows);
  }
  return top;
}
