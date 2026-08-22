import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import {
  createViewport,
  clampViewport,
  cursorRow,
  jumpToLine,
  moveCursor,
  pan,
  pageDown,
  pageUp,
  scroll,
  settle,
} from "../src/core/viewport.ts";

const W = 80;
const TOTAL = 100;
function vp(offset: number, cursor: number, height: number) {
  return createViewport(offset, cursor, W, height);
}

describe("viewport", () => {
  test("createViewport stores fields", () => {
    const v = vp(2, 3, 10);
    assert.equal(v.offset, 2);
    assert.equal(v.cursor, 3);
    assert.equal(v.width, W);
    assert.equal(v.height, 10);
  });

  test("moveCursor keeps the cursor on screen", () => {
    // cursor within the window: no scroll needed
    const a = moveCursor(vp(0, 0, 10), 5, TOTAL);
    assert.equal(a.cursor, 5);
    assert.equal(a.offset, 0);

    // cursor past the bottom edge scrolls the window down
    const b = moveCursor(vp(0, 9, 10), 3, TOTAL);
    assert.equal(b.cursor, 12);
    assert.equal(b.offset, 3);

    // cursor above the window pulls the offset up
    const c = moveCursor(vp(10, 12, 10), -8, TOTAL);
    assert.equal(c.cursor, 4);
    assert.equal(c.offset, 4);
  });

  test("moveCursor clamps at the document bounds", () => {
    const v = moveCursor(vp(15, 18, 5), 10, 20);
    assert.equal(v.cursor, 19);
    assert.equal(v.offset, 15);
  });

  test("scroll pans the window without moving the cursor", () => {
    const v = scroll(vp(0, 3, 10), 5, TOTAL);
    assert.equal(v.offset, 5);
    assert.equal(v.cursor, 3); // unchanged (may be off-screen)
  });

  test("scroll clamps offset at the bottom", () => {
    const v = scroll(vp(90, 3, 10), 50, TOTAL);
    assert.equal(v.offset, 90);
  });

  test("pageDown advances window and cursor by a page", () => {
    const v = pageDown(vp(0, 0, 10), TOTAL);
    assert.equal(v.cursor, 9);
    assert.equal(v.offset, 9);
  });

  test("pageUp reverses", () => {
    const v = pageUp(vp(20, 25, 10), TOTAL);
    assert.equal(v.cursor, 16);
    assert.equal(v.offset, 11);
  });

  test("jumpToLine sets cursor and scrolls on screen", () => {
    const v = jumpToLine(vp(0, 0, 10), 50, TOTAL);
    assert.equal(v.cursor, 50);
    assert.equal(v.offset, 50);
  });

  test("jumpToLine clamps to the last line", () => {
    const v = jumpToLine(vp(0, 0, 10), 999, TOTAL);
    assert.equal(v.cursor, 99);
    assert.equal(v.offset, 90);
  });

  test("cursorRow maps cursor to window row", () => {
    assert.equal(cursorRow(vp(0, 3, 10)), 3);
    assert.equal(cursorRow(vp(5, 3, 10)), -1); // off-screen (above the window)
  });

  test("clampViewport enforces bounds without forcing the cursor visible", () => {
    const v = clampViewport(vp(-5, 5, 10), TOTAL);
    assert.equal(v.offset, 0);
    assert.equal(v.cursor, 5);
  });

  test("empty document clamps to zero", () => {
    const v = moveCursor(vp(0, 0, 10), 1, 0);
    assert.equal(v.cursor, 0);
    assert.equal(v.offset, 0);
    assert.equal(v.height, 0);
  });
});

test("pan drags the cursor along the window", () => {
  const v = createViewport(0, 0, 80, 10);
  const down = pan(v, 3, 100);
  assert.deepEqual([down.offset, down.cursor], [3, 3]);
  const up = pan({ ...v, offset: 50, cursor: 59 }, -3, 100);
  assert.deepEqual([up.offset, up.cursor], [47, 56]);
  const end = pan({ ...v, offset: 85, cursor: 85 }, 10, 100);
  assert.deepEqual([end.offset, end.cursor], [90, 90]);
  assert.deepEqual(pan(v, 5, 0), createViewport(0, 0, 80, 0));
});

test("margin keeps the cursor away from the edges and pads the end", () => {
  let v = createViewport(0, 0, 80, 10, 3);
  for (let i = 0; i < 6; i++) v = moveCursor(v, 1, 100);
  assert.deepEqual([v.offset, v.cursor], [0, 6]);
  v = moveCursor(v, 1, 100);
  assert.deepEqual([v.offset, v.cursor], [1, 7]);
  v = jumpToLine(v, 99, 100);
  assert.deepEqual([v.offset, v.cursor], [93, 99]);
  v = moveCursor(v, -4, 100);
  assert.deepEqual([v.offset, v.cursor], [92, 95]);
  assert.deepEqual(jumpToLine(v, 0, 100).offset, 0);
  const small = moveCursor(createViewport(0, 0, 80, 10, 3), 4, 5);
  assert.deepEqual([small.offset, small.cursor, small.height], [0, 4, 5]);
});

test("first: lines before it are unreachable and never shown", () => {
  const v0 = { ...createViewport(0, 0, 80, 5), first: 3 };
  const c = clampViewport(v0, 20);
  assert.equal(c.offset, 3);
  assert.equal(c.cursor, 3);
  assert.equal(moveCursor(c, -1, 20).cursor, 3);
  assert.equal(jumpToLine(c, 0, 20).offset, 3);
  const tail = jumpToLine(c, 19, 20);
  assert.equal(tail.offset, 15);
});

describe("settle (row-aware margin)", () => {
  const vp = { offset: 0, cursor: 0, width: 80, height: 10, margin: 2 };
  test("hidden lines do not count toward the margin", () => {
    // lines 0..3 hidden (0 rows): cursor on 6 needs 2 visible rows above -> offset 4
    const rows = (l: number) => (l < 4 ? 0 : 1);
    assert.equal(settle({ ...vp, offset: 4, cursor: 6 }, 40, rows).offset, 4);
    assert.equal(settle({ ...vp, offset: 5, cursor: 6 }, 40, rows).offset, 4);
  });
  test("wrapped lines push the window down so the cursor plus margin fits", () => {
    // offset 0..cursor 7: rows 0-4 (5) + line5 (4) + 6,7 (2) = 11 > 10 even before the margin
    assert.equal(settle({ ...vp, cursor: 7 }, 40, (l) => (l === 5 ? 4 : 1)).offset, 3);
  });
  test("plain lines leave a line-correct viewport alone", () => {
    const v = { ...vp, offset: 3, cursor: 7 };
    assert.deepEqual(
      settle(v, 40, () => 1),
      v,
    );
  });
});
