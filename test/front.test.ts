import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { end, field, front, set } from "../src/core/front.ts";

const doc = '---\ntitle: Hi\nurl: https://x\nempty:\ntags:\n  - a\nq: "v"\n---\n# T\n';
const lines = doc.split("\n");

describe("front", () => {
  test("no block", () => {
    assert.deepEqual(front(["# T", "a: b"]), []);
    assert.equal(end(["# T"]), -1);
    assert.equal(end([]), -1);
  });

  test("unclosed block", () => {
    assert.deepEqual(front(["---", "a: b", "# T"]), []);
    assert.equal(end(["---", "a: b"]), -1);
  });

  test("closes with ... too", () => {
    assert.deepEqual(front(["---", "a: b", "..."]), [{ line: 1, key: "a", value: "b" }]);
    assert.equal(end(["---", "a: b", "..."]), 2);
  });

  test("flat fields only, colons and quotes kept", () => {
    assert.equal(end(lines), 7);
    assert.deepEqual(front(lines), [
      { line: 1, key: "title", value: "Hi" },
      { line: 2, key: "url", value: "https://x" },
      { line: 3, key: "empty", value: "" },
      { line: 4, key: "tags", value: "" },
      { line: 6, key: "q", value: '"v"' },
    ]);
  });

  test("field by line", () => {
    assert.deepEqual(field(lines, 2), { line: 2, key: "url", value: "https://x" });
    assert.equal(field(lines, 5), null);
    assert.equal(field(lines, 8), null);
    assert.equal(field(lines, 0), null);
  });

  test("set roundtrip", () => {
    const next = set(doc, 1, "Bye")!;
    assert.equal(next, doc.replace("title: Hi", "title: Bye"));
    assert.equal(field(next.split("\n"), 1)!.value, "Bye");
    assert.equal(set(next, 1, "Hi"), doc);
    assert.equal(set(doc, 3, "x"), doc.replace("empty:", "empty: x"));
  });

  test("set on a non-field is null", () => {
    assert.equal(set(doc, 0, "x"), null);
    assert.equal(set(doc, 5, "x"), null);
    assert.equal(set(doc, 8, "x"), null);
    assert.equal(set("# T\na: b", 1, "x"), null);
  });
});
