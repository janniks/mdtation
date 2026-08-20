import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { crumb } from "../src/core/crumb.ts";

const doc = parseDocument(
  ["intro", "# Title", "a", "## Section", "b", "### Sub", "c", "## Other", "d", "# Two", "e"].join(
    "\n",
  ),
);

describe("crumb", () => {
  test("empty before the first heading", () => {
    assert.equal(crumb(doc, 0), "");
  });

  test("heading line counts as inside its own section", () => {
    assert.equal(crumb(doc, 1), "Title");
    assert.equal(crumb(doc, 3), "Title › Section");
  });

  test("walks up by level", () => {
    assert.equal(crumb(doc, 6), "Title › Section › Sub");
    assert.equal(crumb(doc, 8), "Title › Other");
    assert.equal(crumb(doc, 10), "Two");
  });

  test("skips a deeper heading that is not an ancestor", () => {
    const d = parseDocument(["### Deep", "# Top", "x"].join("\n"));
    assert.equal(crumb(d, 2), "Top");
  });
});
