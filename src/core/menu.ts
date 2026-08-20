/**
 * Menu model, derived from the command catalog. Pure: categories in
 * declaration order, each entry carrying a human-readable hint for its first
 * key, plus the fixed-width label boxes the menu bar lays out (hunk-style).
 */
import type { Command } from "./commands.ts";
import { displayWidth } from "./unicode.ts";

export interface Entry {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
}

export interface Menu {
  readonly label: string;
  readonly entries: readonly Entry[];
}

export interface Spec {
  readonly id: string;
  readonly label: string;
  readonly left: number;
  readonly width: number;
}

const NAMES: Readonly<Record<string, string>> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  return: "↵",
  escape: "Esc",
  space: "Space",
  tab: "Tab",
  backspace: "⌫",
};

/** `ctrl+f` -> `^F`, `shift+g` -> `G`, `down` -> `↓`, `/` -> `/`. */
export function hint(chord: string | undefined): string {
  if (!chord) {
    return "";
  }
  const mods = chord.split("+");
  const name = mods.pop() ?? "";
  const key = NAMES[name] ?? (name.length === 1 ? name : name[0]!.toUpperCase() + name.slice(1));
  let out = mods.includes("shift") ? key.toUpperCase() : key;
  if (mods.includes("alt")) out = `M-${out}`;
  if (mods.includes("ctrl")) out = `^${out.toUpperCase()}`;
  return out;
}

/** Group commands by category, keeping declaration order. */
export function menus(commands: readonly Command[]): Menu[] {
  const out: Menu[] = [];
  for (const c of commands) {
    const entry = { id: c.id, title: c.title, hint: hint(c.keys[0]) };
    const menu = out.find((m) => m.label === c.category);
    if (menu) {
      (menu.entries as Entry[]).push(entry);
    } else {
      out.push({ label: c.category, entries: [entry] });
    }
  }
  return out;
}

/** Menu-bar label boxes, packed left to right after a one-column gutter. */
export function specs(all: readonly Menu[]): Spec[] {
  const out: Spec[] = [];
  for (const m of all) {
    const prev = out.at(-1);
    out.push({
      id: m.label.toLowerCase(),
      label: m.label,
      left: prev ? prev.left + prev.width : 1,
      width: displayWidth(m.label) + 2,
    });
  }
  return out;
}

/** Inner width a dropdown needs: `  title  hint ` with the hint right-aligned. */
export function width(menu: Menu): number {
  return Math.max(20, ...menu.entries.map((e) => displayWidth(e.title) + displayWidth(e.hint) + 5));
}

/** Wrap-around index stepping over `n` items. */
export function step(index: number, delta: number, n: number): number {
  return n <= 0 ? 0 : (((index + delta) % n) + n) % n;
}
