import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore, copyFormat, resolveAnchor, type Comment } from "../src/core/comment.ts";

// 0 "# Title",1 "",2 "## Sub",3 "",4 "text",5 "",6 "### Deep",7 ""
const md = "# Title\n\n## Sub\n\ntext\n\n### Deep\n";

function doc() {
  return parseDocument(md);
}

function heading(slug: string[], text: string, id = "c1"): Comment {
  return { id, anchor: { kind: "heading", slug }, text, createdAt: 0 };
}
function line(n: number, text: string, id = "c2"): Comment {
  return { id, anchor: { kind: "line", n }, text, createdAt: 0 };
}

describe("CommentStore", () => {
  test("add/remove/get/all", () => {
    const s = new CommentStore();
    const c = heading(["title", "sub"], "note");
    s.add(c);
    assert.equal(s.get("c1"), c);
    assert.equal(s.all().length, 1);
    assert.equal(s.remove("c1"), true);
    assert.equal(s.all().length, 0);
    assert.equal(s.remove("c1"), false);
  });

  test("archive/restore flag without removing; live/byAnchor skip archived; JSON keeps flag", () => {
    const s = new CommentStore();
    s.add(heading(["title"], "note"));
    assert.equal(s.archive("c1"), true);
    assert.equal(s.archive("nope"), false);
    assert.equal(s.all().length, 1);
    assert.equal(s.live().length, 0);
    assert.equal(s.byAnchor({ kind: "heading", slug: ["title"] }).length, 0);
    assert.ok(CommentStore.fromJSON(s.toJSON()).get("c1")?.archivedAt);
    assert.equal(s.restore("c1"), true);
    assert.equal(s.live().length, 1);
  });

  test("sweep drops comments archived longer than ttl; restore clears the stamp", () => {
    const s = CommentStore.fromJSON(["c1", "c2", "c3"].map((id) => heading(["title"], id, id)));
    s.archive("c1", 1000);
    s.archive("c2", 5000);
    assert.equal(s.sweep(3000, 6000), 1);
    assert.deepEqual(
      s.all().map((c) => c.id),
      ["c2", "c3"],
    );
    assert.equal(s.sweep(Infinity, 1e12), 0);
    s.restore("c2");
    assert.equal("archivedAt" in s.get("c2")!, false);
  });

  test("byAnchor distinguishes heading vs line and path", () => {
    const s = new CommentStore();
    s.add(heading(["title", "sub"], "a", "h1"));
    s.add(line(4, "b", "l1"));
    s.add(heading(["title"], "c", "h2"));
    assert.equal(s.byAnchor({ kind: "heading", slug: ["title", "sub"] }).length, 1);
    assert.equal(s.byAnchor({ kind: "line", n: 4 }).length, 1);
    assert.equal(s.byAnchor({ kind: "heading", slug: ["title"] }).length, 1);
    // distinct path
    assert.equal(s.byAnchor({ kind: "heading", slug: ["nope"] }).length, 0);
  });

  test("fromJSON/toJSON round-trips", () => {
    const s = new CommentStore();
    s.add(heading(["title", "sub"], "hello", "x"));
    const out = CommentStore.fromJSON(s.toJSON());
    assert.equal(out.get("x")?.text, "hello");
    assert.equal(out.all().length, 1);
  });
});

describe("resolveAnchor", () => {
  test("heading anchor resolves to the heading's line", () => {
    assert.deepEqual(resolveAnchor({ kind: "heading", slug: ["title", "sub"] }, doc()), {
      startLine: 2,
      endLine: 2,
    });
  });

  test("unknown heading slug yields null", () => {
    assert.equal(resolveAnchor({ kind: "heading", slug: ["nope"] }, doc()), null);
  });

  test("line anchor resolves 1:1", () => {
    assert.deepEqual(resolveAnchor({ kind: "line", n: 4 }, doc()), {
      startLine: 4,
      endLine: 4,
    });
  });

  test("line anchor out of range yields null", () => {
    assert.equal(resolveAnchor({ kind: "line", n: 99 }, doc()), null);
    assert.equal(resolveAnchor({ kind: "line", n: -1 }, doc()), null);
  });

  test("re-anchors after the heading moves in a new document", () => {
    // doc2 has `## Sub` shifted from line 2 to line 4.
    const doc2 = parseDocument("# Title\n\nx\n\n## Sub\n\n### Deep\n");
    assert.deepEqual(resolveAnchor({ kind: "heading", slug: ["title", "sub"] }, doc2), {
      startLine: 4,
      endLine: 4,
    });
  });
});

describe("copyFormat", () => {
  test("compact: line number (1-based) and the quoted note", () => {
    assert.equal(copyFormat(heading(["title", "sub"], "fix"), doc()), "Line 3\n> fix");
    assert.equal(copyFormat(line(4, "todo"), doc()), "Line 5\n> todo");
  });

  test("multi-line notes quote every line", () => {
    assert.equal(copyFormat(line(4, "a\nb"), doc()), "Line 5\n> a\n> b");
  });

  test("detail: crumb and indented preview of the line", () => {
    assert.equal(
      copyFormat(line(4, "todo"), doc(), "detailed"),
      "Line 5  Title / Sub\n    text\n> todo",
    );
  });

  test("detail clips crumb segments and the preview", () => {
    const long = parseDocument(`# ${"h".repeat(40)}\n\n${"x".repeat(100)}\n`);
    const out = copyFormat(line(2, "n"), long, "detailed");
    assert.equal(out.split("\n")[0], `Line 3  ${"h".repeat(23)}…`);
    assert.equal(out.split("\n")[1], `    ${"x".repeat(79)}…`);
  });

  test("detail skips the preview on a blank line", () => {
    assert.equal(copyFormat(line(3, "n"), doc(), "detailed"), "Line 4  Title / Sub\n> n");
  });

  test("a selection is carried in full, in both modes, instead of the line preview", () => {
    const c = { ...line(4, "n"), quote: "te\nxt" };
    assert.equal(copyFormat(c, doc()), "Line 5\n    te\n    xt\n> n");
    assert.equal(copyFormat(c, doc(), "detailed"), "Line 5  Title / Sub\n    te\n    xt\n> n");
  });

  test("unknown anchor: unresolved line, no detail", () => {
    assert.equal(copyFormat(heading(["missing"], "x"), doc(), "detailed"), "Line ?\n> x");
  });
});
