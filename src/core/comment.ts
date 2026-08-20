/**
 * Comments & anchors. Pure: no terminal or I/O here (the OpenTUI modal that
 * creates comments is Phase 4's UI slice). These seams are the engine the spec
 * calls out for golden testing:
 *   - CommentStore.add / remove / byAnchor / resolve
 *   - resolve(anchor, doc) -> line range (heading path re-anchors by slug;
 *     line anchors map 1:1)
 *   - Export.copyFormat(comment, doc) -> the agent-consumable markdown block
 */
import { findHeading } from "./document.ts";
import type { Document } from "./document.ts";

export type Anchor =
  | { readonly kind: "heading"; readonly slug: readonly string[] }
  | { readonly kind: "line"; readonly n: number };

export interface Location {
  /** 0-based first line covered by the anchor. */
  readonly startLine: number;
  /** 0-based last line covered by the anchor. */
  readonly endLine: number;
}

export interface Comment {
  readonly id: string;
  readonly anchor: Anchor;
  readonly text: string;
  readonly createdAt: number;
}

export class CommentStore {
  private readonly comments = new Map<string, Comment>();

  add(c: Comment): void {
    this.comments.set(c.id, c);
  }
  remove(id: string): boolean {
    return this.comments.delete(id);
  }
  get(id: string): Comment | undefined {
    return this.comments.get(id);
  }
  all(): readonly Comment[] {
    return [...this.comments.values()];
  }
  byAnchor(anchor: Anchor): readonly Comment[] {
    return [...this.comments.values()].filter((c) => sameAnchor(c.anchor, anchor));
  }
  resolve(anchor: Anchor, doc: Document): Location | null {
    return resolveAnchor(anchor, doc);
  }
  toJSON(): readonly Comment[] {
    return this.all();
  }
  static fromJSON(data: readonly Comment[]): CommentStore {
    const store = new CommentStore();
    for (const c of data) store.add(c);
    return store;
  }
}

/** Resolve an anchor against a Document. Heading paths re-anchor by slug, so a
 * comment survives the heading moving; line anchors map 1:1. */
export function resolveAnchor(anchor: Anchor, doc: Document): Location | null {
  if (anchor.kind === "heading") {
    const h = findHeading(doc, anchor.slug);
    if (!h) {
      return null;
    }
    return { startLine: h.startLine, endLine: h.startLine };
  }
  if (anchor.n < 0 || anchor.n >= doc.lines.length) {
    return null;
  }
  return { startLine: anchor.n, endLine: anchor.n };
}

/** Human label for a heading anchor, e.g. "## Architecture / The model". */
function headingLabel(slug: readonly string[], doc: Document): string | null {
  const parts: string[] = [];
  for (let i = 1; i <= slug.length; i++) {
    const h = findHeading(doc, slug.slice(0, i));
    if (!h) {
      return null;
    }
    parts.push(h.text);
  }
  const leaf = findHeading(doc, slug);
  if (!leaf) {
    return null;
  }
  return `${hashes(leaf.level)} ${parts.join(" / ")}`;
}

function hashes(level: number): string {
  return "#".repeat(level);
}

function sameAnchor(a: Anchor, b: Anchor): boolean {
  if (a.kind === "heading" && b.kind === "heading") {
    return eq(a.slug, b.slug);
  }
  if (a.kind === "line" && b.kind === "line") {
    return a.n === b.n;
  }
  return false;
}

function eq(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

/** The structured, pasteable reference: an HTML comment naming the target + a
 * blockquote with the note. Matches the format in specs/mdtation.md. */
export function copyFormat(comment: Comment, doc: Document): string {
  const { anchor } = comment;
  if (anchor.kind === "heading") {
    const h = findHeading(doc, anchor.slug);
    const label = headingLabel(anchor.slug, doc) ?? anchor.slug.join(" / ");
    const line = h ? ` (line ${h.startLine})` : "";
    return `<!-- mdtation comment on \`${label}\`${line} -->\n> ${comment.text}`;
  }
  return `<!-- mdtation comment on line ${anchor.n} -->\n> ${comment.text}`;
}
