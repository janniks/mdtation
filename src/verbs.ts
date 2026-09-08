/** The CLI verbs as plain functions: each takes the file and its arguments and returns what
 * to print, so `bin.ts` is only argument parsing and the tests need no process. */
import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { copyFormat, type Comment, type CommentStore } from "./core/comment.ts";
import { create } from "./core/comments.ts";
import { parseDocument, type Document } from "./core/document.ts";
import { json, read } from "./core/read.ts";
import { report } from "./core/report.ts";
import {
  append,
  archive,
  clear,
  events,
  home,
  load,
  log,
  path,
  expire,
  restore,
  save,
  type Event,
} from "./core/store.ts";
import { follow } from "./core/watch.ts";
import { load as loadPrefs } from "./core/prefs.ts";
import { DEFAULTS, TTL } from "./core/settings.ts";

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
  "expire",
  "watch",
] as const;
export type Verb = (typeof VERBS)[number];

export interface Args {
  readonly json?: boolean;
  /** watch: exit after this event. */
  readonly until?: string;
  /** expire: archived longer than this (1d, 7d, 30d, 1y); default the retention setting. */
  readonly older?: string;
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
  if (verb === "expire") {
    const key = a.older ?? loadPrefs().values.purge ?? DEFAULTS.purge;
    const ttl = TTL[key];
    if (ttl === undefined) throw new Error(`--older must be one of ${Object.keys(TTL).join(", ")}`);
    return { err: `expired ${await expire(file, ttl)} archived comments (older than ${key})` };
  }
  if (verb === "archive" || verb === "restore") {
    const n = await (verb === "archive" ? archive : restore)(file, rest, who);
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
    append(file, { event: "comment", by: who, id, what: verb === "add" ? "new" : "edit" });
    return { err: `${verb === "add" ? "added" : "edited"} ${id}` };
  }
  if (verb === "list" || verb === "read") {
    const store = await load(file);
    const list = pick(store, a.archived === true, a.since, who);
    if (a.archive) {
      await archive(
        file,
        list.map((c) => c.id),
        who,
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

/** Live (or all) comments, optionally only those after `since`. */
function pick(
  store: CommentStore,
  all: boolean,
  since: string | undefined,
  who: string,
): Comment[] {
  const list = [...(all ? store.all() : store.live())];
  return since ? list.filter((c) => c.createdAt > from(store, since, who)) : list;
}

/** `since` as a time: `last` = my latest mark, else a mark name, else an ISO date. */
function from(store: CommentStore, since: string, who: string): number {
  const at =
    since === "last"
      ? (store.since(who)?.at ?? 0)
      : (store.since(undefined, since)?.at ?? Date.parse(since));
  if (Number.isNaN(at)) {
    throw new Error(`--since ${since} is neither last, a mark name, nor a date`);
  }
  return at;
}

/** Tail the events log and hand `write` each event by someone else: comments as the
 * `list` block (or one json line with an `event` key), `open` and `quit` as one line.
 * Starts from now, or from `since`; stops itself after the `until` event. Returns a stop function. */
export async function watching(
  file: string,
  who: string,
  a: Args,
  write: (s: string) => void,
): Promise<() => void> {
  let at = a.since ? from(await load(file), a.since, who) : Date.now();
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    const fresh = await events(file, at);
    const store = fresh.some((e) => e.event === "comment") ? await load(file) : undefined;
    const doc = store ? parseDocument(await readFile(file, "utf-8").catch(() => "")) : undefined;
    for (const e of fresh) {
      at = e.at;
      if (e.by === who) continue;
      write(line(e, store?.get(e.id ?? ""), doc, a.json === true));
      if (e.event === a.until) {
        stop();
        break;
      }
    }
    busy = false;
  };
  const stop = follow(
    dirname(log(file)),
    (name) => name === basename(log(file)),
    () => void tick(),
  );
  void tick();
  return stop;
}

/** One event as text: a comment block, or `open`/`quit` with who and when. */
function line(
  e: Event,
  c: Comment | undefined,
  doc: Document | undefined,
  asJson: boolean,
): string {
  if (asJson) {
    return JSON.stringify(c ? { event: e.event, what: e.what, at: e.at, ...c } : e) + "\n";
  }
  if (e.event !== "comment") {
    return `${e.event} ${e.by} ${new Date(e.at).toISOString()}\n`;
  }
  if (!c || !doc) {
    return `${e.what} ${e.id} ${e.by}\n`;
  }
  return (e.what === "new" ? "" : `${e.what}\n`) + copyFormat(c, doc) + "\n\n";
}
