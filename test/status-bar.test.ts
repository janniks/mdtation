import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { statusBar } from "../src/core/renderer.ts";
import { createViewport } from "../src/core/viewport.ts";

const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const GRAY = "\x1b[90m";
const RST = "\x1b[0m";

describe("statusBar", () => {
  test("plain: cursor line / total / comment count", () => {
    const doc = parseDocument("a\nb\nc"); // 3 lines, no trailing newline
    assert.equal(statusBar(doc, createViewport(0, 0, 80, 24)), "Ln 1/3 · 0 comments");
    assert.equal(statusBar(doc, createViewport(0, 2, 80, 24)), "Ln 3/3 · 0 comments");
  });

  test("comment count singular vs plural", () => {
    const doc = parseDocument("a\nb\nc");
    assert.equal(
      statusBar(doc, createViewport(0, 0, 80, 24), { markers: [0] }),
      "Ln 1/3 · 1 comment",
    );
    assert.equal(
      statusBar(doc, createViewport(0, 0, 80, 24), { markers: [0, 2] }),
      "Ln 1/3 · 2 comments",
    );
  });

  test("cursor clamps within the document", () => {
    const doc = parseDocument("a"); // 1 line
    assert.equal(statusBar(doc, createViewport(0, 99, 80, 24)), "Ln 1/1 · 0 comments");
  });

  test("color mode wraps label / number / mode", () => {
    const doc = parseDocument("a\nb\nc");
    const bar = statusBar(doc, createViewport(0, 2, 80, 24), { markers: [1], color: true });
    assert.equal(bar.includes(`${DIM}Ln${RST}`), true); // dim label
    assert.equal(bar.includes(`${GREEN}3/3${RST}`), true); // green cursor/total
    assert.equal(bar.includes(`${GREEN}1${RST}`), true); // green count
    assert.equal(bar.includes(`${GRAY}view${RST}`), true); // gray mode
    assert.equal(bar.includes("comment"), true);
  });
});
