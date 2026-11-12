/** ANSI SGR escapes shared by the renderer and the syntax highlighter. Only emitted when color is on. */
export const SGR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  strike: "\x1b[9m",
  underline: "\x1b[4m",
  black: "\x1b[30m",
  bgYellow: "\x1b[43m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[97m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  silver: "\x1b[37m",
  // `ansi.ts` maps these onto the hex palette: #3a3d3a behind #e8e6df.
  // A dark slab, not a bright one, so the note reads as a block without shouting.
  bgGray: "\x1b[40m",
  // The cursor-line slab: darker than `bgGray`, so a note on that line still reads on top of it.
  bgLine: "\x1b[100m",
  // Slabs under text and notes that just changed on disk; the shell fades them out.
  bgNew: "\x1b[41m",
  bgNote: "\x1b[42m",
} as const;

/** `s` wrapped in `sgr` + reset, or untouched when `on` is false. */
export function paint(on: boolean, sgr: string, s: string): string {
  return on ? `${sgr}${s}${SGR.reset}` : s;
}

// oxlint-disable-next-line no-control-regex -- SGR escapes are the point here
const CODES = /\u001b\[[0-9;]*m/g;

/** `s` with all SGR escapes removed. */
export function strip(s: string): string {
  return s.replace(CODES, "");
}
