/**
 * One json per document under the data dir: `comments/<abs path, "/" -> "-">.json`
 * holding `{ comments, marks }`. The file is the channel between the TUI and the CLI.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CommentStore } from "./comment.ts";

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

/** Comments saved for `file` (absolute path); missing or malformed data yields an empty store. */
export async function load(file: string): Promise<CommentStore> {
  try {
    return CommentStore.fromJSON(JSON.parse(await readFile(path(file), "utf-8")));
  } catch {
    return new CommentStore();
  }
}

/** Persist `store` atomically (tmp + rename). */
export async function save(file: string, store: CommentStore): Promise<void> {
  await mkdir(join(home(), "comments"), { recursive: true });
  const tmp = `${path(file)}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(store.toJSON(), null, 2), "utf-8");
  await rename(tmp, path(file));
}

/** Forget the comments saved for `file` (marks too); returns how many were removed. */
export async function clear(file: string): Promise<number> {
  const n = (await load(file)).all().length;
  await save(file, new CommentStore());
  return n;
}

/** Archive `ids` for `file`; returns how many matched. */
export async function archive(file: string, ids: readonly string[]): Promise<number> {
  const store = await load(file);
  const n = ids.filter((id) => store.archive(id)).length;
  await save(file, store);
  return n;
}

/** Restore archived `ids` for `file`; returns how many matched. */
export async function restore(file: string, ids: readonly string[]): Promise<number> {
  const store = await load(file);
  const n = ids.filter((id) => store.restore(id)).length;
  await save(file, store);
  return n;
}
