/**
 * Persistent UI preferences: View toggles, settings values and cycle picks (fence style, glyphs).
 * One `settings.json` in the data dir (see `store.home`), written atomically (tmp + rename).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./store.ts";

export interface Prefs {
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly values: Readonly<Record<string, string>>;
  readonly picks: Readonly<Record<string, number>>;
}

const EMPTY: Prefs = { toggles: {}, values: {}, picks: {} };

function path(): string {
  return join(config(), "settings.json");
}

/** Saved preferences; missing or malformed data yields empty sections. */
export function load(): Prefs {
  try {
    const data = JSON.parse(readFileSync(path(), "utf-8")) as Partial<Prefs>;
    return {
      toggles: { ...data.toggles },
      values: { ...data.values },
      picks: { ...data.picks },
    };
  } catch {
    return EMPTY;
  }
}

/** Write `prefs` atomically so a crash mid-write never leaves a broken file. */
export function save(prefs: Prefs): void {
  mkdirSync(config(), { recursive: true });
  const tmp = `${path()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(prefs, null, 2), "utf-8");
  renameSync(tmp, path());
}
