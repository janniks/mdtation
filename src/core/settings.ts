/** Settings palette model: each setting cycles through a fixed value list (herdr-style). */
import type { Command } from "./commands.ts";

export const SETTINGS = [
  {
    id: "margin",
    title: "Scroll margin",
    category: "View",
    values: ["0", "1", "2", "3", "4", "5", "6", "8", "10", "16", "32", "64"],
  },
  {
    id: "crumb",
    title: "Crumb depth",
    category: "View",
    values: ["all", "1", "2", "3", "4", "5", "6"],
  },
  { id: "front", title: "Frontmatter editing", category: "Advanced", values: ["on", "off"] },
  {
    id: "purge",
    title: "Remove after",
    category: "Comments",
    values: ["1d", "7d", "30d", "1y", "never"],
  },
  {
    id: "width",
    title: "Inline width",
    category: "View",
    values: ["fit", "50", "60", "70", "80", "90", "full"],
  },
  { id: "agent", title: "Agent side", category: "Comments", values: ["left", "right"] },
  { id: "own", title: "Your side", category: "Comments", values: ["right", "left"] },
  { id: "time", title: "Time", category: "Comments", values: ["relative", "absolute", "hide"] },
  // `row` lights the caret's screen row only; `line` lights every wrap row of the source line.
  { id: "line", title: "Highlight line", category: "View", values: ["row", "line", "off"] },
  { id: "corners", title: "Popup corners", category: "View", values: ["pointy", "round"] },
  { id: "status", title: "Badge corner", category: "View", values: ["bottom", "top"] },
  // New comments outside the window: a notice that stays until each is scrolled to, or goes by itself.
  {
    id: "toast",
    title: "New comment notice",
    category: "Comments",
    values: ["stay", "fade", "off"],
  },
] as const;

const DAY = 86_400_000;
/** Archive retention in ms per `purge` value; `never` is Infinity. */
export const TTL: Record<string, number> = {
  "1d": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "1y": 365 * DAY,
  never: Infinity,
};

export type Id = (typeof SETTINGS)[number]["id"];
export type Values = Record<Id, string>;

export const DEFAULTS: Values = {
  margin: "8",
  crumb: "all",
  front: "on",
  purge: "30d",
  width: "70",
  agent: "left",
  own: "right",
  time: "relative",
  line: "row",
  corners: "pointy",
  status: "bottom",
  toast: "stay",
};

/** Move setting `id` by `dir` steps through its values (wrapping). Unknown ids are ignored. */
export function cycle(v: Values, id: string, dir = 1): Values {
  const s = SETTINGS.find((x) => x.id === id);
  if (!s) {
    return v;
  }
  const n = s.values.length;
  const i = s.values.indexOf(v[s.id] as never);
  return { ...v, [s.id]: s.values[(((i + dir) % n) + n) % n] };
}

/** Palette rows: one pseudo-command per setting, the current value shown as its hint. */
export function rows(v: Values, cyclers: readonly Command[] = []): Command[] {
  return [
    ...SETTINGS.map((s) => ({
      id: `set:${s.id}`,
      title: s.title,
      category: s.category,
      keys: [v[s.id]],
    })),
    ...cyclers,
  ].map((c) => ({ ...c, title: `${c.category} > ${c.title}` }));
}
