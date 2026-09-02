/**
 * Inline threads: comments rendered as quiet rows under their line. Pure.
 * The TUI picks which voices to show; `rows` lays a line's notes out for a width.
 */
import type { CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";
import { SGR } from "./sgr.ts";
import { displayWidth, pad, wrapWords } from "./unicode.ts";

export type Time = "relative" | "absolute" | "hide";
export type Align = "right" | "left";
/** Block width: `fit` shrinks to the text, `full` spans the pane, a number is a percent of it.
 * Text wraps inside that width, so a long comment stays a narrow column, not a pane-wide slab. */
export type Layout = "fit" | "full" | "50" | "60" | "70" | "80" | "90";

export interface Note {
  readonly id: string;
  readonly who: string;
  readonly text: string;
  readonly at: number;
  /** An agent wrote it; in chat layout those sit on the left and yours on the right. */
  readonly agent: boolean;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** `now`, `5m ago`, `3h ago`, `2d ago` — or `14:02`, the date once older than a day; never both. */
export function when(at: number, now: number, mode: Time): string {
  if (mode === "hide") {
    return "";
  }
  const ago = Math.max(0, now - at);
  if (mode === "relative") {
    if (ago < MIN) return "now";
    if (ago < HOUR) return `${Math.floor(ago / MIN)}m ago`;
    if (ago < DAY) return `${Math.floor(ago / HOUR)}h ago`;
    return `${Math.floor(ago / DAY)}d ago`;
  }
  const d = new Date(at);
  return ago < DAY ? d.toTimeString().slice(0, 5) : d.toISOString().slice(0, 10);
}

/** Notes per line, threads flat in time order. `agent`/`own` pick the voices; `me` labels the local human. */
export function notes(
  store: CommentStore,
  doc: Document,
  opts: { readonly agent: boolean; readonly own: boolean; readonly me?: string },
): Map<number, Note[]> {
  const map = new Map<number, Note[]>();
  const list = store
    .live()
    .filter((c) => (c.agent ? opts.agent : opts.own))
    .toSorted((a, b) => a.createdAt - b.createdAt);
  for (const c of list) {
    const line = store.resolve(c.anchor, doc)?.startLine;
    if (line === undefined) continue;
    const who = c.author && c.author !== opts.me ? c.author : "you";
    map.set(line, [
      ...(map.get(line) ?? []),
      { id: c.id, who, text: c.text, at: c.createdAt, agent: c.agent === true },
    ]);
  }
  return map;
}

export interface Opts {
  readonly agent: Align;
  readonly own: Align;
  readonly width: Layout;
  readonly time: Time;
  readonly now: number;
  readonly color: boolean;
}

/** Screen rows for one line's notes: the text, closed by a right-aligned `you, 6m ago`.
 * Each note takes the side its author sits on. */
export function rows(list: readonly Note[], cols: number, opts: Opts): string[] {
  return lay(list, cols, opts).rows;
}

/** `rows` plus, for each row, the index into `list` of the note it belongs to. */
export function lay(
  list: readonly Note[],
  cols: number,
  opts: Opts,
): { rows: string[]; of: number[] } {
  const b = build(list, cols, opts);
  // One block: the configured share of the pane, or for `fit` just as wide as its text.
  const width =
    opts.width === "fit"
      ? Math.max(...b.body.map((t, i) => displayWidth(t) + tail(b.meta[i]!)))
      : span(opts.width, cols);
  // Each note takes the side its author is configured to sit on.
  const right = (i: number) => (list[b.of[i]!]!.agent ? opts.agent : opts.own) === "right";
  // In color, a dark slab with a space either side so the thread reads as one block, not dim text.
  // Who and when stay quiet against it; the comment itself carries the contrast.
  const rows = b.meta.map((m, i) => {
    const text = pad(b.body[i]!, width - tail(m));
    if (!opts.color) {
      const lead = " ".repeat(right(i) ? Math.max(0, cols - width) : 2);
      return (lead + text + (m ? `  ${m}` : "")).trimEnd();
    }
    const lead = " ".repeat(right(i) ? Math.max(0, cols - width - 2) : 2);
    return `${lead}${SGR.bgGray} ${SGR.silver}${text}${m ? `${SGR.gray}  ${m}` : ""} ${SGR.reset}`;
  });
  return { rows, of: b.of };
}

/** Columns the meta takes at the end of a row, gap included; zero when the row has none. */
function tail(meta: string): number {
  return meta ? displayWidth(meta) + 2 : 0;
}

/** Widest the block may be: the pane for `fit` and `full`, else that percent of it.
 * Two columns come off for the slab's padding so the block still fits the pane. */
function span(width: Layout, cols: number): number {
  const pane = Math.max(0, cols - 2);
  return width === "fit" || width === "full" ? pane : Math.floor((pane * Number(width)) / 100);
}

/** Shared layout: wrapped text rows, the `you, 6m ago` meta on each note's last row, and each row's note index. */
function build(
  list: readonly Note[],
  cols: number,
  opts: { readonly width: Layout; readonly time: Time; readonly now: number },
): { meta: string[]; body: string[]; of: number[] } {
  const metas = list.map((n) => {
    const t = when(n.at, opts.now, opts.time);
    return t ? `${n.who}, ${t}` : n.who;
  });
  // The text shares the block with the widest meta and the two-space gap before it.
  const textW = Math.max(8, span(opts.width, cols) - Math.max(...metas.map(displayWidth)) - 2);
  const meta: string[] = [];
  const body: string[] = [];
  const of: number[] = [];
  list.forEach((n, i) => {
    const lines = wrapWords(n.text, textW);
    lines.forEach((t, j) => {
      body.push(t);
      // Who and when close the note, on its last row.
      meta.push(j === lines.length - 1 ? metas[i]! : "");
      of.push(i);
    });
  });
  return { meta, body, of };
}
