/** Copy to the terminal clipboard via OSC-52, with a file fallback for terminals that ignore it. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { home } from "../core/store.ts";

/** Something that can emit OSC-52 (the OpenTUI renderer owns stdout while the TUI runs). */
export interface Sink {
  copyToClipboardOSC52(text: string): boolean;
}

/** Writes `text` to the clipboard (OSC-52 via `sink`, else raw stdout) and mirrors it to `<data dir>/last-copy.md`. */
export function copy(text: string, sink?: Sink): void {
  if (sink) {
    sink.copyToClipboardOSC52(text);
  } else {
    process.stdout.write(`\x1b]52;c;${Buffer.from(text).toString("base64")}\x07`);
  }
  mkdirSync(home(), { recursive: true });
  writeFileSync(join(home(), "last-copy.md"), text + "\n");
}
