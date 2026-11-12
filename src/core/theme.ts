/** Real terminal colors. MDTATION_THEME overrides mdtation.json. */
import { loadConfig } from "./config.ts";
const dark = {
  page: "#1b1d1b",
  bar: "#242624",
  panel: "#1f211f",
  input: "#2a2d2a",
  active: "#34402f",
  border: "#5c615c",
  text: "#e8e6df",
  hint: "#b3b7b1",
  muted: "#8a8f8a",
  badge: "#6f9e68",
  warn: "#e9d28a",
  accent: "#9ec5e8",
  fg: {
    // Pastel on near-black, same family as the website's terminal frames.
    30: "#3a3d3a",
    31: "#e8a3a3",
    32: "#99d892",
    33: "#e9d28a",
    34: "#9ec5e8",
    35: "#d4a8e0",
    36: "#9fdcd4",
    37: "#e8e6df",
    90: "#8a8f8a",
    91: "#f0b8b8",
    92: "#b6e6ad",
    93: "#f2e0a6",
    94: "#b7d6f2",
    95: "#e2c2ea",
    96: "#bdeae3",
    97: "#ffffff",
  } as Record<number, string>,
  bg: {
    // Comment slab: just off the page, so a thread reads as a block without shouting.
    40: "#303330",
    // Cursor-line slab: a shade under the comment slab, so the two never blur together.
    100: "#252725",
    // Fresh text and fresh notes: a soft green that fades back to the page and the comment slab.
    41: "#27332a",
    42: "#3b4a38",
  } as Record<number, string>,
};

const light: typeof dark = {
  page: "#f7f7f2",
  bar: "#e9ece5",
  panel: "#f1f3ed",
  input: "#e5e9e0",
  active: "#d6e3cf",
  border: "#818a7d",
  text: "#293127",
  hint: "#586451",
  muted: "#66705f",
  badge: "#547b48",
  warn: "#806215",
  accent: "#35658c",
  fg: {
    30: "#293127",
    31: "#a13c3c",
    32: "#356b2e",
    33: "#806215",
    34: "#35658c",
    35: "#7e438b",
    36: "#28736a",
    37: "#293127",
    90: "#66705f",
    91: "#a13c3c",
    92: "#356b2e",
    93: "#806215",
    94: "#35658c",
    95: "#7e438b",
    96: "#28736a",
    97: "#182216",
  },
  bg: { 40: "#e5ebdf", 41: "#e3efd9", 42: "#cfe2c3", 43: "#e9d28a", 100: "#edf0e8" },
};

/** The hex color `t` of the way from `a` to `b` (0 = `a`, 1 = `b`). */
export function mix(a: string, b: string, t: number): string {
  const at = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(at(a, i) + (at(b, i) - at(a, i)) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Unknown values keep the existing dark default. */
export function theme(mode?: string): typeof dark {
  return mode === "light" ? light : dark;
}

export const THEME = theme(process.env.MDTATION_THEME ?? loadConfig(process.cwd()).theme);
