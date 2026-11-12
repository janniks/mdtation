import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { step, place, pin, fit, hold } from "../src/core/caret.ts";

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

  test("fit only measures rows near the window", () => {
    let n = 0;
    const count = () => (n++, 1);
    const vp = { offset: 1480, cursor: 1500, width: 80, height: 40, margin: 3 };
    assert.deepEqual(fit(vp, { line: 1500, seg: 0 }, 2000, count), { line: 1480, seg: 0 });
    assert.ok(n < 200, `rows called ${n} times`);
  });

  test("pin climbs when every line below is hidden", () => {
    const hid = (l: number) => [0, 1, 0, 0][l] ?? 0;
    assert.deepEqual(pin({ line: 2, seg: 0 }, 4, hid), { line: 1, seg: 0 });
  });

  test("fit keeps a short document at the top", () => {
    const vp = { offset: 0, cursor: 0, width: 80, height: 20, margin: 3 };
    assert.deepEqual(fit(vp, { line: 4, seg: 1 }, total, rows), { line: 0, seg: 0 });
  });
});

describe("hold", () => {
  // 30 plain lines, except line 4 which takes 3 rows.
  const tall = (l: number) => (l === 4 ? 3 : 1);
  const vp = { offset: 0, cursor: 10, width: 80, height: 10, margin: 3 };

  test("the top takes up rows added or removed above the cursor line", () => {
    assert.deepEqual(
      hold(vp, { line: 10, seg: 0 }, 5, 30, () => 1),
      { line: 5, seg: 0 },
    );
    // Line 4's extra rows sit above: the top lands mid-block.
    assert.deepEqual(hold(vp, { line: 6, seg: 0 }, 3, 30, tall), { line: 4, seg: 1 });
  });

  test("too few rows above leave blank rows instead of moving the line", () => {
    assert.deepEqual(
      hold(vp, { line: 2, seg: 0 }, 5, 30, () => 1),
      { line: 0, seg: -3 },
    );
    assert.deepEqual(
      hold({ ...vp, first: 1 }, { line: 2, seg: 0 }, 5, 30, () => 1),
      {
        line: 1,
        seg: -4,
      },
    );
  });

  test("a row past the window puts the caret on the last row", () => {
    assert.deepEqual(
      hold(vp, { line: 20, seg: 0 }, 40, 30, () => 1),
      { line: 11, seg: 0 },
    );
  });

  test("a line that started above the window keeps the caret visible", () => {
    assert.deepEqual(hold(vp, { line: 4, seg: 0 }, -2, 30, tall), { line: 4, seg: 0 });
  });
});

describe("fit after a move from a known row", () => {
  const one = () => 1;
  const vp = { offset: 0, cursor: 0, width: 80, height: 10, margin: 3 };

  test("blank rows below the end are not refilled, and shrink only as the top steps up", () => {
    // 12 lines, top on 8: rows 4..9 are blank.
    const low = { ...vp, offset: 8 };
    assert.deepEqual(fit(low, { line: 10, seg: 0 }, 12, one, 2), { line: 8, seg: 0 });
    assert.deepEqual(fit(low, { line: 11, seg: 0 }, 12, one, 2), { line: 8, seg: 0 });
    assert.deepEqual(fit(low, { line: 7, seg: 0 }, 12, one, 0), { line: 7, seg: 0 });
    // A jump (no row) fills the window again.
    assert.deepEqual(fit(low, { line: 10, seg: 0 }, 12, one), { line: 2, seg: 0 });
  });

  test("blank rows above the first line shrink on the way down and never come back", () => {
    const lead = { ...vp, skip: -4 };
    assert.deepEqual(fit(lead, { line: 2, seg: 0 }, 30, one, 5), { line: 0, seg: -4 });
    assert.deepEqual(fit(lead, { line: 4, seg: 0 }, 30, one, 7), { line: 0, seg: -3 });
    assert.deepEqual(fit({ ...vp, skip: -2 }, { line: 0, seg: 0 }, 30, one, 3), {
      line: 0,
      seg: -2,
    });
    assert.deepEqual(fit(lead, { line: 3, seg: 0 }, 30, one), { line: 0, seg: 0 });
  });

  test("a caret inside the margin scrolls row by row instead of hopping", () => {
    const mid = { ...vp, offset: 10 };
    // From row 1, one step up: the top follows by one row, not by the margin.
    assert.deepEqual(fit(mid, { line: 10, seg: 0 }, 30, one, 1), { line: 9, seg: 0 });
    // From inside the band the full margin holds, as before.
    assert.deepEqual(fit(mid, { line: 12, seg: 0 }, 30, one, 3), { line: 9, seg: 0 });
  });

  test("place maps rows in the blank lead to the first row", () => {
    assert.deepEqual(place({ line: 0, seg: -3 }, 1, 30, one), { line: 0, seg: 0 });
    assert.deepEqual(place({ line: 0, seg: -3 }, 4, 30, one), { line: 1, seg: 0 });
  });
});
