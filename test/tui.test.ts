import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { createViewport } from "../src/core/viewport.ts";
import { moveCursor, pageDown, pageUp, jumpToLine } from "../src/core/viewport.ts";
import { reduceKey } from "../src/ui/tui.ts";

const V = () => createViewport(0, 0, 80, 10);
const TOTAL = 100;

describe("reduceKey", () => {
  test("q and Ctrl-c quit", () => {
    assert.equal(reduceKey(V(), TOTAL, { name: "q" }).quit, true);
    assert.equal(reduceKey(V(), TOTAL, { name: "c", ctrl: true }).quit, true);
  });

  test("j and down move the cursor forward", () => {
    const a = reduceKey(V(), TOTAL, { name: "j" }).vp!;
    assert.equal(a.cursor, 1);
    assert.equal(a.offset, 0);
    assert.deepEqual(reduceKey(V(), TOTAL, { name: "down" }).vp, moveCursor(V(), 1, TOTAL));
  });

  test("k and up move the cursor back", () => {
    const v = createViewport(0, 5, 80, 10);
    const a = reduceKey(v, TOTAL, { name: "k" }).vp!;
    assert.equal(a.cursor, 4);
    assert.equal(reduceKey(v, TOTAL, { name: "up" }).vp?.cursor, 4);
  });

  test("Ctrl-f and Space page down", () => {
    for (const key of [{ ctrl: true, name: "f" }, { name: " " }]) {
      assert.deepEqual(reduceKey(V(), TOTAL, key).vp, pageDown(V(), TOTAL));
    }
  });

  test("Ctrl-b pages up", () => {
    assert.deepEqual(reduceKey(V(), TOTAL, { ctrl: true, name: "b" }).vp, pageUp(V(), TOTAL));
  });

  test("g and G jump to first/last line", () => {
    assert.deepEqual(reduceKey(V(), TOTAL, { name: "g" }).vp, jumpToLine(V(), 0, TOTAL));
    assert.deepEqual(reduceKey(V(), TOTAL, { name: "G" }).vp, jumpToLine(V(), 99, TOTAL));
  });

  test("unknown key is a no-op", () => {
    const action = reduceKey(V(), TOTAL, { name: "x" });
    assert.equal(action.quit, undefined);
    assert.equal(action.vp, undefined);
  });

  test("quit still works on an empty document", () => {
    assert.equal(reduceKey(V(), 0, { name: "q" }).quit, true);
    assert.equal(reduceKey(V(), 0, { name: "c", ctrl: true }).quit, true);
  });

  test("navigation on an empty document is a safe no-op move", () => {
    // cursor/page operations clamp safely rather than throwing.
    assert.doesNotThrow(() => reduceKey(V(), 0, { name: "j" }));
    assert.equal(reduceKey(V(), 0, { name: "j" }).vp?.cursor, 0);
  });
});
