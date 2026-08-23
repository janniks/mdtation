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
  /** Text the comment was made on (drag-select), copied verbatim into the reference. */
  readonly quote?: string;
  readonly createdAt: number;
  /** Who wrote it; absent = the local human. */
  readonly author?: string;
  /** Written by an agent through the CLI; the TUI styles and navigates on it. */
  readonly agent?: true;
  /** Parent comment id; absent = top of a thread. */
  readonly re?: string;
  /** Set when archived: the comment stays on disk but leaves markers, nav, copy and the default report. */
  readonly archivedAt?: number;
}

/** A checkpoint: everything created before `at` counts as read for `by` (absent = the local human). */
export interface Mark {
  readonly at: number;
  readonly by?: string;
  readonly name?: string;
}

/** On-disk shape of one document's comments. */
export interface File {
  readonly comments: readonly Comment[];
  readonly marks: readonly Mark[];
}

export class CommentStore {
  private readonly comments = new Map<string, Comment>();
  marks: readonly Mark[] = [];

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
    return this.all().filter((c) => !c.archivedAt);
  }
  archive(id: string, now = Date.now()): boolean {
    const c = this.comments.get(id);
    if (!c) return false;
    this.comments.set(id, { ...c, archivedAt: now });
    return true;
  }
  restore(id: string): boolean {
    const c = this.comments.get(id);
    if (!c) return false;
    const { archivedAt: _t, ...rest } = c;
    this.comments.set(id, rest);
    return true;
  }
  /** Drop comments archived longer than `ttl` ms ago; returns how many went. */
  sweep(ttl: number, now = Date.now()): number {
    let n = 0;
    for (const c of this.all()) {
      if (c.archivedAt && now - c.archivedAt > ttl) {
        this.comments.delete(c.id);
        n++;
      }
    }
    return n;
  }
  byAnchor(anchor: Anchor): readonly Comment[] {
    return this.live().filter((c) => sameAnchor(c.anchor, anchor));
  }
  resolve(anchor: Anchor, doc: Document): Location | null {
    return resolveAnchor(anchor, doc);
  }
  /** Add a checkpoint. */
  mark(now = Date.now(), by?: string, name?: string): void {
    const m: Mark = { at: now, ...(by ? { by } : {}), ...(name ? { name } : {}) };
    this.marks = [...this.marks, m];
  }
  /** Latest mark by `by` (or the local human when absent), or by `name`. */
  since(by?: string, name?: string): Mark | undefined {
    return this.marks.findLast((m) => (name ? m.name === name : m.by === by));
  }
  toJSON(): File {
    return { comments: this.all(), marks: this.marks };
  }
  static fromJSON(data: File | readonly Comment[]): CommentStore {
    const store = new CommentStore();
    const file = Array.isArray(data) ? { comments: data, marks: [] } : (data as File);
    for (const c of file.comments ?? []) store.add(c);
    store.marks = [...(file.marks ?? [])];
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

export type Mode = "simple" | "detailed";

/** `> text` lines; other authors get a `name: ` prefix on the first line. */
function quote(c: Comment): string {
  const lines = c.text.split("\n");
  lines[0] = (c.author ? `${c.author}: ` : "") + lines[0];
  return lines.map((l) => `> ${l}`).join("\n");
}

function indent(s: string): string {
  return s.replaceAll(/^/gm, "  ");
}

/** Top-level comments of `list` paired with their replies (time order); a reply whose parent is absent stands alone. */
export function threads(list: readonly Comment[]): [Comment, Comment[]][] {
  const ids = new Set(list.map((c) => c.id));
  const sorted = [...list].toSorted((a, b) => a.createdAt - b.createdAt);
  const tops = sorted.filter((c) => !c.re || !ids.has(c.re));
  return tops.map((t) => [t, sorted.filter((c) => c.re === t.id)]);
}

/** Longest crumb segment / line preview kept in the detailed format (token budget). */
const SEG = 24;
const PREVIEW = 80;

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** The pasteable reference: `Line N`, the selected text (if any) indented in full, the note as a blockquote.
 * `detailed` adds the section crumb (segments clipped) and, without a selection, a clipped preview of the line. */
export function copyFormat(
  comment: Comment,
  doc: Document,
  mode: Mode = "simple",
  replies: readonly Comment[] = [],
): string {
  const loc = resolveAnchor(comment.anchor, doc);
  const note = [quote(comment), ...replies.map((r) => indent(quote(r)))].join("\n");
  let head = `Line ${loc ? loc.startLine + 1 : "?"}`;
  let src = comment.quote ?? "";
  if (mode === "detailed" && loc) {
    const path = crumb(doc, loc.startLine)
      .split(" / ")
      .map((s) => clip(s, SEG))
      .join(" / ");
    head += path ? `  ${path}` : "";
    src ||= clip(doc.lines[loc.startLine]?.trim() ?? "", PREVIEW);
  }
  const body = src ? src.split("\n").map((l) => `    ${l}`) : [];
  return [head, ...body, note].join("\n");
}
