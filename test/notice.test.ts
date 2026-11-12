import { strict as assert } from "node:assert";
import { test } from "node:test";
import { away, label } from "../src/core/notice.ts";

test("away counts lines on each side of the window, not the ones in it", () => {
  assert.deepEqual(away([1, 4, 10, 12, 30, 31], 10, 20), { above: 2, below: 2 });
  assert.deepEqual(away([], 0, 5), { above: 0, below: 0 });
});

test("label names the side and the count, and is empty for none", () => {
  assert.equal(label(2, "above"), "↑ 2 new comments above");
  assert.equal(label(1, "below"), "↓ 1 new comment below");
  assert.equal(label(0, "below"), "");
});
