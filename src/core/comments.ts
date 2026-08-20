/**
 * Glue between the cursor line and the CommentStore. Pure; `store.ts` owns the I/O.
 */
import type { Anchor, Comment, CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";
import { commentLines } from "./nav.ts";

/** Heading anchor only when `line` IS a heading row; any other line anchors by number. */
export function anchorFor(doc: Document, line: number): Anchor {
  const h = doc.headings.find((x) => x.startLine === line);
  return h ? { kind: "heading", slug: h.path } : { kind: "line", n: line };
}

export function create(doc: Document, line: number, text: string, now = Date.now()): Comment {
  return { id: now.toString(36), anchor: anchorFor(doc, line), text, createdAt: now };
}

/** Lines that should carry a gutter marker. */
export function markers(store: CommentStore, doc: Document): number[] {
  return [...commentLines(store, doc)];
}
