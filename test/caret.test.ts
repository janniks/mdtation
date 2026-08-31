import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { step, place, pin, fit } from "../src/core/caret.ts";

// Line heights: 0 hidden, 1 plain, 3 wrapped or with notes.
const rows = (l: number) => [1, 0, 3, 1, 2][l] ?? 1;
const total = 5;

describe("caret", () => {
  test("step walks rows and skips hidden lines", () => {
    let c = { line: 0, seg: 0 };
    const walk = [];
    for (let i = 0; i < 7; i++) {
      c = step(c, 1, total, rows);
      walk.push(`${c.line}.${c.seg}`);
    }
    assert.deepEqual(walk, ["2.0", "2.1", "2.2", "3.0", "4.0", "4.1", "4.1"]);
    c = step(c, -1, total, rows);
    assert.deepEqual(c, { line: 4, seg: 0 });
    c = step(step(c, -1, total, rows), -1, total, rows);
    assert.deepEqual(c, { line: 2, seg: 2 });
    assert.deepEqual(step({ line: 0, seg: 0 }, -1, total, rows), { line: 0, seg: 0 });
  });

  test("place maps screen rows through blocks", () => {
    assert.deepEqual(place(0, 0, total, rows), { line: 0, seg: 0 });
    assert.deepEqual(place(0, 2, total, rows), { line: 2, seg: 1 });
    assert.deepEqual(place(0, 4, total, rows), { line: 3, seg: 0 });
    assert.deepEqual(place(2, 3, total, rows), { line: 3, seg: 0 });
    assert.equal(place(0, 99, total, rows), null);
  });

  test("pin clamps a stale caret", () => {
    assert.deepEqual(pin({ line: 2, seg: 9 }, total, rows), { line: 2, seg: 2 });
    assert.deepEqual(pin({ line: 1, seg: 0 }, total, rows), { line: 2, seg: 0 });
    assert.deepEqual(pin({ line: 99, seg: 4 }, total, rows), { line: 4, seg: 1 });
  });

  test("fit scrolls in row steps", () => {
    const vp = { offset: 0, cursor: 0, width: 80, height: 3, margin: 0 };
    // Caret on the last row of line 2's block: rows above it (1 + 2) exceed the window.
    assert.equal(fit(vp, { line: 2, seg: 2 }, total, rows), 1);
    // Same line, first row: fits with offset 2 as well once line 0 scrolls away.
    assert.equal(fit(vp, { line: 2, seg: 0 }, total, rows), 0);
    // Scrolled past the caret: offset comes back to it.
    assert.equal(fit({ ...vp, offset: 4 }, { line: 2, seg: 0 }, total, rows), 2);
  });

  test("fit honors the margin", () => {
    const vp = { offset: 0, cursor: 0, width: 80, height: 5, margin: 1 };
    assert.equal(fit(vp, { line: 4, seg: 1 }, total, rows), 3);
  });
});
