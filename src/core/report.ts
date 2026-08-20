/**
 * Markdown report of a file's comments: what `Comments › Show in editor` opens
 * in `$EDITOR` and what `--list` / `--archived` print. Pure; no I/O.
 */
import { basename } from "node:path";
import { copyFormat, resolveAnchor, type Comment, type CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";

/** Title, then per comment the `copyFormat` block and one provenance line in an HTML comment. */
export function report(
  store: CommentStore,
  doc: Document,
  file: string,
  opts: { readonly archived?: boolean } = {},
): string {
  const list = opts.archived ? store.all() : store.live();
  const body = list.map((c) => `${copyFormat(c, doc)}\n${provenance(c, doc, file)}`);
  return [`# Comments — ${basename(file)}`, ...body].join("\n\n") + "\n";
}

function provenance(c: Comment, doc: Document, file: string): string {
  const loc = resolveAnchor(c.anchor, doc);
  const parts = [
    `id ${c.id}`,
    new Date(c.createdAt).toISOString(),
    `${file}:${loc ? loc.startLine + 1 : "?"}`,
  ];
  if (c.archived) parts.push("archived");
  return `<!-- ${parts.join(" · ")} -->`;
}
