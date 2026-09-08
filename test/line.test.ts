import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "../src/core/line.ts";

test("source line numbers are trimmed, zero-based, and clamped", () => {
  for (const [text, line] of [
    ["1", 0],
    ["3", 2],
    ["003", 2],
    [" 3 ", 2],
    ["\t3\n", 2],
    ["0", 0],
    ["000", 0],
    ["5", 4],
    ["999", 4],
    ["9".repeat(400), 4],
  ] as const) {
    assert.equal(parse(text, 5), line, JSON.stringify(text));
  }
  assert.equal(parse("999", 1), 0);
});

test("only decimal digits are accepted", () => {
  for (const text of [
    "",
    "   ",
    "abc",
    "3x",
    "x3",
    "+3",
    "-3",
    "3.0",
    "1.5",
    "1e2",
    "1E2",
    "0x3",
    "3 0",
    "3\n0",
    "３",
  ]) {
    assert.equal(parse(text, 5), undefined, JSON.stringify(text));
  }
});
