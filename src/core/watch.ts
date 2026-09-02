/** One directory watcher for the TUI and the CLI: `fn` runs once after a quiet 150 ms
 * whenever a name in `dir` passes `hit`. Watching a directory, not a file, survives
 * an editor's write-then-rename save, which replaces the file's inode. */
import { watch } from "node:fs";

export const QUIET = 150;

export function follow(dir: string, hit: (name: string) => boolean, fn: () => void): () => void {
  let wait: ReturnType<typeof setTimeout> | undefined;
  const w = watch(dir, (_e, name) => {
    if (hit(String(name ?? ""))) {
      clearTimeout(wait);
      wait = setTimeout(fn, QUIET);
    }
  });
  return () => {
    clearTimeout(wait);
    w.close();
  };
}
