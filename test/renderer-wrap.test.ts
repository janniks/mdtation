import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { render, GUTTER_WIDTH } from "../src/core/renderer.ts";
import { createViewport } from "../src/core/viewport.ts";

const LONG = "word ".repeat(40); // 200 chars, single source line

describe("renderer width", () => {
  test("long lines hard-wrap to the pane width", () => {
    const doc = parseDocument(LONG);
    // width 30 -> colWidth 28 -> ceil(200 / 28) = 8 rows
    const frame = render(doc, createViewport(0, 0, 30, 24));
    assert.equal(frame.length, 8);
    assert.equal(frame[0]?.startsWith("> "), true); // cursor gutter on first row
    assert.equal(frame[1]?.startsWith("  "), true); // continuation gutter
    assert.equal((frame[0] ?? "").length, 30); // gutter(2) + 28 cols
  });

  test("short lines render as one row each", () => {
    const frame = render(parseDocument("# A\nhi"), createViewport(0, 0, 30, 24));
    assert.deepEqual(frame, ["> # A", "  hi"]);
  });

  test("hard-wrap reconstructs the source line", () => {
    const doc = parseDocument(LONG);
    const frame = render(doc, createViewport(0, 0, 30, 24));
    const joined = frame.map((l) => l.slice(GUTTER_WIDTH)).join("");
    assert.equal(joined, LONG);
  });
});
