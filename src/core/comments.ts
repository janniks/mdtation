/**
 * Glue between the cursor line and the CommentStore. Pure; `store.ts` owns the I/O.
 */
import type { Anchor, Comment, CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";

/** Heading anchor only when `line` IS a heading row; any other line anchors by number. */
export function anchorFor(doc: Document, line: number): Anchor {
  const h = doc.headings.find((x) => x.startLine === line);
  return h ? { kind: "heading", slug: h.path } : { kind: "line", n: line };
}

export function create(doc: Document, line: number, text: string, now = Date.now()): Comment {
  return { id: now.toString(36), anchor: anchorFor(doc, line), text, createdAt: now };
}

/** One entry per live comment: its resolved line (duplicates = several comments on a line). */
export function markers(store: CommentStore, doc: Document): number[] {
  return store
    .live()
    .map((c) => store.resolve(c.anchor, doc)?.startLine)
    .filter((n): n is number => n !== undefined)
    .toSorted((a, b) => a - b);
}
