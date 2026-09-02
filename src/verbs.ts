/** The CLI verbs as plain functions: each takes the file and its arguments and returns what
 * to print, so `bin.ts` is only argument parsing and the tests need no process. */
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { CommentStore, changes, copyFormat, type Comment } from "./core/comment.ts";
import { create } from "./core/comments.ts";
import { parseDocument, type Document } from "./core/document.ts";
import { json, read } from "./core/read.ts";
import { report } from "./core/report.ts";
import { archive, clear, home, load, path, restore, save } from "./core/store.ts";
import { follow } from "./core/watch.ts";

export const VERBS = [
  "list",
  "mark",
  "read",
  "print",
  "status",
  "add",
  "edit",
  "archive",
  "restore",
  "clear",
  "watch",
] as const;
export type Verb = (typeof VERBS)[number];

export interface Args {
  readonly json?: boolean;
  readonly since?: string;
  readonly archived?: boolean;
  readonly archive?: boolean;
  readonly line?: string;
  readonly re?: string;
  readonly human?: boolean;
}

/** What a verb prints: `out` to stdout, `err` to stderr (progress notes). */
export interface Result {
  readonly out?: string;
  readonly err?: string;
}

/** The CLI's own author: `$MDTATION_AUTHOR`, else `agent`. */
export const me = (): string => process.env.MDTATION_AUTHOR ?? "agent";
/** Label for comments without an author: the local human. */
export const human = (): string => process.env.USER ?? "you";

/** Run `verb` on `file` as `who`. Throws with a one-line message on misuse. */
export async function run(
  file: string,
  verb: Verb,
  rest: readonly string[],
  a: Args,
  who = me(),
): Promise<Result> {
  if (verb === "status") {
    const store = await load(file);
    return {
      out: [
        `file      ${file}`,
        `comments  ${path(file)}`,
        `live      ${store.live().length}`,
        `archived  ${store.all().length - store.live().length}`,
        `marks     ${store.marks.map((m) => `${new Date(m.at).toISOString()}${m.by ? ` ${m.by}` : ""}${m.name ? ` ${m.name}` : ""}`).join(", ") || "none"}`,
        `last copy ${home()}/last-copy.md`,
      ].join("\n"),
    };
  }
  if (verb === "clear") {
    return { err: `cleared ${await clear(file)} comments for ${basename(file)}` };
  }
  if (verb === "archive" || verb === "restore") {
    const n = await (verb === "archive" ? archive : restore)(file, rest);
    return { err: `${verb}d ${n} comments` };
  }
  if (verb === "mark") {
    const store = await load(file);
    store.mark(Date.now(), who, rest[0]);
    await save(file, store);
    return { err: `marked${rest[0] ? ` ${rest[0]}` : ""} for ${who}` };
  }
  const doc = parseDocument(await text(file));
  if (verb === "add" || verb === "edit") {
    const store = await load(file);
    const id = verb === "add" ? add(store, doc, rest, a, who) : edit(store, rest);
    await save(file, store);
    return { err: `${verb === "add" ? "added" : "edited"} ${id}` };
  }
  if (verb === "list" || verb === "read") {
    const store = await load(file);
    const list = pick(store, a.archived === true, a.since, who);
    if (a.archive) {
      await archive(
        file,
        list.map((c) => c.id),
      );
    }
    if (verb === "read") {
      return {
        out: a.json
          ? JSON.stringify(json(list, store, doc, file, human())) + "\n"
          : read(list, store, doc, human()),
      };
    }
    return {
      out: a.json
        ? list.map((c) => JSON.stringify(c)).join("\n") + (list.length ? "\n" : "")
        : report(list, doc, file, { archived: a.archived }),
    };
  }
  throw new Error(`${verb} is not a verb run() handles`);
}

async function text(file: string): Promise<string> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    throw new Error(`cannot read ${file}`);
  }
}

/** `add "text" --line N | --re <id>`: a new comment by `who`; replies copy the parent's anchor. */
function add(store: CommentStore, doc: Document, rest: readonly string[], a: Args, who: string) {
  const body = rest[0];
  const parent = a.re ? store.get(a.re) : undefined;
  if (!body || (!a.line && !parent)) {
    throw new Error(
      a.re && !parent ? `no comment ${a.re}` : 'add needs "text" and --line N or --re <id>',
    );
  }
  const line = parent ? (store.resolve(parent.anchor, doc)?.startLine ?? 0) : Number(a.line) - 1;
  if (!parent && !(line >= 0 && line < doc.lines.length)) {
    throw new Error(`--line ${a.line} is outside 1..${doc.lines.length}`);
  }
  const c: Comment = {
    ...create(doc, line, body),
    author: who,
    ...(a.human ? {} : { agent: true as const }),
    ...(parent ? { re: parent.id } : {}),
  };
  store.add(c);
  return c.id;
}

/** `edit <id> "text"`. */
function edit(store: CommentStore, rest: readonly string[]): string {
  const c = rest[0] ? store.get(rest[0]) : undefined;
  if (!c || !rest[1]) {
    throw new Error(c ? 'edit needs the new "text"' : `no comment ${rest[0]}`);
  }
  store.add({ ...c, text: rest[1] });
  return c.id;
}

/** Live (or all) comments, optionally only those after `since`: `last` = my latest mark, a mark name, or an ISO time. */
function pick(
  store: CommentStore,
  all: boolean,
  since: string | undefined,
  who: string,
): Comment[] {
  const list = [...(all ? store.all() : store.live())];
  if (!since) {
    return list;
  }
  const at =
    since === "last"
      ? (store.since(who)?.at ?? 0)
      : (store.since(undefined, since)?.at ?? Date.parse(since));
  if (Number.isNaN(at)) {
    throw new Error(`--since ${since} is neither last, a mark name, nor a date`);
  }
  return list.filter((c) => c.createdAt > at);
}

/** Block and hand `write` every new live comment by someone else as it lands
 * (markdown block or JSON line). Returns a stop function. */
export function watching(
  file: string,
  who: string,
  asJson: boolean,
  write: (s: string) => void,
): () => void {
  const dir = join(home(), "comments");
  mkdirSync(dir, { recursive: true });
  const mine = basename(path(file));
  let last = new CommentStore();
  const tick = async (first = false) => {
    const store = await load(file);
    // The document is re-read each tick, so `Line N` and the quote follow a rewrite.
    const doc = parseDocument(await readFile(file, "utf-8").catch(() => ""));
    const fresh = changes(last, store).filter(
      (x) => x.what === "new" && (x.c.author ?? "") !== who,
    );
    last = store;
    if (first) {
      return;
    }
    for (const { c } of fresh) {
      write(asJson ? JSON.stringify(c) + "\n" : copyFormat(c, doc) + "\n\n");
    }
  };
  void tick(true);
  return follow(
    dir,
    (name) => name.startsWith(mine),
    () => void tick(),
  );
}
