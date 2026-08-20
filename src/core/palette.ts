/** Pure models behind the help dialog and the command palette. Both derive from `COMMANDS`. */
import type { Command } from "./commands.ts";

/** Rank commands for `query`: title prefix > title substring > id/category substring. Empty query keeps catalog order. */
export function filter(commands: readonly Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  const rank = (c: Command) => {
    const title = c.title.toLowerCase();
    if (title.startsWith(q)) return 0;
    if (title.includes(q)) return 1;
    if (`${c.id} ${c.category}`.toLowerCase().includes(q)) return 2;
    return 3;
  };
  return commands
    .map((c, i) => ({ c, r: rank(c), i }))
    .filter((x) => x.r < 3)
    .toSorted((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.c);
}

/** Human label for the first chord: `ctrl+f` -> `^F`, `shift+g` -> `G`, else verbatim. */
export function hint(keys: readonly string[]): string {
  const k = keys[0] ?? "";
  if (k.startsWith("ctrl+")) return `^${k.slice(5).toUpperCase()}`;
  if (k.startsWith("shift+")) return k.slice(6).toUpperCase();
  return k;
}

export interface Row {
  readonly category: string;
  readonly items: { readonly title: string; readonly hint: string }[];
}

/** Help rows grouped by category, in catalog order. */
export function rows(commands: readonly Command[]): Row[] {
  const out: Row[] = [];
  for (const c of commands) {
    let row = out.find((r) => r.category === c.category);
    if (!row) {
      row = { category: c.category, items: [] };
      out.push(row);
    }
    row.items.push({ title: c.title, hint: hint(c.keys) });
  }
  return out;
}
