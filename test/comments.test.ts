import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore } from "../src/core/comment.ts";
import { anchorFor, create, markers } from "../src/core/comments.ts";

// 0:Title 1:blank 2:Sub 3:blank 4:text
const doc = parseDocument("# Title\n\n## Sub\n\ntext\n");

describe("comments glue", () => {
  test("anchorFor: heading row -> heading path, other rows -> line", () => {
    assert.deepEqual(anchorFor(doc, 2), { kind: "heading", slug: ["title", "sub"] });
    assert.deepEqual(anchorFor(doc, 4), { kind: "line", n: 4, text: "text" });
  });

  test("create: id is base36 of now plus two random chars, anchor from the line", () => {
    const c = create(doc, 0, "fix", 1000);
    assert.match(c.id, /^rs[0-9a-z]{2}$/);
    assert.deepEqual(c, {
      id: c.id,
      anchor: { kind: "heading", slug: ["title"] },
      text: "fix",
      createdAt: 1000,
    });
  });

  test("markers: resolved, sorted, one per comment", () => {
    const store = new CommentStore();
    store.add(create(doc, 4, "a", 1));
    store.add(create(doc, 2, "b", 2));
    store.add(create(doc, 4, "c", 3));
    assert.deepEqual(markers(store, doc), [2, 4, 4]);
  });
});
