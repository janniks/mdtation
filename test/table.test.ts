import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { align, cell } from "../src/core/table.ts";

const doc = [
  "# T",
  "",
  "| a | bb | c |",
  "|---|:--:|--|",
  "| 日本 | 🙂 | x |",
  "| 1 | 2 | 3 |",
  "",
  "tail | not",
];
// Aligned: "| a    | bb   | c  |"
//          "| 日本 | 🙂   | x  |"

describe("table", () => {
  describe("cell", () => {
    test("hits header and body cells by display column", () => {
      assert.deepEqual(cell(doc, 2, 2), { row: 2, col: 0, sep: 3 });
      assert.deepEqual(cell(doc, 2, 0), { row: 2, col: 0, sep: 3 });
      assert.deepEqual(cell(doc, 2, 8), { row: 2, col: 1, sep: 3 });
      assert.deepEqual(cell(doc, 2, 14), { row: 2, col: 2, sep: 3 });
      assert.deepEqual(cell(doc, 5, 7), { row: 5, col: 1, sep: 3 });
    });

    test("measures CJK and emoji cells by display width", () => {
      assert.deepEqual(cell(doc, 4, 5), { row: 4, col: 0, sep: 3 });
      assert.deepEqual(cell(doc, 4, 7), { row: 4, col: 1, sep: 3 });
      assert.deepEqual(cell(doc, 4, 9), { row: 4, col: 1, sep: 3 });
      assert.deepEqual(cell(doc, 4, 13), { row: 4, col: 1, sep: 3 });
      assert.deepEqual(cell(doc, 4, 15), { row: 4, col: 2, sep: 3 });
    });

    test("clamps past the right edge and on the separator row", () => {
      assert.deepEqual(cell(doc, 2, 99), { row: 2, col: 2, sep: 3 });
      assert.deepEqual(cell(doc, 3, 0), { row: 3, col: 0, sep: 3 });
    });

    test("misses outside tables", () => {
      assert.equal(cell(doc, 0, 0), null);
      assert.equal(cell(doc, 7, 0), null);
      assert.equal(cell(doc, 42, 0), null);
      assert.equal(cell(["| a | b |", "| 1 | 2 |"], 0, 0), null);
    });
  });

  describe("align", () => {
    test("cycles all four states and wraps", () => {
      const t = "| a | b |\n| --- | --- |\n| 1 | 2 |";
      const l = align(t, 1, 0)!;
      assert.equal(l, "| a | b |\n| :--- | --- |\n| 1 | 2 |");
      const c = align(l, 1, 0)!;
      assert.equal(c, "| a | b |\n| :---: | --- |\n| 1 | 2 |");
      const r = align(c, 1, 0)!;
      assert.equal(r, "| a | b |\n| ---: | --- |\n| 1 | 2 |");
      assert.equal(align(r, 1, 0), t);
    });

    test("preserves dash count, spacing and other columns", () => {
      assert.equal(align("a|b\n-----|:-:", 1, 1), "a|b\n-----|-:");
      assert.equal(align("a | b\n|  ---- |---|", 1, 0), "a | b\n|  :---- |---|");
    });

    test("returns null off separators and out of range", () => {
      assert.equal(align("| a | b |\n| --- | --- |", 0, 0), null);
      assert.equal(align("| a | b |\n| --- | --- |", 1, 2), null);
      assert.equal(align("| a | b |\n| --- | --- |", 1, -1), null);
      assert.equal(align("| a | b |\n| --- | --- |", 5, 0), null);
    });
  });
});
