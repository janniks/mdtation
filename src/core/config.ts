import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface Config {
  readonly theme: "dark" | "light";
  readonly gutter: boolean;
}

export const defaultConfig: Config = { theme: "dark", gutter: true };

/** Read `<cwd>/mdtation.json` and merge it over the defaults.
 * Missing file or unparseable JSON yields the defaults. */
export function loadConfig(cwd: string): Config {
  const path = resolve(cwd, "mdtation.json");
  if (!existsSync(path)) {
    return defaultConfig;
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as Partial<Config>;
    return {
      theme: data.theme === "light" ? "light" : "dark",
      gutter: typeof data.gutter === "boolean" ? data.gutter : true,
    };
  } catch {
    return defaultConfig;
  }
}
