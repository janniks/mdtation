/**
 * Persistent UI preferences: View toggles, settings values and gutter glyph picks.
 * One `settings.json` in the data dir (see `store.home`), written atomically (tmp + rename).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { home } from "./store.ts";

export interface Prefs {
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly values: Readonly<Record<string, string>>;
  readonly glyphs: Readonly<Record<string, number>>;
}

const EMPTY: Prefs = { toggles: {}, values: {}, glyphs: {} };

function path(): string {
  return join(home(), "settings.json");
}

/** Saved preferences; missing or malformed data yields empty sections. */
export function load(): Prefs {
  try {
    const data = JSON.parse(readFileSync(path(), "utf-8")) as Partial<Prefs>;
    return {
      toggles: { ...data.toggles },
      values: { ...data.values },
      glyphs: { ...data.glyphs },
    };
  } catch {
    return EMPTY;
  }
}

/** Write `prefs` atomically so a crash mid-write never leaves a broken file. */
export function save(prefs: Prefs): void {
  mkdirSync(home(), { recursive: true });
  const tmp = `${path()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(prefs, null, 2), "utf-8");
  renameSync(tmp, path());
}
