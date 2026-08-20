import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { load, save } from "../src/core/prefs.ts";

test("prefs round-trip through settings.json, leaving no temp file", () => {
  process.env.MDTATION_HOME = mkdtempSync(join(tmpdir(), "mdtation-prefs-"));
  assert.deepEqual(load(), { toggles: {}, values: {}, picks: {} });
  save({ toggles: { viewColor: false }, values: { margin: "5" }, picks: { caret: 2 } });
  assert.deepEqual(load(), {
    toggles: { viewColor: false },
    values: { margin: "5" },
    picks: { caret: 2 },
  });
  assert.deepEqual(readdirSync(process.env.MDTATION_HOME), ["settings.json"]);
  writeFileSync(join(process.env.MDTATION_HOME, "settings.json"), "{nope");
  assert.deepEqual(load(), { toggles: {}, values: {}, picks: {} });
});
