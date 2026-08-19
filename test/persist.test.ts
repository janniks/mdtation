import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CommentStore, type Comment } from "../src/core/comment.ts";

function heading(slug: string[], text: string, id = "c1"): Comment {
  return { id, anchor: { kind: "heading", slug }, text, createdAt: 0 };
}

function line(n: number, text: string, id = "c2"): Comment {
  return { id, anchor: { kind: "line", n }, text, createdAt: 0 };
}

describe("CommentStore persistence", () => {
  test("save then load round-trips heading-anchored and line-anchored comments", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-persist-"));
    const file = join(dir, "comments.json");
    try {
      const store = new CommentStore();
      store.add(heading(["title", "sub"], "fix this heading"));
      store.add(line(4, "todo item"));
      await store.save(file);

      const loaded = await CommentStore.load(file);
      assert.equal(loaded.all().length, 2);
      const h = loaded.byAnchor({ kind: "heading", slug: ["title", "sub"] });
      assert.equal(h.length, 1);
      assert.equal(h[0]?.text, "fix this heading");
      const l = loaded.byAnchor({ kind: "line", n: 4 });
      assert.equal(l.length, 1);
      assert.equal(l[0]?.text, "todo item");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("load on missing path returns empty store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-persist-"));
    const file = join(dir, "does-not-exist.json");
    try {
      const loaded = await CommentStore.load(file);
      assert.equal(loaded.all().length, 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("load on malformed JSON returns empty store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdt-persist-"));
    const file = join(dir, "bad.json");
    try {
      await import("node:fs/promises").then((fs) =>
        fs.writeFile(file, "{ not valid json", "utf-8"),
      );
      const loaded = await CommentStore.load(file);
      assert.equal(loaded.all().length, 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
