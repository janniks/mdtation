/**
 * `read`: the markdown verbatim with each comment inlined right under its line as a
 * one-line `<c …>` tag, so an agent gets text and comments in one pass. Pure.
 */
import type { Comment, CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";

/** Comments grouped by resolved line, threads in time order under their parent. */
export function byLine(list: readonly Comment[], store: CommentStore, doc: Document) {
  const map = new Map<number, Comment[]>();
  const sorted = [...list].toSorted((a, b) => a.createdAt - b.createdAt);
  for (const c of sorted) {
    const line = store.resolve(c.anchor, doc)?.startLine;
    if (line === undefined) continue;
    map.set(line, [...(map.get(line) ?? []), c]);
  }
  return map;
}

/** Attribute form of a comment, e.g. `id=x by=you re=y at=2026-…`. */
function attrs(c: Comment, me: string): string {
  const by = c.author ?? me;
  const parts = [`id=${c.id}`, `by=${by}`];
  if (c.re) parts.push(`re=${c.re}`);
  parts.push(`at=${new Date(c.createdAt).toISOString()}`);
  return parts.join(" ");
}

export function read(
  list: readonly Comment[],
  store: CommentStore,
  doc: Document,
  me: string,
): string {
  const map = byLine(list, store, doc);
  const out: string[] = [];
  doc.lines.forEach((line, i) => {
    out.push(line);
    for (const c of map.get(i) ?? []) {
      out.push(`<c ${attrs(c, me)}>${c.text.replaceAll("\n", "\n  ")}</c>`);
    }
  });
  return out.join("\n") + "\n";
}

export function json(
  list: readonly Comment[],
  store: CommentStore,
  doc: Document,
  file: string,
  me: string,
) {
  const comments: object[] = [];
  for (const [line, cs] of byLine(list, store, doc)) {
    for (const c of cs) {
      comments.push({
        line: line + 1,
        id: c.id,
        by: c.author ?? me,
        ...(c.re ? { re: c.re } : {}),
        at: new Date(c.createdAt).toISOString(),
        text: c.text,
      });
    }
  }
  return {
    file,
    lines: doc.lines,
    comments: comments.toSorted((a: any, b: any) => a.line - b.line),
  };
}
