import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { colWidth, displayWidth, wrapLine, wrapWords } from "../src/core/unicode.ts";

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

  describe("wrapWords", () => {
    test("breaks between words, never inside one", () => {
      assert.deepEqual(wrapWords("aaa bbb ccc", 7), ["aaa bbb", "ccc"]);
    });
    test("a newline starts a new row", () => {
      assert.deepEqual(wrapWords("aa\nbb", 10), ["aa", "bb"]);
    });
    test("a word wider than the row is chopped so nothing overflows", () => {
      assert.deepEqual(wrapWords("abcdefgh", 3), ["abc", "def", "gh"]);
    });
    test("empty input is a single empty row", () => {
      assert.deepEqual(wrapWords("", 5), [""]);
    });
    test("a wide word is chopped by columns, not code units", () => {
      const rows = wrapWords("漢字漢", 3);
      assert.deepEqual(rows, ["漢", "字", "漢"]);
      assert.ok(rows.every((r) => displayWidth(r) <= 3));
    });
    test("a surrogate pair is never split", () => {
      assert.deepEqual(wrapWords("👍👍", 1), ["👍", "👍"]);
      const rows = wrapWords("👍👍", 2);
      assert.deepEqual(rows, ["👍", "👍"]);
      assert.ok(rows.every((r) => displayWidth(r) <= 2));
    });
    test("a short word joins the last piece of a chopped word", () => {
      assert.deepEqual(wrapWords("漢字漢 a", 5), ["漢字", "漢 a"]);
    });
    test("a row of several wide words breaks by columns", () => {
      assert.deepEqual(wrapWords("漢字 漢字 漢字 ab", 9), ["漢字 漢字", "漢字 ab"]);
    });
  });
});
