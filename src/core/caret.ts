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

/** Caret for the screen row `row` below `offset`, or null past the end. */
export function place(offset: number, row: number, total: number, rows: Rows): Caret | null {
  let acc = 0;
  for (let l = Math.max(0, offset); l < total; l++) {
    const n = rows(l);
    if (row < acc + n) {
      return { line: l, seg: row - acc };
    }
    acc += n;
  }
  return null;
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

/** Offset that keeps the caret row inside the scrolloff margin; row-accurate `settle`.
 * A block taller than the window pins its top row on-screen (offsets are line-granular). */
export function fit(vp: Viewport, c: Caret, total: number, rows: Rows): number {
  if (total <= 0 || vp.height <= 0) {
    return vp.offset;
  }
  const first = vp.first ?? 0;
  const m = Math.max(0, Math.min(vp.margin ?? 0, Math.floor((vp.height - 1) / 2)));
  const sum = (a: number, b: number) => {
    let n = 0;
    for (let i = a; i < b; i++) n += rows(i);
    return n;
  };
  let offset = Math.min(vp.offset, c.line);
  while (offset > first && sum(offset, c.line) + c.seg < m) offset--;
  const below = Math.min(m, rows(c.line) - 1 - c.seg + sum(c.line + 1, total));
  while (offset < c.line && sum(offset, c.line) + c.seg + 1 + below > vp.height) offset++;
  return offset;
}
