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

export function create(
  doc: Document,
  line: number,
  text: string,
  now = Date.now(),
  quote?: string,
): Comment {
  const c: Comment = { id: ident(now), anchor: anchorFor(doc, line), text, createdAt: now };
  return quote ? { ...c, quote } : c;
}

/** `time36` plus two random chars, so two `add`s in one millisecond never collide. */
export function ident(now = Date.now()): string {
  return now.toString(36) + Math.random().toString(36).slice(2, 4).padEnd(2, "0");
}

/** One entry per live comment: its resolved line (duplicates = several comments on a line). */
export function markers(store: CommentStore, doc: Document): number[] {
  return store
    .live()
    .map((c) => store.resolve(c.anchor, doc)?.startLine)
    .filter((n): n is number => n !== undefined)
    .toSorted((a, b) => a - b);
}
