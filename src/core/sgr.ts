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
} as const;

/** `s` wrapped in `sgr` + reset, or untouched when `on` is false. */
export function paint(on: boolean, sgr: string, s: string): string {
  return on ? `${sgr}${s}${SGR.reset}` : s;
}
