/** SGR-escaped text -> OpenTUI StyledText. OpenTUI does not parse escape bytes itself. */
import { bg, bold, dim, fg, italic, strikethrough, StyledText, underline } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { spans, type Span } from "../core/ansi.ts";

/** Plain OpenTUI text chunk. */
export function chunk(text: string): TextChunk {
  return { __isChunk: true, text };
}

function style(s: Span): TextChunk {
  let c = chunk(s.text);
  if (s.fg) c = fg(s.fg)(c);
  if (s.bg) c = bg(s.bg)(c);
  if (s.bold) c = bold(c);
  if (s.dim) c = dim(c);
  if (s.italic) c = italic(c);
  if (s.strike) c = strikethrough(c);
  if (s.underline) c = underline(c);
  return c;
}

export function styled(text: string): StyledText {
  return new StyledText(spans(text).map(style));
}
