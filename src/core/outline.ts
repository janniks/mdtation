/** Outline popup model: one palette row per heading. Pure. */
import type { Command } from "./commands.ts";
import { crumb } from "./crumb.ts";
import type { Document } from "./document.ts";
import { score } from "./fuzzy.ts";

/** A match that needs the parent path ranks under every match in the heading's own text. */
const FAR = 100;

/** Rows for `query`: the whole outline in file order, indented by level, when it is empty;
 * else the fuzzy matches, best first. Ids are `at:<line>`, the hint is the 1-based line. */
export function rows(doc: Document, query = ""): Command[] {
  const min = Math.min(...doc.headings.map((h) => h.level));
  const plain = !query.trim();
  return doc.headings
    .flatMap((h) => {
      const path = crumb(doc, h.startLine);
      const lead = path.length - h.text.length;
      const own = score(query, h.text);
      const hit = own ?? score(query, path);
      if (!hit) return [];
      return {
        rank: hit.score - (own ? 0 : FAR),
        id: `at:${h.startLine}`,
        title: plain ? "  ".repeat(h.level - min) + h.text : h.text,
        category: "Outline",
        keys: [String(h.startLine + 1)],
        marks: own ? hit.at : hit.at.flatMap((i) => (i < lead ? [] : [i - lead])),
      };
    })
    .toSorted((a, b) => b.rank - a.rank)
    .map(({ rank: _, ...c }) => c);
}

/** Index of the heading whose section holds `line`; 0 before the first heading. */
export function near(doc: Document, line: number): number {
  return Math.max(
    0,
    doc.headings.findLastIndex((h) => h.startLine <= line),
  );
}
