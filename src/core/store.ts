/**
 * One json per document under the data dir: `comments/<abs path, "/" -> "-">.json`
 * holding `{ comments, marks }`. The file is the channel between the TUI and the CLI.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CommentStore, type Change } from "./comment.ts";

/** One line of the events log: who did what, when. `id` and `what` only for comment events. */
export interface Event {
  readonly at: number;
  readonly event: "open" | "quit" | "comment";
  readonly by: string;
  readonly id?: string;
  readonly what?: Change["what"];
}

/** Data root: `$MDTATION_HOME`, else `$XDG_DATA_HOME/mdtation` when set, else `~/.mdtation`. */
export function home(): string {
  return root(process.env.XDG_DATA_HOME);
}

/** Config root: like `home()` but honours `$XDG_CONFIG_HOME`. */
export function config(): string {
  return root(process.env.XDG_CONFIG_HOME);
}

function root(xdg: string | undefined): string {
  return process.env.MDTATION_HOME ?? (xdg ? join(xdg, "mdtation") : join(homedir(), ".mdtation"));
}

/** Where `file`'s comments live. */
export function path(file: string): string {
  return join(home(), "comments", `${file.replaceAll("/", "-")}.json`);
}

/** Where `file`'s events log lives: next to its json, append-only, one line per event. */
export function log(file: string): string {
  return path(file).replace(/\.json$/, ".events.jsonl");
}

/** Append one event for `file`. Synchronous and tiny, so it is safe right before an exit. */
export function append(file: string, e: Omit<Event, "at"> & { at?: number }): void {
  mkdirSync(join(home(), "comments"), { recursive: true });
  appendFileSync(log(file), JSON.stringify({ at: Date.now(), ...e }) + "\n");
}

/** Events for `file` after `since` (ms), oldest first; a missing log is no events. */
export async function events(file: string, since = 0): Promise<Event[]> {
  try {
    return (await readFile(log(file), "utf-8"))
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Event)
      .filter((e) => e.at > since);
  } catch {
    return [];
  }
}

/** Comments saved for `file` (absolute path); missing or malformed data yields an empty store. */
export async function load(file: string): Promise<CommentStore> {
  try {
    return CommentStore.fromJSON(JSON.parse(await readFile(path(file), "utf-8")));
  } catch {
    return new CommentStore();
  }
}

let seq = 0;

/** Persist `store` atomically (tmp + rename). Each save gets its own tmp name: two saves in
 * flight at once (a comment right after open, say) must not rename each other's file away. */
export async function save(file: string, store: CommentStore): Promise<void> {
  await mkdir(join(home(), "comments"), { recursive: true });
  const tmp = `${path(file)}.${process.pid}.${seq++}.tmp`;
  await writeFile(tmp, JSON.stringify(store.toJSON(), null, 2), "utf-8");
  await rename(tmp, path(file));
}

/** Forget the comments saved for `file` (marks too); returns how many were removed. */
export async function clear(file: string): Promise<number> {
  const n = (await load(file)).all().length;
  await save(file, new CommentStore());
  return n;
}

/** Archive `ids` for `file` as `by`; returns how many matched. */
export async function archive(file: string, ids: readonly string[], by = ""): Promise<number> {
  return flip(file, ids, by, "archive");
}

/** Restore archived `ids` for `file` as `by`; returns how many matched. */
export async function restore(file: string, ids: readonly string[], by = ""): Promise<number> {
  return flip(file, ids, by, "restore");
}

async function flip(
  file: string,
  ids: readonly string[],
  by: string,
  what: "archive" | "restore",
): Promise<number> {
  const store = await load(file);
  const hit = ids.filter((id) => (what === "archive" ? store.archive(id) : store.restore(id)));
  await save(file, store);
  for (const id of hit) append(file, { event: "comment", by, id, what });
  return hit.length;
}
