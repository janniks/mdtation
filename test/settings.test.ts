import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cycle, DEFAULTS, rows } from "../src/core/settings.ts";

test("cycle wraps through the value list and ignores unknown ids", () => {
  let v = DEFAULTS;
  assert.equal(v.margin, "3");
  v = cycle(v, "margin");
  assert.equal(v.margin, "4");
  assert.equal(cycle(v, "margin", -1).margin, "3");
  assert.equal(cycle(DEFAULTS, "crumb", -1).crumb, "6");
  assert.equal(cycle(v, "nope"), v);
});

test("rows expose the current value as the hint", () => {
  assert.deepEqual(rows(DEFAULTS)[2], {
    id: "set:front",
    title: "Beta > Frontmatter editing",
    category: "Settings",
    keys: ["on"],
  });
});
