/**
 * Parse SGR-escaped text (what `renderer.ts` emits) into plain styled spans.
 * Pure and runtime-agnostic: the TUI maps spans onto OpenTUI `StyledText`,
 * which does not interpret raw escape bytes (they would occupy cells).
 */
export interface Span {
  readonly text: string;
  readonly fg?: string;
  readonly bg?: string;
  readonly bold?: boolean;
  readonly dim?: boolean;
  readonly italic?: boolean;
  readonly strike?: boolean;
  readonly underline?: boolean;
}

type Style = Omit<Span, "text">;

/** 16-color SGR codes -> hex. */
const FG: Record<number, string> = {
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
};

// oxlint-disable-next-line no-control-regex
const SGR_RE = /\u001b\[([0-9;]*)m/g;

/** Background codes with their own tone, rather than a foreground color reused. */
const BG: Record<number, string> = {
  // Comment slab: just off the page, so a thread reads as a block without shouting.
  40: "#303330",
  // Cursor-line slab: a shade under the comment slab, so the two never blur together.
  100: "#252725",
};

function apply(style: Style, codes: string): Style {
  let s: Style = style;
  for (const part of codes === "" ? ["0"] : codes.split(";")) {
    const n = Number(part);
    if (n === 0) {
      s = {};
    } else if (n === 1) {
      s = { ...s, bold: true };
    } else if (n === 2) {
      s = { ...s, dim: true };
    } else if (n === 3) {
      s = { ...s, italic: true };
    } else if (n === 4) {
      s = { ...s, underline: true };
    } else if (n === 9) {
      s = { ...s, strike: true };
    } else if (n === 22) {
      s = { ...s, bold: false, dim: false };
    } else if (n === 23) {
      s = { ...s, italic: false };
    } else if (n === 24) {
      s = { ...s, underline: false };
    } else if (n === 29) {
      s = { ...s, strike: false };
    } else if (n === 39) {
      s = { ...s, fg: undefined };
    } else if (n === 49) {
      s = { ...s, bg: undefined };
    } else if (BG[n]) {
      s = { ...s, bg: BG[n] };
    } else if (FG[n]) {
      s = { ...s, fg: FG[n] };
    } else if (FG[n - 10]) {
      s = { ...s, bg: FG[n - 10] };
    }
  }
  return s;
}

/** Split `text` into styled spans. Empty spans are dropped; unknown codes ignored. */
export function spans(text: string): Span[] {
  const out: Span[] = [];
  let style: Style = {};
  let last = 0;
  for (const m of text.matchAll(SGR_RE)) {
    if (m.index > last) {
      out.push({ ...style, text: text.slice(last, m.index) });
    }
    style = apply(style, m[1] ?? "");
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ ...style, text: text.slice(last) });
  }
  return out;
}

/** `text` with every SGR sequence removed. */
export function strip(text: string): string {
  return text.replace(SGR_RE, "");
}
