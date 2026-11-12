import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mix } from "../src/core/theme.ts";

test("mix walks from one color to the other", () => {
  assert.equal(mix("#000000", "#ffffff", 0), "#000000");
  assert.equal(mix("#000000", "#ffffff", 1), "#ffffff");
  assert.equal(mix("#102030", "#304050", 0.5), "#203040");
});
