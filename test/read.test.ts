import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore } from "../src/core/comment.ts";
import { json, read } from "../src/core/read.ts";

const doc = parseDocument("# T\n\nbody\n");
const store = CommentStore.fromJSON([
  { id: "a", anchor: { kind: "line", n: 2 }, text: "why?", createdAt: 1000 },
  {
    id: "b",
    anchor: { kind: "line", n: 2 },
    text: "because\nso",
    createdAt: 2000,
    author: "claude",
    agent: true,
    re: "a",
  },
]);

test("read inlines one tag per comment under its line; source lines stay verbatim", () => {
  const out = read(store.live(), store, doc, "you");
  assert.equal(
    out,
    "# T\n\nbody\n<c id=a by=you at=1970-01-01T00:00:01.000Z>why?</c>\n<c id=b by=claude re=a at=1970-01-01T00:00:02.000Z>because\n  so</c>\n\n",
  );
  assert.equal(
    out
      .split("\n")
      .filter((l) => !l.startsWith("<c ") && !l.startsWith("  so"))
      .join("\n"),
    "# T\n\nbody\n\n",
  );
});

test("json: compact lines array plus comments pointing at 1-based lines", () => {
  const out = json(store.live(), store, doc, "/x.md", "you");
  assert.deepEqual(out.lines, ["# T", "", "body", ""]);
  assert.equal(out.comments.length, 2);
  assert.deepEqual(out.comments[0], {
    line: 3,
    id: "a",
    by: "you",
    at: "1970-01-01T00:00:01.000Z",
    text: "why?",
  });
});
