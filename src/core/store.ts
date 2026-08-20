/**
 * One `comments.json` in the user data dir, keyed by absolute file path:
 * `{ [file]: Comment[] }`. Read-modify-write keeps other files' comments intact.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CommentStore, type Comment } from "./comment.ts";

/** `$MDTATION_HOME`, else `$XDG_DATA_HOME/mdtation`, else `~/.local/share/mdtation`. */
export function home(): string {
  return (
    process.env.MDTATION_HOME ??
    join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "mdtation")
  );
}

type Data = Record<string, Comment[]>;

async function read(): Promise<Data> {
  try {
    const data: unknown = JSON.parse(await readFile(join(home(), "comments.json"), "utf-8"));
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Data) : {};
  } catch {
    return {};
  }
}

async function write(data: Data): Promise<void> {
  await mkdir(home(), { recursive: true });
  await writeFile(join(home(), "comments.json"), JSON.stringify(data, null, 2), "utf-8");
}

/** Comments saved for `file` (absolute path); missing or malformed data yields an empty store. */
export async function load(file: string): Promise<CommentStore> {
  const list = (await read())[file];
  return CommentStore.fromJSON(Array.isArray(list) ? list : []);
}

/** Persist `store` under `file`; an empty store drops the key. */
export async function save(file: string, store: CommentStore): Promise<void> {
  const data = await read();
  if (store.all().length) data[file] = [...store.all()];
  else delete data[file];
  await write(data);
}

/** Forget the comments saved for `file`; returns how many were removed. */
export async function clear(file: string): Promise<number> {
  const data = await read();
  const n = data[file]?.length ?? 0;
  delete data[file];
  await write(data);
  return n;
}
