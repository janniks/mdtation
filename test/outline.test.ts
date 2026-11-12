import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { score } from "../src/core/fuzzy.ts";
import { near, rows } from "../src/core/outline.ts";

describe("fuzzy", () => {
  test("letters match in order, not side by side, any case", () => {
    assert.deepEqual(score("opq", "Open questions")?.at, [0, 1, 5]);
    assert.deepEqual(score("OQ", "open questions")?.at, [0, 5]);
    assert.equal(score("qp", "Open questions"), null);
    assert.equal(score("x", "Open"), null);
  });
  test("an empty query matches everything", () => {
    assert.deepEqual(score(" ", "Why"), { score: 0, at: [] });
  });
  test("letters in a row beat letters apart", () => {
    assert.ok(score("test", "Tests")!.score > score("test", "The estimate")!.score);
  });
  test("a word start beats the middle of a word", () => {
    assert.ok(score("q", "Open questions")!.score > score("q", "Sequence")!.score);
    assert.deepEqual(score("oq", "Soon open questions")?.at, [5, 10]);
  });
  test("an early match and a short text win ties", () => {
    assert.ok(score("why", "Why")!.score > score("why", "Why not")!.score);
    assert.ok(score("why", "Why not")!.score > score("why", "So why")!.score);
  });
});

describe("outline", () => {
  const doc = parseDocument(
    [
      "intro",
      "## API",
      "### Auth",
      "```",
      "# not a heading",
      "```",
      "### Limits",
      "## Tests",
      "x",
    ].join("\n"),
  );
  test("empty query: file order, indent by level, line hints, fenced # left out", () => {
    assert.deepEqual(
      rows(doc).map((c) => [c.id, c.title, c.keys[0]]),
      [
        ["at:1", "API", "2"],
        ["at:2", "  Auth", "3"],
        ["at:6", "  Limits", "7"],
        ["at:7", "Tests", "8"],
      ],
    );
  });
  test("a query ranks best first, without indent, with marks", () => {
    const hits = rows(doc, "t");
    assert.deepEqual(
      hits.map((c) => c.title),
      ["Tests", "Auth", "Limits"],
    );
    assert.deepEqual(hits[0]!.marks, [0]);
  });
  test("the parent path counts, under matches in the heading itself", () => {
    const hits = rows(doc, "api auth");
    assert.deepEqual(
      hits.map((c) => c.id),
      ["at:2"],
    );
    assert.deepEqual(hits[0]!.marks, [0, 1, 2, 3]);
    assert.deepEqual(
      rows(doc, "a").map((c) => c.title),
      ["API", "Auth", "Limits"],
    );
  });
  test("near: the section the line is in", () => {
    assert.equal(near(doc, 0), 0);
    assert.equal(near(doc, 2), 1);
    assert.equal(near(doc, 5), 1);
    assert.equal(near(doc, 8), 3);
  });
});
