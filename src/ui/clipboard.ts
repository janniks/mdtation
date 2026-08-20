/** Copy to the terminal clipboard via OSC-52, with a file fallback for terminals that ignore it. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Writes `text` to the clipboard (OSC-52) and mirrors it to `<dir of file>/.mdtation/last-copy.md`. */
export function copy(file: string, text: string): void {
  process.stdout.write(`\x1b]52;c;${Buffer.from(text).toString("base64")}\x07`);
  const dir = join(dirname(file), ".mdtation");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "last-copy.md"), text + "\n");
}
