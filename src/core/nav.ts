/**
 * Navigation: jump between comments. Pure; no terminal I/O.
 * All exports are functions that take typed inputs and return Viewport updates.
 */
import type { Document } from "./document.ts";
import type { Viewport } from "./viewport.ts";
import type { CommentStore } from "./comment.ts";
import { jumpToLine } from "./viewport.ts";

/**
 * Return sorted unique lines where any live comment anchor resolves to within `doc`.
 * Undefined lines are ignored. Duplicate lines (multiple comments on same line)
 * appear only once.
 */
export function commentLines(store: CommentStore, doc: Document): readonly number[] {
  const lines = new Set<number>();

  for (const c of store.live()) {
    const loc = store.resolve(c.anchor, doc);
    if (loc?.startLine !== undefined) {
      lines.add(loc.startLine);
    }
  }

  return Array.from(lines).toSorted((a, b) => a - b);
}

/**
 * Jump to the next comment line from `vp.cursor`. Wrap to first comment if
 * `vp.cursor` is at or past the last comment. If there are no comments,
 * return `vp` unchanged.
 */
export function nextComment(
  vp: Viewport,
  total: number,
  store: CommentStore,
  doc: Document,
): Viewport {
  const lines = commentLines(store, doc);
  if (lines.length === 0) {
    return vp;
  }

  // Find smallest line > vp.cursor
  let target = -1;
  for (const line of lines) {
    if (line > vp.cursor) {
      target = line;
      break;
    }
  }

  // Wrap to first if none found
  if (target === -1) {
    target = lines[0]!;
  }

  return jumpToLine(vp, target, total);
}

/**
 * Jump to the previous comment line from `vp.cursor`. Wrap to last comment if
 * `vp.cursor` is before the first comment. If there are no comments,
 * return `vp` unchanged.
 */
export function prevComment(
  vp: Viewport,
  total: number,
  store: CommentStore,
  doc: Document,
): Viewport {
  const lines = commentLines(store, doc);
  if (lines.length === 0) {
    return vp;
  }

  // Find largest line < vp.cursor
  let target = -1;
  for (const line of lines) {
    if (line < vp.cursor && line > target) {
      target = line;
    }
  }

  // Wrap to last if none found
  if (target === -1) {
    target = lines[lines.length - 1]!;
  }

  return jumpToLine(vp, target, total);
}
