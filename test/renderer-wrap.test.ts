import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { render, GUTTER_WIDTH } from "../src/core/renderer.ts";
import { createViewport } from "../src/core/viewport.ts";

const LONG = "word ".repeat(40); // 200 chars, single source line

describe("renderer width", () => {
  test("long lines word-wrap to the pane width", () => {
    const doc = parseDocument(LONG);
    // width 30 -> 28 cols -> 5 words ("word " x5 = 25, the 6th would overflow) per row -> 8 rows
    const frame = render(doc, createViewport(0, 0, 30, 24));
    assert.equal(frame.length, 8);
    assert.equal(frame[0]?.startsWith("> "), true); // cursor gutter on first row
    assert.equal(frame[1]?.startsWith("  "), true); // continuation gutter
    assert.equal(frame[0], "> word word word word word");
  });

  test("a word longer than the row still breaks by character", () => {
    const frame = render(parseDocument("x".repeat(50)), createViewport(0, 0, 30, 24));
    assert.deepEqual(frame, [`> ${"x".repeat(28)}`, `  ${"x".repeat(22)}`]);
  });

  test("short lines render as one row each", () => {
    const frame = render(parseDocument("# A\nhi"), createViewport(0, 0, 30, 24));
    assert.deepEqual(frame, ["> # A", "  hi"]);
  });

  test("word-wrap reconstructs the source line (one space per break)", () => {
    const doc = parseDocument(LONG);
    const frame = render(doc, createViewport(0, 0, 30, 24));
    const joined = frame.map((l) => l.slice(GUTTER_WIDTH)).join(" ");
    assert.equal(joined.trim(), LONG.trim());
  });
});
