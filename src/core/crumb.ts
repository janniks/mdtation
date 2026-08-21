/** Heading breadcrumb for a cursor line: innermost heading at or above it, then each ancestor by level.
 * `depth` keeps only the innermost N parts. */
import type { Document } from "./document.ts";

export function crumb(doc: Document, line: number, depth = Infinity): string {
  const parts: string[] = [];
  let level = 7;
  for (let i = doc.headings.length - 1; i >= 0; i--) {
    const h = doc.headings[i]!;
    if (h.startLine > line || h.level >= level) {
      continue;
    }
    parts.unshift(h.text);
    level = h.level;
  }
  return parts.slice(-depth).join(" / ");
}
