import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore, type Comment } from "../src/core/comment.ts";
import { createViewport } from "../src/core/viewport.ts";
import { commentLines, nextComment, prevComment } from "../src/core/nav.ts";

// Document: 0:Title 1:blank 2:Sub 3:blank 4:text 5:blank 6:Deep
const md = "# Title\n\n## Sub\n\ntext\n\n### Deep\n";
function parse() {
  return parseDocument(md);
}

function heading(slug: string[], text: string, id = "c1"): Comment {
  return { id, anchor: { kind: "heading", slug }, text, createdAt: 0 };
}
function line(n: number, text: string, id = "c2"): Comment {
  return { id, anchor: { kind: "line", n }, text, createdAt: 0 };
}

describe("nav — comment navigation", () => {
  test("commentLines resolves heading and line anchors", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "heading comment", "h1"));
    store.add(line(4, "line comment", "l1"));
    const doc = parse();
    assert.deepEqual(commentLines(store, doc), [2, 4]);
  });

  test("nextComment from start moves to first comment", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "first", "c1"));
    store.add(line(4, "second", "c2"));
    const doc = parse();
    const vp1 = nextComment(createViewport(0, 0, 80, 24), doc.lines.length, store, doc);
    assert.equal(vp1.cursor, 2);
  });

  test("nextComment from line 2 goes to line 4", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "first", "c1"));
    store.add(line(4, "second", "c2"));
    const doc = parse();
    const vp1 = nextComment(createViewport(0, 2, 80, 24), doc.lines.length, store, doc);
    assert.equal(vp1.cursor, 4);
  });

  test("nextComment from line 4 wraps to line 2", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "first", "c1"));
    store.add(line(4, "second", "c2"));
    const doc = parse();
    const vp1 = nextComment(createViewport(0, 4, 80, 24), doc.lines.length, store, doc);
    assert.equal(vp1.cursor, 2);
  });

  test("prevComment from line 6 goes to line 4", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "first", "c1"));
    store.add(line(4, "second", "c2"));
    const doc = parse();
    const vp1 = prevComment(createViewport(0, 6, 80, 24), doc.lines.length, store, doc);
    assert.equal(vp1.cursor, 4);
  });

  test("prevComment from line 4 goes to line 2", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "first", "c1"));
    store.add(line(4, "second", "c2"));
    const doc = parse();
    const vp1 = prevComment(createViewport(0, 4, 80, 24), doc.lines.length, store, doc);
    assert.equal(vp1.cursor, 2);
  });

  test("prevComment from line 0 wraps to line 4", () => {
    const store = new CommentStore();
    store.add(heading(["title", "sub"], "first", "c1"));
    store.add(line(4, "second", "c2"));
    const doc = parse();
    const vp1 = prevComment(createViewport(0, 0, 80, 24), doc.lines.length, store, doc);
    assert.equal(vp1.cursor, 4);
  });

  test("no comments leaves viewport unchanged", () => {
    const store = new CommentStore();
    const doc = parse();
    const vp = createViewport(0, 5, 80, 24);
    assert.equal(nextComment(vp, doc.lines.length, store, doc).cursor, vp.cursor);
    assert.equal(prevComment(vp, doc.lines.length, store, doc).cursor, vp.cursor);
  });
});
