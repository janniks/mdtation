/**
 * Markdown report of a file's comments: what `Comments › Show in editor` opens
 * in `$EDITOR` and what `--list` / `--archived` print. Pure; no I/O.
 */
import { basename } from "node:path";
import { copyFormat, type Comment, type CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";

/** Title, then one `copyFormat` block per comment; `archived` listings add an id line so `--restore` has something to name. */
export function report(
  store: CommentStore,
  doc: Document,
  file: string,
  opts: { readonly archived?: boolean; readonly detail?: boolean } = {},
): string {
  const list = opts.archived ? store.all() : store.live();
  const body = list.map(
    (c) => copyFormat(c, doc, opts.detail) + (opts.archived ? `\n${tag(c)}` : ""),
  );
  return [`# Comments — ${basename(file)}`, ...body].join("\n\n") + "\n";
}

function tag(c: Comment): string {
  return `id ${c.id}${c.archived ? "  archived" : ""}`;
}
