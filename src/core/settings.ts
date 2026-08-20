/** Settings palette model: each setting cycles through a fixed value list (herdr-style). */
import type { Command } from "./commands.ts";

export const SETTINGS = [
  { id: "margin", title: "Scroll › Margin lines", values: ["0", "2", "3", "5", "8"] },
  { id: "crumb", title: "Section › Crumb depth", values: ["all", "1", "2", "3"] },
  { id: "front", title: "Beta › Frontmatter editing", values: ["on", "off"] },
] as const;

export type Id = (typeof SETTINGS)[number]["id"];
export type Values = Record<Id, string>;

export const DEFAULTS: Values = { margin: "3", crumb: "all", front: "on" };

/** Advance setting `id` to its next value (wrapping). Unknown ids are ignored. */
export function cycle(v: Values, id: string): Values {
  const s = SETTINGS.find((x) => x.id === id);
  if (!s) {
    return v;
  }
  const i = s.values.indexOf(v[s.id] as never);
  return { ...v, [s.id]: s.values[(i + 1) % s.values.length] };
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
