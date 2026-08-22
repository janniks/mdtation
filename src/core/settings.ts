/** Settings palette model: each setting cycles through a fixed value list (herdr-style). */
import type { Command } from "./commands.ts";

export const SETTINGS = [
  {
    id: "margin",
    title: "Scroll > Margin lines",
    values: ["0", "1", "2", "3", "4", "5", "6", "8", "10"],
  },
  { id: "crumb", title: "Section > Crumb depth", values: ["all", "1", "2", "3", "4", "5", "6"] },
  { id: "front", title: "Beta > Frontmatter editing", values: ["on", "off"] },
] as const;

export type Id = (typeof SETTINGS)[number]["id"];
export type Values = Record<Id, string>;

export const DEFAULTS: Values = { margin: "3", crumb: "all", front: "on" };

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
export function rows(v: Values): Command[] {
  return SETTINGS.map((s) => ({
    id: `set:${s.id}`,
    title: s.title,
    category: "Settings",
    keys: [v[s.id]],
  }));
}
