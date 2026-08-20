import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { box, toggle } from "../src/core/edit.ts";

describe("edit", () => {
  describe("box", () => {
    test("finds boxes under every list marker", () => {
      assert.deepEqual(box("- [ ] a"), { at: 2, on: false });
      assert.deepEqual(box("* [x] a"), { at: 2, on: true });
      assert.deepEqual(box("+ [X] a"), { at: 2, on: true });
      assert.deepEqual(box("1. [ ] a"), { at: 3, on: false });
      assert.deepEqual(box("  - [ ] a"), { at: 4, on: false });
    });

    test("ignores non-boxes", () => {
      assert.equal(box("- a"), null);
      assert.equal(box("[ ] a"), null);
      assert.equal(box("- [] a"), null);
      assert.equal(box(""), null);
    });
  });

  describe("toggle", () => {
    test("flips and preserves the rest byte-for-byte", () => {
      const t = "# T\n\n- [ ] a\n- [x] b\n\ttail \n";
      assert.equal(toggle(t, 2), "# T\n\n- [x] a\n- [x] b\n\ttail \n");
      assert.equal(toggle(t, 3), "# T\n\n- [ ] a\n- [ ] b\n\ttail \n");
      assert.equal(toggle("- [X] é", 0), "- [ ] é");
    });

    test("null when no box", () => {
      assert.equal(toggle("# T\ntext", 1), null);
      assert.equal(toggle("# T", 9), null);
    });
  });
});
