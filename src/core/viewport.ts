/**
 * Viewport model. Pure: it tracks which slice of the document is visible
 * (`offset`) and which line the cursor rests on (`cursor`). All transitions are
 * pure functions returning a *new* Viewport — nothing here touches the
 * terminal. The OpenTUI shell owns the real width/height and feeds keyboard /
 * mouse input to these transitions.
 *
 * Invariants after every *cursor* transition (moveCursor / pageDown / pageUp /
 * jumpToLine):
 *   - 0 <= cursor <= total - 1          (when total > 0)
 *   - 0 <= offset <= maxOffset          (maxOffset = max(0, total - height + margin))
 *   - offset+margin <= cursor <= offset+height-1-margin  (cursor stays inside the margin)
 *
 * `margin` is vim's scrolloff: rows kept between the cursor and the window edge.
 * Near the end the window may pan past the last line by `margin` rows (blank
 * padding) so the last line can reach the margin too.
 *
 * `scroll` is a pure window pan: it moves `offset` only and leaves the cursor
 * where it is (the cursor may drift off-screen until the next cursor move).
 */

export interface Viewport {
  /** 0-based index into Document.lines of the line the window starts on. */
  readonly offset: number;
  /** Rows of that line's block already scrolled off the top, so the window can start mid-block. */
  readonly skip?: number;
  /** 0-based index into Document.lines of the focused (cursor) row. */
  readonly cursor: number;
  /** Terminal width in columns. */
  readonly width: number;
  /** Number of visible rows. */
  readonly height: number;
  /** Rows kept between the cursor and the window edge (scrolloff). Default 0. */
  readonly margin?: number;
  /** First reachable line; lines before it (e.g. hidden frontmatter) are never shown. Default 0. */
  readonly first?: number;
}

/** Result of a key dispatch: move the viewport, quit, or do nothing. */
export interface KeyAction {
  /** New viewport, or undefined when nothing changed. */
  readonly vp?: Viewport;
  /** Quit the shell. */
  readonly quit?: boolean;
}

export function createViewport(
  offset: number,
  cursor: number,
  width: number,
  height: number,
  margin = 0,
): Viewport {
  return { offset, cursor, width, height, margin };
}

const MAX = 24; // default fallback height for a terminal that reports nothing
export const DEFAULT_WIDTH = 80;
export const DEFAULT_HEIGHT = MAX;

/** Effective scrolloff: never more than half the window. */
function gap(vp: Viewport): number {
  return Math.max(0, Math.min(vp.margin ?? 0, Math.floor((vp.height - 1) / 2)));
}

function clampBounds(vp: Viewport, total: number): Viewport {
  const first = Math.min(vp.first ?? 0, Math.max(0, total - 1));
  if (total <= 0) {
    return { ...vp, offset: 0, cursor: 0, height: 0 };
  }
  const height = Math.min(vp.height, total - first);
  const maxOffset = Math.max(first, total - height + (total - first > height ? gap(vp) : 0));
  return {
    ...vp,
    height,
    offset: Math.max(first, Math.min(vp.offset, maxOffset)),
    cursor: Math.max(first, Math.min(vp.cursor, total - 1)),
  };
}

function withCursorVisible(vp: Viewport, total: number): Viewport {
  const b = clampBounds(vp, total);
  if (total <= 0 || b.height <= 0) {
    return b;
  }
  const first = b.first ?? 0;
  const m = total - first > b.height ? gap(b) : 0;
  let offset = b.offset;
  if (b.cursor < offset + m) {
    offset = b.cursor - m;
  } else if (b.cursor > offset + b.height - 1 - m) {
    offset = b.cursor - b.height + 1 + m;
  }
  return { ...b, offset: Math.max(first, Math.min(offset, total - b.height + m)) };
}

/** Clamp to document bounds. The cursor is *not* forced on-screen. */
export function clampViewport(vp: Viewport, total: number): Viewport {
  return clampBounds(vp, total);
}

/** Move the cursor by `delta` rows and scroll it on-screen. */
export function moveCursor(vp: Viewport, delta: number, total: number): Viewport {
  return withCursorVisible({ ...vp, cursor: vp.cursor + delta }, total);
}

/** Advance the window one page (height-1) and follow with the cursor. */
export function pageDown(vp: Viewport, total: number): Viewport {
  const step = Math.max(1, vp.height - 1);
  return anchor({ ...vp, offset: vp.offset + step, cursor: vp.cursor + step }, total);
}

export function pageUp(vp: Viewport, total: number): Viewport {
  const step = Math.max(1, vp.height - 1);
  return anchor({ ...vp, offset: vp.offset - step, cursor: vp.cursor - step }, total);
}

/** Set the cursor to `line` (clamped) and scroll it on-screen. */
export function jumpToLine(vp: Viewport, line: number, total: number): Viewport {
  return anchor({ ...vp, cursor: line, offset: line }, total);
}

/** Re-anchor the window on a whole line, so any row offset inside the old top line goes away. */
function anchor(vp: Viewport, total: number): Viewport {
  return { ...withCursorVisible(vp, total), skip: 0 };
}
