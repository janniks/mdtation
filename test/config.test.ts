import { deepStrictEqual } from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { defaultConfig, loadConfig } from "../src/core/config.ts";

async function writeConfig(cwd: string, cfg: object): Promise<void> {
  await writeFile(join(cwd, "mdtation.json"), JSON.stringify(cfg), "utf-8");
}

describe("loadConfig", () => {
  test("reads theme and gutter from mdtation.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      await writeConfig(dir, { theme: "light", gutter: false });
      deepStrictEqual(loadConfig(dir), { ...defaultConfig, theme: "light", gutter: false });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("returns defaults when mdtation.json is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      deepStrictEqual(loadConfig(dir), defaultConfig);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("returns defaults on malformed JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      await writeFile(join(dir, "mdtation.json"), "{ invalid", "utf-8");
      deepStrictEqual(loadConfig(dir), defaultConfig);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("ignores unknown keys", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      await writeConfig(dir, { unknown: 123 });
      deepStrictEqual(loadConfig(dir), defaultConfig);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("falls back to default theme for an invalid value", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      await writeConfig(dir, { theme: "purple" });
      deepStrictEqual(loadConfig(dir), defaultConfig);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("reads view flags, defaulting each missing or non-boolean one to true", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      await writeConfig(dir, { view: { emphasis: false, syntax: "no" } });
      deepStrictEqual(loadConfig(dir).view, { color: true, emphasis: false, syntax: true });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("falls back to default gutter for a non-boolean", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-cfg-"));
    try {
      await writeConfig(dir, { gutter: "yes" });
      deepStrictEqual(loadConfig(dir), defaultConfig);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
