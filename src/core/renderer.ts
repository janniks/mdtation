/**
 * Pure renderer. Given a parsed Document and a Viewport it produces the frame:
 * the slice of lines currently visible, each prefixed by a 2-column gutter that
 * marks the cursor line and any commented lines.
 *
 * Output is plain text (no ANSI) so it is deterministic for golden tests and
 * pipable via `mdtation --no-tui`. Color / theming is applied by the OpenTUI
 * shell later, against the same structural output.
 */
import type { Document } from "./document.ts";
import type { Viewport } from "./viewport.ts";

export interface RenderOptions {
  /** 0-based line indices that carry a comment. */
  markers?: readonly number[];
}

/** Width (in columns) of the gutter prepended to every rendered line. */
export const GUTTER_WIDTH = 2;

function gutterFor(
  i: number,
  vp: Viewport,
  cursorOn: boolean,
  markers: ReadonlySet<number>,
): string {
  if (i === vp.cursor && cursorOn) {
    return "> ";
  }
  if (markers.has(i)) {
    return "● ";
  }
  return "  ";
}

export function render(doc: Document, vp: Viewport, opts: RenderOptions = {}): string[] {
  const markers = new Set(opts.markers ?? []);
  const cursorOn = vp.cursor >= vp.offset && vp.cursor < vp.offset + vp.height;
  const start = Math.max(0, vp.offset);
  const height = Math.max(0, vp.height);
  const end = Math.min(doc.lines.length, start + height);
  const lines: string[] = [];
  for (let i = start; i < end; i++) {
    lines.push(gutterFor(i, vp, cursorOn, markers) + (doc.lines[i] ?? ""));
  }
  return lines;
}
