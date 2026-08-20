/** Copy to the terminal clipboard via OSC-52, with a file fallback for terminals that ignore it. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { home } from "../core/store.ts";

/** Writes `text` to the clipboard (OSC-52) and mirrors it to `<data dir>/last-copy.md`. */
export function copy(text: string): void {
  process.stdout.write(`\x1b]52;c;${Buffer.from(text).toString("base64")}\x07`);
  mkdirSync(home(), { recursive: true });
  writeFileSync(join(home(), "last-copy.md"), text + "\n");
}
