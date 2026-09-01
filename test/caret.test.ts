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
    const top = { line: 0, seg: 0 };
    assert.deepEqual(place(top, 0, total, rows), { line: 0, seg: 0 });
    assert.deepEqual(place(top, 2, total, rows), { line: 2, seg: 1 });
    assert.deepEqual(place(top, 4, total, rows), { line: 3, seg: 0 });
    assert.deepEqual(place({ line: 2, seg: 0 }, 3, total, rows), { line: 3, seg: 0 });
    assert.equal(place(top, 99, total, rows), null);
  });

  test("place counts from a top that starts mid-block", () => {
    assert.deepEqual(place({ line: 2, seg: 2 }, 0, total, rows), { line: 2, seg: 2 });
    assert.deepEqual(place({ line: 2, seg: 2 }, 1, total, rows), { line: 3, seg: 0 });
  });

  test("pin clamps a stale caret", () => {
    assert.deepEqual(pin({ line: 2, seg: 9 }, total, rows), { line: 2, seg: 2 });
    assert.deepEqual(pin({ line: 1, seg: 0 }, total, rows), { line: 2, seg: 0 });
    assert.deepEqual(pin({ line: 99, seg: 4 }, total, rows), { line: 4, seg: 1 });
  });

  test("fit scrolls in row steps", () => {
    const vp = { offset: 0, cursor: 0, width: 80, height: 3, margin: 0 };
    // Caret on the last row of line 2's block: the top lands mid-block, not on a line edge.
    assert.deepEqual(fit(vp, { line: 2, seg: 2 }, total, rows), { line: 2, seg: 0 });
    // Same line, first row: it already fits below line 0.
    assert.deepEqual(fit(vp, { line: 2, seg: 0 }, total, rows), { line: 0, seg: 0 });
    // Scrolled past the caret: the top comes back to it.
    assert.deepEqual(fit({ ...vp, offset: 4 }, { line: 2, seg: 0 }, total, rows), {
      line: 2,
      seg: 0,
    });
  });

  test("fit honors the margin", () => {
    const vp = { offset: 0, cursor: 0, width: 80, height: 5, margin: 1 };
    assert.deepEqual(fit(vp, { line: 4, seg: 1 }, total, rows), { line: 2, seg: 1 });
  });

  test("fit pulls back off the end so no blank rows show", () => {
    // 7 rendered rows in all; a window of 5 must always start on row 2.
    const vp = { offset: 4, skip: 1, cursor: 4, width: 80, height: 5, margin: 0 };
    assert.deepEqual(fit(vp, { line: 4, seg: 1 }, total, rows), { line: 2, seg: 1 });
  });

  test("fit keeps a short document at the top", () => {
    const vp = { offset: 0, cursor: 0, width: 80, height: 20, margin: 3 };
    assert.deepEqual(fit(vp, { line: 4, seg: 1 }, total, rows), { line: 0, seg: 0 });
  });
});
