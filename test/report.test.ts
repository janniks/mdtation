import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore } from "../src/core/comment.ts";
import { report } from "../src/core/report.ts";

// 0:Title 1:blank 2:text
const doc = parseDocument("# Title\n\ntext\n");
const store = CommentStore.fromJSON([
  { id: "a", anchor: { kind: "heading", slug: ["title"] }, text: "fix", createdAt: 0 },
  { id: "b", anchor: { kind: "line", n: 2 }, text: "old", createdAt: 1000, archived: true },
  { id: "c", anchor: { kind: "line", n: 99 }, text: "gone", createdAt: 0 },
]);

describe("report", () => {
  test("title, copyFormat block, provenance line; live only by default", () => {
    const out = report(store, doc, "/x/doc.md");
    assert.equal(
      out,
      [
        "# Comments — doc.md",
        "<!-- mdtation comment on `# Title` (line 0) -->\n> fix\n<!-- id a · 1970-01-01T00:00:00.000Z · /x/doc.md:1 -->",
        "<!-- mdtation comment on line 99 -->\n> gone\n<!-- id c · 1970-01-01T00:00:00.000Z · /x/doc.md:? -->",
      ].join("\n\n") + "\n",
    );
  });

  test("archived: true includes and marks archived comments", () => {
    const out = report(store, doc, "/x/doc.md", { archived: true });
    assert.ok(
      out.includes("> old\n<!-- id b · 1970-01-01T00:00:01.000Z · /x/doc.md:3 · archived -->"),
    );
  });

  test("empty store -> title only", () => {
    assert.equal(report(new CommentStore(), doc, "/x/doc.md"), "# Comments — doc.md\n");
  });
});
