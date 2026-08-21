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
import { crumb } from "./crumb.ts";

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
  /** Archived comments stay on disk but leave markers, nav, copy and the default report. */
  readonly archived?: boolean;
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
  /** Every comment, archived included. */
  all(): readonly Comment[] {
    return [...this.comments.values()];
  }
  /** Only comments that are not archived. */
  live(): readonly Comment[] {
    return this.all().filter((c) => !c.archived);
  }
  archive(id: string): boolean {
    return this.flag(id, true);
  }
  restore(id: string): boolean {
    return this.flag(id, false);
  }
  private flag(id: string, archived: boolean): boolean {
    const c = this.comments.get(id);
    if (!c) return false;
    this.comments.set(id, { ...c, archived });
    return true;
  }
  byAnchor(anchor: Anchor): readonly Comment[] {
    return this.live().filter((c) => sameAnchor(c.anchor, anchor));
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

/** Longest crumb segment / line preview kept in the detailed format (token budget). */
const SEG = 24;
const PREVIEW = 80;

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** The pasteable reference: `Line N` + the note as a blockquote.
 * `detail` adds the section crumb (segments clipped) and an indented preview of the line. */
export function copyFormat(comment: Comment, doc: Document, detail = false): string {
  const loc = resolveAnchor(comment.anchor, doc);
  const quote = comment.text
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  if (!detail || !loc) {
    return `Line ${loc ? loc.startLine + 1 : "?"}\n${quote}`;
  }
  const path = crumb(doc, loc.startLine)
    .split(" / ")
    .map((s) => clip(s, SEG))
    .join(" / ");
  const head = `Line ${loc.startLine + 1}${path ? `  ${path}` : ""}`;
  const src = doc.lines[loc.startLine]?.trim() ?? "";
  return [head, ...(src ? [`    ${clip(src, PREVIEW)}`] : []), quote].join("\n");
}
