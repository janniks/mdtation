import { strict as assert } from "node:assert";
import { test, describe, before, after } from "node:test";
import { mkdtempSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CommentStore, type Comment } from "../src/core/comment.ts";
import {
  append,
  archive,
  clear,
  events,
  home,
  load,
  path,
  expire,
  restore,
  save,
} from "../src/core/store.ts";

function note(id: string, n: number): Comment {
  return { id, anchor: { kind: "line", n }, text: `t${n}`, createdAt: 0 };
}

function store(...list: Comment[]): CommentStore {
  return CommentStore.fromJSON(list);
}

describe("store", () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "mdt-store-"));
    process.env.MDTATION_HOME = dir;
  });
  after(() => rm(dir, { recursive: true, force: true }));

  test("home honours MDTATION_HOME", () => {
    assert.equal(home(), dir);
  });

  test("load missing -> empty", async () => {
    assert.equal((await load("/none.md")).all().length, 0);
  });

  test("one json per file under comments/, round-trips with marks", async () => {
    await save("/a.md", store(note("1", 1), note("2", 2)));
    const b = store(note("3", 3));
    b.mark(5, "agent", "r1");
    await save("/b.md", b);
    assert.equal(path("/a.md"), join(dir, "comments", "-a.md.json"));
    assert.deepEqual(Object.keys(JSON.parse(await readFile(path("/b.md"), "utf-8"))), [
      "comments",
      "marks",
    ]);
    assert.deepEqual((await load("/b.md")).marks, [{ at: 5, by: "agent", name: "r1" }]);
    assert.equal((await load("/a.md")).all().length, 2);
    assert.equal((await load("/b.md")).byAnchor({ kind: "line", n: 3 })[0]?.text, "t3");
  });

  test("saving an empty store leaves other files alone", async () => {
    await save("/b.md", store());
    assert.equal((await load("/b.md")).all().length, 0);
    assert.equal((await load("/a.md")).all().length, 2);
  });

  test("archive/restore persist the flag and report counts", async () => {
    assert.equal(await archive("/a.md", ["1", "nope"]), 1);
    const got = await load("/a.md");
    assert.equal(got.all().length, 2);
    assert.deepEqual(
      got.live().map((c) => c.id),
      ["2"],
    );
    assert.ok(got.get("1")?.archivedAt);
    assert.equal(await restore("/a.md", ["1"]), 1);
    assert.equal((await load("/a.md")).live().length, 2);
  });

  test("expire removes only what was archived longer than ttl", async () => {
    await archive("/a.md", ["1"]);
    assert.equal(await expire("/a.md", 60_000), 0);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(await expire("/a.md", 0), 1);
    assert.equal((await load("/a.md")).all().length, 1);
    await save("/a.md", store(note("1", 1), note("2", 2)));
  });

  test("clear returns the count and removes", async () => {
    assert.equal(await clear("/a.md"), 2);
    assert.equal(await clear("/a.md"), 0);
    assert.equal((await load("/a.md")).all().length, 0);
  });
});

describe("events log", () => {
  test("append then events, oldest first, filtered by since", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mdt-ev-"));
    process.env.MDTATION_HOME = dir;
    const file = join(dir, "d.md");
    append(file, { event: "open", by: "me", at: 10 });
    append(file, { event: "comment", by: "bot", id: "c1", what: "new", at: 20 });
    append(file, { event: "quit", by: "me", at: 30 });
    assert.deepEqual(
      (await events(file)).map((e) => e.event),
      ["open", "comment", "quit"],
    );
    assert.deepEqual(
      (await events(file, 20)).map((e) => e.event),
      ["quit"],
    );
    assert.deepEqual(await events(join(dir, "none.md")), []);
  });
});

test("two saves in flight at once both land", async () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-race-")), "doc.md");
  const s = new CommentStore();
  await Promise.all([save(file, s), save(file, s), save(file, s)]);
  assert.equal((await load(file)).all().length, 0);
});
