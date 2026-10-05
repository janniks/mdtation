/** Display-width helpers for the renderer.

Wrapping breaks only on code-point boundaries (never inside a surrogate pair),
so the renderer never emits a lone surrogate that crashes UTF-8 output under
Bun/OpenTUI — the original "broken render on emoji" bug.
*/

/** BMP column ranges that render double-width in a monospace terminal. */
const WIDE_RANGES: readonly [number, number][] = [
  [0x2329, 0x232a],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa840, 0xa87f],
  [0xa960, 0xa97f],
  [0xaa00, 0xaa5f],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
];

function isWide(cp: number): boolean {
  return WIDE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

/** Columns a single code point occupies: 0 for ZWJ / combining / VS;
 * 2 for wide (CJK, emoji surrogate pairs); 1 otherwise. */
export function colWidth(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  // Nothing below the combining marks is wide or zero-width; this is nearly every character.
  if (cp < 0x300) {
    return 1;
  }
  if (cp === 0x200d) {
    return 0; // zero-width joiner
  }
  if (cp >= 0x300 && cp <= 0x36f) {
    return 0; // combining diacritical marks
  }
  if (cp >= 0xfe00 && cp <= 0xfe0f) {
    return 0; // variation selectors
  }
  if (ch.length > 1 || isWide(cp)) {
    return 2; // surrogate pair (emoji) or CJK-wide
  }
  return 1;
}

/** Hard-wrap `text` into rows no wider than `width` columns, breaking only on
 * code-point boundaries (so surrogate pairs are never split). Widths <= 0
 * return the text whole. */
export function wrapLine(text: string, width: number): string[] {
  if (width <= 0) {
    return [text];
  }
  const rows: string[] = [];
  let cur = "";
  let cols = 0;
  for (const ch of text) {
    const w = colWidth(ch);
    if (cols + w > width && cols > 0) {
      rows.push(cur);
      cur = "";
      cols = 0;
    }
    cur += ch;
    cols += w;
  }
  if (cur.length > 0 || rows.length === 0) {
    rows.push(cur);
  }
  return rows;
}

/** Total display columns a string occupies (sum of per-code-point widths). */
export function displayWidth(s: string): number {
  let n = 0;
  for (const ch of s) {
    n += colWidth(ch);
  }
  return n;
}

/** `s` right-padded with spaces to `w` display columns; wider strings are left alone. */
export function pad(s: string, w: number): string {
  return s + " ".repeat(Math.max(0, w - displayWidth(s)));
}

/** Word-wrap `text` into rows no wider than `width` columns; explicit newlines
 * start a new row, and a word wider than the row is chopped so nothing overflows. */
export function wrapWords(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    // Columns in `cur`, kept as it grows so a long row is not measured again per word.
    let cols = 0;
    for (let word of para.split(" ")) {
      let w = displayWidth(word);
      // A word wider than the row is chopped by display columns, so it can never overflow the block.
      if (width > 0 && w > width) {
        if (cur) out.push(cur);
        cur = "";
        cols = 0;
        const bits = wrapLine(word, width);
        out.push(...bits.slice(0, -1));
        word = bits[bits.length - 1] ?? "";
        w = displayWidth(word);
      }
      if (cur && cols + 1 + w > width) {
        out.push(cur);
        cur = word;
        cols = w;
      } else {
        cols = cur ? cols + 1 + w : w;
        cur = cur ? `${cur} ${word}` : word;
      }
    }
    out.push(cur);
  }
  return out;
}
