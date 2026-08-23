/**
 * Inline threads: comments rendered as quiet rows under their line. Pure.
 * The TUI picks which voices to show; `rows` lays a line's notes out for a width.
 */
import type { CommentStore } from "./comment.ts";
import type { Document } from "./document.ts";
import { paint, SGR } from "./sgr.ts";
import { displayWidth } from "./unicode.ts";

export type Time = "relative" | "absolute" | "hide";
export type Align = "right" | "left";

export interface Note {
  readonly who: string;
  readonly text: string;
  readonly at: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** `now`, `5m`, `3h`, `2d` — or `14:02`, the date once older than a day; never both. */
export function when(at: number, now: number, mode: Time): string {
  if (mode === "hide") {
    return "";
  }
  const ago = Math.max(0, now - at);
  if (mode === "relative") {
    if (ago < MIN) return "now";
    if (ago < HOUR) return `${Math.floor(ago / MIN)}m`;
    if (ago < DAY) return `${Math.floor(ago / HOUR)}h`;
    return `${Math.floor(ago / DAY)}d`;
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
    map.set(line, [...(map.get(line) ?? []), { who, text: c.text, at: c.createdAt }]);
  }
  return map;
}

/** Screen rows for one line's notes: `who  text  time`, names padded to one column; `right` pushes the block to the edge. */
export function rows(
  list: readonly Note[],
  cols: number,
  opts: {
    readonly align: Align;
    readonly time: Time;
    readonly now: number;
    readonly color: boolean;
  },
): string[] {
  const nameW = Math.max(...list.map((n) => displayWidth(n.who)));
  const times = list.map((n) => when(n.at, opts.now, opts.time));
  const timeW = Math.max(...times.map(displayWidth));
  const textW = Math.max(8, cols - nameW - timeW - 6);
  const plain: string[] = [];
  list.forEach((n, i) => {
    const lines = wrap(n.text, textW);
    lines.forEach((t, j) => {
      const who = j === 0 ? n.who : "";
      const time = j === lines.length - 1 ? times[i]! : "";
      plain.push(`${who.padStart(nameW)}  ${t}  ${time.padStart(timeW)}`.trimEnd());
    });
  });
  // One block: every row starts at the same column, flush right or two in from the left.
  const width = Math.max(...plain.map(displayWidth));
  const lead = " ".repeat(opts.align === "right" ? Math.max(0, cols - width) : 2);
  return plain.map((row) => paint(opts.color, SGR.gray, lead + row));
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(" ")) {
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
