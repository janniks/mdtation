/**
 * Inline threads: comments rendered as quiet rows under their line. Pure.
 * The TUI picks which voices to show; `rows` lays a line's notes out for a width.
 */
import type { CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";
import { SGR } from "./sgr.ts";
import { displayWidth, pad } from "./unicode.ts";

export type Time = "relative" | "absolute" | "hide";
export type Align = "right" | "left";
/** Block width: `fit` shrinks to the text, `full` spans the pane, a number is a percent of it. */
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

/** Screen rows for one line's notes: the text, closed by a right-aligned `you, 6m ago`.
 * `width` sets the block's floor and each note takes the side its author sits on. */
export function rows(
  list: readonly Note[],
  cols: number,
  opts: {
    readonly agent: Align;
    readonly own: Align;
    readonly width: Layout;
    readonly time: Time;
    readonly now: number;
    readonly color: boolean;
  },
): string[] {
  const b = build(list, cols, opts);
  // One block: never narrower than the configured share of the pane, never wider than its text.
  const width = Math.max(
    ...b.body.map((t, i) => displayWidth(t) + tail(b.meta[i]!)),
    floor(opts.width, cols),
  );
  // Each note takes the side its author is configured to sit on.
  const right = (i: number) => (list[b.of[i]!]!.agent ? opts.agent : opts.own) === "right";
  if (!opts.color) {
    return b.meta.map((m, i) => {
      const flat = " ".repeat(right(i) ? Math.max(0, cols - width) : 2);
      return (flat + pad(b.body[i]!, width - tail(m)) + (m ? `  ${m}` : "")).trimEnd();
    });
  }
  // A dark slab with a space either side, so the thread reads as one block, not dim text.
  // Who and when stay quiet against it; the comment itself carries the contrast.
  return b.meta.map((m, i) => {
    const lead = " ".repeat(right(i) ? Math.max(0, cols - width - 2) : 2);
    const text = SGR.silver + pad(b.body[i]!, width - tail(m));
    return `${lead}${SGR.bgGray} ${text}${m ? `${SGR.gray}  ${m}` : ""} ${SGR.reset}`;
  });
}

/** Columns the meta takes at the end of a row, gap included; zero when the row has none. */
function tail(meta: string): number {
  return meta ? displayWidth(meta) + 2 : 0;
}

/** Narrowest the block may be: nothing for `fit`, the pane for `full`, else that percent of it.
 * Two columns come off for the slab's padding so the block still fits the pane. */
function floor(width: Layout, cols: number): number {
  if (width === "fit") {
    return 0;
  }
  const pane = Math.max(0, cols - 2);
  return width === "full" ? pane : Math.floor((pane * Number(width)) / 100);
}

/** Which note each screen row from `rows()` belongs to, as indices into `list`.
 * Must be called with the same `cols` and opts as `rows()` so the wraps agree. */
export function owners(
  list: readonly Note[],
  cols: number,
  opts: { readonly time: Time; readonly now: number },
): number[] {
  return build(list, cols, opts).of;
}

/** Shared layout: wrapped text rows, the `you, 6m ago` meta on each note's last row, and each row's note index. */
function build(
  list: readonly Note[],
  cols: number,
  opts: { readonly time: Time; readonly now: number },
): { meta: string[]; body: string[]; of: number[] } {
  const metas = list.map((n) => {
    const t = when(n.at, opts.now, opts.time);
    return t ? `${n.who}, ${t}` : n.who;
  });
  // 4 = the two-space gap before the meta plus a space of slab padding either side.
  const textW = Math.max(8, cols - Math.max(...metas.map(displayWidth)) - 4);
  const meta: string[] = [];
  const body: string[] = [];
  const of: number[] = [];
  list.forEach((n, i) => {
    const lines = wrap(n.text, textW);
    lines.forEach((t, j) => {
      body.push(t);
      // Who and when close the note, on its last row.
      meta.push(j === lines.length - 1 ? metas[i]! : "");
      of.push(i);
    });
  });
  return { meta, body, of };
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (let word of para.split(" ")) {
      // A word wider than the row is chopped, so it can never overflow the block.
      while (displayWidth(word) > width) {
        if (cur) {
          out.push(cur);
          cur = "";
        }
        out.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (cur && displayWidth(cur) + 1 + displayWidth(word) > width) {
        out.push(cur);
        cur = word;
      } else {
        cur = cur ? `${cur} ${word}` : word;
      }
    }
    out.push(cur);
  }
  return out;
}
