import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { colWidth, wrapLine } from "../src/core/unicode.ts";

describe("unicode", () => {
  describe("colWidth", () => {
    test("ASCII is 1 column", () => {
      for (const ch of "abc123 !?") assert.equal(colWidth(ch), 1, ch);
    });
    test("CJK is 2 columns", () => {
      for (const ch of "你好世界") assert.equal(colWidth(ch), 2, ch);
    });
    test("emoji (surrogate pair) is 2 columns", () => {
      assert.equal(colWidth("🧑"), 2);
      assert.equal(colWidth("🤝"), 2);
      assert.equal(colWidth("🎉"), 2);
    });
    test("ZWJ and combining marks and VS are 0 columns", () => {
      assert.equal(colWidth("\u200d"), 0); // ZWJ
      assert.equal(colWidth("\u0301"), 0); // combining acute
      assert.equal(colWidth("\ufe0f"), 0); // variation selector
    });
    test("fullwidth latin is 2 columns", () => {
      assert.equal(colWidth("Ａ"), 2); // U+FF21
    });
  });

  describe("wrapLine", () => {
    test("short text returns whole (one row)", () => {
      assert.deepEqual(wrapLine("hello", 80), ["hello"]);
      assert.deepEqual(wrapLine("", 80), [""]);
    });
    test("width <= 0 returns text whole", () => {
      assert.deepEqual(wrapLine("hello", 0), ["hello"]);
      assert.deepEqual(wrapLine("hello", -3), ["hello"]);
    });
    test("ASCII wraps at width", () => {
      assert.deepEqual(wrapLine("abcdefghij", 4), ["abcd", "efgh", "ij"]);
    });
    test("wide chars wrap on column count (2 per char)", () => {
      assert.deepEqual(wrapLine("abcd你好", 4), ["abcd", "你好"]);
    });
    test("wraps on code-point boundaries (no split surrogate)", () => {
      const family = "🧑\u200d🤝\u200d🧑"; // ZWJ sequence, 6 cols
      const out = wrapLine(family.repeat(10), 6);
      assert.equal(out.length, 10);
      for (const chunk of out) {
        assert.doesNotThrow(() => new TextEncoder().encode(chunk));
        assert.equal(chunk, family);
      }
    });
    test("a single wide char wider than width stays whole", () => {
      const out = wrapLine("你", 1);
      assert.equal(out.length, 1);
      assert.equal(out[0], "你");
    });
    test("empty input is a single empty row", () => {
      assert.deepEqual(wrapLine("", 5), [""]);
    });
    test("grapheme cluster with VS stays on one row when it fits", () => {
      const thumbs = "👍\ufe0f"; // thumbs up + VS16
      const out = wrapLine(thumbs.repeat(3), 6);
      assert.equal(out.length, 1); // 3 thumbs (6 cols) fit exactly at width 6
    });
  });
});
