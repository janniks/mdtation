import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { render } from "../src/core/renderer.ts";
import { createViewport } from "../src/core/viewport.ts";

const CYAN = "\x1b[36m";
const RST = "\x1b[0m";
const ITALIC = "\x1b[3m";

describe("renderer lists", () => {
  test("bullet/number markers colored cyan in color mode", () => {
    const doc = parseDocument("- top\n  - nested\n  1. ordered\n");
    const frame = render(doc, createViewport(0, 0, 80, 24), { color: true });
    assert.equal(frame[0]?.includes(`${CYAN}-${RST} top`), true);
    assert.equal(frame[1]?.includes(`${CYAN}  -${RST} nested`), true);
    assert.equal(frame[2]?.includes(`${CYAN}  1.${RST} ordered`), true);
  });

  test("list lines stay plain when color is off (golden-safe)", () => {
    const doc = parseDocument("- top\n  - nested\n");
    const frame = render(doc, createViewport(0, 0, 80, 24));
    assert.equal(frame[0], "> - top");
    assert.equal(frame[1], "    - nested");
  });

  test("non-list lines fall through to inline styling", () => {
    const doc = parseDocument("just text *italic* here\n");
    const frame = render(doc, createViewport(0, 0, 80, 24), { color: true });
    assert.equal(frame[0]?.includes(`${ITALIC}italic${RST}`), true);
  });
});
