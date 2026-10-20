/**
 * Parse SGR-escaped text (what `renderer.ts` emits) into plain styled spans.
 * Pure and runtime-agnostic: the TUI maps spans onto OpenTUI `StyledText`,
 * which does not interpret raw escape bytes (they would occupy cells).
 */
import { THEME } from "./theme.ts";

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

// oxlint-disable-next-line no-control-regex
const SGR_RE = /\u001b\[([0-9;]*)m/g;

function apply(style: Style, codes: string, palette: typeof THEME): Style {
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
    } else if (palette.bg[n]) {
      s = { ...s, bg: palette.bg[n] };
    } else if (palette.fg[n]) {
      s = { ...s, fg: palette.fg[n] };
    } else if (palette.fg[n - 10]) {
      s = { ...s, bg: palette.fg[n - 10] };
    }
  }
  return s;
}

/** Split `text` into styled spans. Empty spans are dropped; unknown codes ignored. */
export function spans(text: string, palette = THEME): Span[] {
  const out: Span[] = [];
  let style: Style = {};
  let last = 0;
  for (const m of text.matchAll(SGR_RE)) {
    if (m.index > last) {
      out.push({ ...style, text: text.slice(last, m.index) });
    }
    style = apply(style, m[1] ?? "", palette);
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
