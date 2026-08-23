import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore } from "../src/core/comment.ts";
import { report } from "../src/core/report.ts";

// 0:Title 1:blank 2:text
const doc = parseDocument("# Title\n\ntext\n");
const store = CommentStore.fromJSON([
  { id: "a", anchor: { kind: "heading", slug: ["title"] }, text: "fix", createdAt: 0 },
  { id: "b", anchor: { kind: "line", n: 2 }, text: "old", createdAt: 1000, archivedAt: 1000 },
  { id: "c", anchor: { kind: "line", n: 99 }, text: "gone", createdAt: 0 },
]);

describe("report", () => {
  test("title, copyFormat block per comment; live only by default", () => {
    const out = report(store.live(), doc, "/x/doc.md");
    assert.equal(
      out,
      ["# Comments — doc.md", "Line 1\n> fix", "Line ?\n> gone"].join("\n\n") + "\n",
    );
  });

  test("archived: true includes and marks archived comments", () => {
    const out = report(store.all(), doc, "/x/doc.md", { archived: true });
    assert.ok(out.includes("Line 3\n> old\nid b  archived"));
  });

  test("empty store -> title only", () => {
    assert.equal(report([], doc, "/x/doc.md"), "# Comments — doc.md\n");
  });
});
