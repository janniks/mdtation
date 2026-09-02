/**
 * Headless TUI runs for tests: `bun src/bin.ts <file>` under `script` with a fixed size,
 * fed keystrokes on a schedule. Linux `script` only; callers skip elsewhere.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A keystroke burst: wait `after` ms, then write `keys`. */
export type Key = readonly [after: number, keys: string];

/** True when `script -qec` and bun are available (util-linux, so Linux). */
export const usable = process.platform === "linux" && spawnSync("bun", ["--version"]).status === 0;

/** Run the TUI on `file` with `keys`, isolated under a fresh `MDTATION_HOME`; returns the raw output and that home. */
export function tui(
  file: string,
  keys: readonly Key[],
  rows = 24,
  cols = 80,
): { raw: string; home: string } {
  const home = mkdtempSync(join(tmpdir(), "mdt-pty-"));
  const feed = keys.map(([after, k]) => `sleep ${after / 1000}; printf '${k}'`).join("; ");
  const r = spawnSync(
    "sh",
    [
      "-c",
      `{ ${feed}; sleep 0.8; } | script -qec "stty rows ${rows} cols ${cols}; bun src/bin.ts ${file}" /dev/null`,
    ],
    {
      env: {
        ...process.env,
        MDTATION_HOME: home,
        XDG_CONFIG_HOME: join(home, "cfg"),
        TERM: "xterm-256color",
      },
      encoding: "utf-8",
      timeout: 30_000,
    },
  );
  return { raw: r.stdout ?? "", home };
}
