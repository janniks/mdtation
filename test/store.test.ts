import { strict as assert } from "node:assert";
import { test, describe, before, after } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CommentStore, type Comment } from "../src/core/comment.ts";
import { archive, clear, home, load, restore, save } from "../src/core/store.ts";

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

  test("two files share one json and round-trip", async () => {
    await save("/a.md", store(note("1", 1), note("2", 2)));
    await save("/b.md", store(note("3", 3)));
    assert.deepEqual(Object.keys(JSON.parse(await readFile(join(dir, "comments.json"), "utf-8"))), [
      "/a.md",
      "/b.md",
    ]);
    assert.equal((await load("/a.md")).all().length, 2);
    assert.equal((await load("/b.md")).byAnchor({ kind: "line", n: 3 })[0]?.text, "t3");
  });

  test("saving an empty store removes the key", async () => {
    await save("/b.md", store());
    assert.equal((await load("/b.md")).all().length, 0);
    assert.ok(!("/b.md" in JSON.parse(await readFile(join(dir, "comments.json"), "utf-8"))));
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
    assert.equal(got.get("1")?.archived, true);
    assert.equal(await restore("/a.md", ["1"]), 1);
    assert.equal((await load("/a.md")).live().length, 2);
  });

  test("clear returns the count and removes", async () => {
    assert.equal(await clear("/a.md"), 2);
    assert.equal(await clear("/a.md"), 0);
    assert.equal((await load("/a.md")).all().length, 0);
  });
});
