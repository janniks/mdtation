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
 *   - 0 <= offset <= maxOffset          (maxOffset = max(0, total - height))
 *   - offset <= cursor <= offset+height-1  (cursor stays on-screen)
 *
 * `scroll` is a pure window pan: it moves `offset` only and leaves the cursor
 * where it is (the cursor may drift off-screen until the next cursor move).
 */

export interface Viewport {
  /** 0-based index into Document.lines of the first visible row. */
  readonly offset: number;
  /** 0-based index into Document.lines of the focused (cursor) row. */
  readonly cursor: number;
  /** Terminal width in columns. */
  readonly width: number;
  /** Number of visible rows. */
  readonly height: number;
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
): Viewport {
  return { offset, cursor, width, height };
}

const MAX = 24; // default fallback height for a terminal that reports nothing
export const DEFAULT_WIDTH = 80;
export const DEFAULT_HEIGHT = MAX;

function clampBounds(vp: Viewport, total: number): Viewport {
  if (total <= 0) {
    return { offset: 0, cursor: 0, width: vp.width, height: 0 };
  }
  const height = Math.min(vp.height, total);
  const maxOffset = total - height;
  return {
    width: vp.width,
    height,
    offset: Math.max(0, Math.min(vp.offset, maxOffset)),
    cursor: Math.max(0, Math.min(vp.cursor, total - 1)),
  };
}

function withCursorVisible(vp: Viewport, total: number): Viewport {
  const b = clampBounds(vp, total);
  if (total <= 0 || b.height <= 0) {
    return b;
  }
  const maxOffset = total - b.height;
  let offset = b.offset;
  if (b.cursor < offset) {
    offset = b.cursor;
  } else if (b.cursor > offset + b.height - 1) {
    offset = Math.min(b.cursor - b.height + 1, maxOffset);
  }
  return { offset, cursor: b.cursor, width: b.width, height: b.height };
}

/** Clamp to document bounds. The cursor is *not* forced on-screen. */
export function clampViewport(vp: Viewport, total: number): Viewport {
  return clampBounds(vp, total);
}

/** Pan the window by `delta` rows; cursor stays put. */
export function scroll(vp: Viewport, delta: number, total: number): Viewport {
  return clampBounds({ ...vp, offset: vp.offset + delta }, total);
}

/** Pan the window by `delta` rows (wheel); the cursor is dragged along so it stays visible. */
export function pan(vp: Viewport, delta: number, total: number): Viewport {
  const b = scroll(vp, delta, total);
  const last = Math.min(b.offset + b.height - 1, total - 1);
  return { ...b, cursor: Math.max(b.offset, Math.min(b.cursor, last)) };
}

/** Move the cursor by `delta` rows and scroll it on-screen. */
export function moveCursor(vp: Viewport, delta: number, total: number): Viewport {
  return withCursorVisible({ ...vp, cursor: vp.cursor + delta }, total);
}

/** Advance the window one page (height-1) and follow with the cursor. */
export function pageDown(vp: Viewport, total: number): Viewport {
  const step = Math.max(1, vp.height - 1);
  return withCursorVisible({ ...vp, offset: vp.offset + step, cursor: vp.cursor + step }, total);
}

export function pageUp(vp: Viewport, total: number): Viewport {
  const step = Math.max(1, vp.height - 1);
  return withCursorVisible({ ...vp, offset: vp.offset - step, cursor: vp.cursor - step }, total);
}

/** Set the cursor to `line` (clamped) and scroll it on-screen. */
export function jumpToLine(vp: Viewport, line: number, total: number): Viewport {
  return withCursorVisible({ ...vp, cursor: line, offset: line }, total);
}

/** 0-based row of the cursor within the window, or -1 if it's off-screen. */
export function cursorRow(vp: Viewport): number {
  const row = vp.cursor - vp.offset;
  return row >= 0 && row < vp.height ? row : -1;
}
