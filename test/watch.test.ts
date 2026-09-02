import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { follow, QUIET } from "../src/core/watch.ts";

test("follow runs once after a burst of writes that pass hit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mdt-"));
  let n = 0;
  const stop = follow(
    dir,
    (name) => name.startsWith("a"),
    () => n++,
  );
  writeFileSync(join(dir, "a.json"), "1");
  writeFileSync(join(dir, "a.json"), "2");
  writeFileSync(join(dir, "b.json"), "x");
  await new Promise((r) => setTimeout(r, QUIET * 3));
  stop();
  assert.equal(n, 1);
});
