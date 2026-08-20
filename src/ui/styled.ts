/** SGR-escaped text -> OpenTUI StyledText. OpenTUI does not parse escape bytes itself. */
import { bold, dim, fg, italic, strikethrough, StyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { spans, type Span } from "../core/ansi.ts";

function chunk(s: Span): TextChunk {
  let c: TextChunk = { __isChunk: true, text: s.text };
  if (s.fg) c = fg(s.fg)(c);
  if (s.bold) c = bold(c);
  if (s.dim) c = dim(c);
  if (s.italic) c = italic(c);
  if (s.strike) c = strikethrough(c);
  return c;
}

export function styled(text: string): StyledText {
  return new StyledText(spans(text).map(chunk));
}
