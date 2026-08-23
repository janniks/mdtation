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

  test("replies nest under their parent with an author prefix", () => {
    const s = CommentStore.fromJSON([
      { id: "a", anchor: { kind: "line", n: 2 }, text: "why?", createdAt: 0 },
      {
        id: "b",
        anchor: { kind: "line", n: 2 },
        text: "because",
        createdAt: 1,
        author: "claude",
        agent: true,
        re: "a",
      },
      { id: "c", anchor: { kind: "line", n: 2 }, text: "ok\nthen", createdAt: 2, re: "a" },
    ]);
    assert.equal(
      report(s.live(), doc, "/x/doc.md"),
      "# Comments — doc.md\n\nLine 3\n> why?\n  > claude: because\n  > ok\n  > then\n",
    );
  });

  test("empty store -> title only", () => {
    assert.equal(report([], doc, "/x/doc.md"), "# Comments — doc.md\n");
  });
});
