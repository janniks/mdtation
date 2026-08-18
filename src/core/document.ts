/**
 * The document model. A pure, line-aware parse of a markdown source into its
 * structural anchors (headings with slug paths + line ranges, and fenced code
 * blocks) — the seam the rest of mdtation anchors comments to.
 *
 * marked's token stream carries no line numbers, so we scan the source lines
 * directly and track fence state to avoid mistaking `#` inside a code block for
 * a heading. The Renderer (later) uses marked's tokens for styling; this module
 * is only about *where* things are.
 */

export interface Heading {
  /** ATX heading level, 1-6. */
  readonly level: number;
  /** Raw heading text (without the leading `#`s). */
  readonly text: string;
  /** Single-segment slug of `text`. */
  readonly slug: string;
  /** Slug chain of every ancestor heading plus this one. */
  readonly path: readonly string[];
  /** 0-based source line of the heading row. */
  readonly startLine: number;
}

export interface CodeBlock {
  /** The fence string that opened it: ``` or ~~~ (length >= 3). */
  readonly fence: string;
  /** Language tag after the opening fence, if any. */
  readonly lang: string | null;
  /** 0-based source line of the opening fence. */
  readonly startLine: number;
  /** 0-based source line of the closing fence. */
  readonly endLine: number;
}

export interface Document {
  readonly text: string;
  readonly lines: readonly string[];
  readonly headings: readonly Heading[];
  readonly codeBlocks: readonly CodeBlock[];
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^(`{3,}|~{3,})/;

/** One sentence per line here so a heading slug survives word-wrap edits. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findHeading(doc: Document, path: readonly string[]): Heading | undefined {
  return doc.headings.find((h) => pathsEqual(h.path, path));
}

function pathsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((seg, i) => seg === b[i]);
}

export function parseDocument(text: string): Document {
  const lines = text.split("\n");
  const headings: Heading[] = [];
  const codeBlocks: CodeBlock[] = [];
  const stack: Heading[] = [];

  let fence: { fence: string; start: number; lang: string | null } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (fence) {
      if (line.startsWith(fence.fence)) {
        codeBlocks.push({
          fence: fence.fence,
          lang: fence.lang,
          startLine: fence.start,
          endLine: i,
        });
        fence = null;
      }
      continue;
    }

    const fm = line.match(FENCE_RE);
    if (fm && fm[1]!.length >= 3) {
      fence = {
        fence: fm[1]!,
        start: i,
        lang: line.slice(fm[1]!.length).trim() || null,
      };
      continue;
    }

    const hm = line.match(HEADING_RE);
    if (hm) {
      const level = hm[1]!.length;
      const raw = hm[2]!;
      const slug = slugify(raw);
      while (stack.length > 0 && stack.at(-1)!.level >= level) stack.pop();
      const parent = stack.at(-1);
      const path = parent ? [...parent.path, slug] : [slug];
      const heading: Heading = { level, text: raw, slug, path, startLine: i };
      stack.push(heading);
      headings.push(heading);
    }
  }

  return { text, lines, headings, codeBlocks };
}
