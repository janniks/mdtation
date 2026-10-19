import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import {
  createViewport,
  clampViewport,
  jumpToLine,
  moveCursor,
  pageDown,
  pageUp,
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
  // The height stays in screen rows: wrapped lines may need all of it.
  assert.deepEqual([small.offset, small.cursor, small.height], [0, 4, 10]);
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
