import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { log, path } from "../src/core/store.ts";
import { tui, usable } from "./pty.ts";

test("open, comment, quit: the events log tells the story", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\none\ntwo\n");
  const { home } = tui(file, [
    [1500, "jjc"],
    [400, "hello\\r"],
    [1000, "q"],
  ]);
  const events = readFileSync(join(home, "comments", basename(log(file))), "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l).event);
  assert.deepEqual(events, ["open", "comment", "quit"]);
  assert.equal(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")).comments[0]
      .text,
    "hello",
  );
});
