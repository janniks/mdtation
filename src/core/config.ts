import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface View {
  readonly color: boolean;
  readonly emphasis: boolean;
  readonly syntax: boolean;
}

export interface Config {
  readonly theme: "dark" | "light";
  readonly gutter: boolean;
  /** Startup defaults for the View menu toggles. */
  readonly view: View;
}

export const defaultConfig: Config = {
  theme: "dark",
  gutter: true,
  view: { color: true, emphasis: true, syntax: true },
};

function flag(v: unknown): boolean {
  return typeof v === "boolean" ? v : true;
}

/** Read `<cwd>/mdtation.json` and merge it over the defaults.
 * Missing file or unparseable JSON yields the defaults. */
export function loadConfig(cwd: string): Config {
  const path = resolve(cwd, "mdtation.json");
  if (!existsSync(path)) {
    return defaultConfig;
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as {
      theme?: unknown;
      gutter?: unknown;
      view?: Partial<Record<keyof View, unknown>>;
    };
    return {
      theme: data.theme === "light" ? "light" : "dark",
      gutter: flag(data.gutter),
      view: {
        color: flag(data.view?.color),
        emphasis: flag(data.view?.emphasis),
        syntax: flag(data.view?.syntax),
      },
    };
  } catch {
    return defaultConfig;
  }
}
