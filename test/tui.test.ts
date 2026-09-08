import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { CommentStore } from "../src/core/comment.ts";
import { parseDocument } from "../src/core/document.ts";
import { log, path } from "../src/core/store.ts";
import { tui, usable } from "./pty.ts";

test("go to source line 3, comment, quit", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\nDistinct third line\nLast line\n");
  const { home } = tui(file, [
    [1500, ":3\\r"],
    [400, "c"],
    [400, "line three\\r"],
    [1000, "q"],
  ]);
  const store = CommentStore.fromJSON(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
  );
  assert.equal(store.live().length, 1);
  assert.equal(store.live()[0]!.text, "line three");
  assert.equal(
    store.resolve(store.live()[0]!.anchor, parseDocument(readFileSync(file, "utf-8")))?.startLine,
    2,
  );
});

test("cancelled, empty, and invalid jumps preserve the cursor", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\nLast line");
  const { raw, home } = tui(file, [
    [1500, "G:1"],
    [400, "\\033"],
    [400, ":\\r"],
    [400, ":   \\r"],
    [400, ":1e2\\r"],
    [400, "c"],
    [400, "still last\\r"],
    [1000, "q"],
  ]);
  const store = CommentStore.fromJSON(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
  );
  // The renderer emits changed cells only; some letters from VIEW stay in place.
  assert.match(stripVTControlCharacters(raw), /INVALID/);
  assert.equal(store.live().length, 1);
  assert.equal(store.live()[0]!.text, "still last");
  assert.equal(
    store.resolve(store.live()[0]!.anchor, parseDocument(readFileSync(file, "utf-8")))?.startLine,
    2,
  );
});

test(
  "palette jumps keep hidden frontmatter source numbers; help lists the key",
  { skip: !usable },
  () => {
    const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
    writeFileSync(file, "---\ntitle: Hidden\n---\n\n# Visible\nSource six\n");
    const { raw, home } = tui(
      file,
      [
        [1500, "/"],
        [400, "go to line\\r"],
        [400, "6\\r"],
        [400, "c"],
        [400, "source six\\r"],
        [600, ":1\\r"],
        [400, "c"],
        [400, "first reachable\\r"],
        [600, "?"],
        [400, "q"],
        [400, "q"],
      ],
      48,
    );
    const store = CommentStore.fromJSON(
      JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
    );
    const doc = parseDocument(readFileSync(file, "utf-8"));
    assert.match(stripVTControlCharacters(raw), /Go to line +:/);
    assert.deepEqual(
      store.live().map((c) => [c.text, store.resolve(c.anchor, doc)?.startLine]),
      [
        ["source six", 5],
        ["first reachable", 4],
      ],
    );
  },
);

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

test("d archives the thread under the cursor", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\none\ntwo\n");
  const { home } = tui(file, [
    [1500, "jjc"],
    [400, "bye\\r"],
    [600, "d"],
    [800, "q"],
  ]);
  const store = JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8"));
  assert.ok(store.comments[0].archivedAt, "comment archived");
  const events = readFileSync(join(home, "comments", basename(log(file))), "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .filter((e) => e.event === "comment")
    .map((e) => e.what);
  assert.deepEqual(events, ["new", "archive"]);
});
