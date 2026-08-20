/**
 * Structured edits on the document text. Pure: the shell re-parses after each.
 */

const BOX = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/;

/** Task box on `line`: column of the `[` and whether it is checked, else null. */
export function box(line: string): { at: number; on: boolean } | null {
  const m = BOX.exec(line);
  return m ? { at: m[1]!.length, on: m[2] !== " " } : null;
}

/** Flip the task box on line `line` of `text`; null if that line has none. */
export function toggle(text: string, line: number): string | null {
  const lines = text.split("\n");
  const raw = lines[line];
  const b = raw === undefined ? null : box(raw);
  if (!b) {
    return null;
  }
  lines[line] = raw!.slice(0, b.at + 1) + (b.on ? " " : "x") + raw!.slice(b.at + 2);
  return lines.join("\n");
}
