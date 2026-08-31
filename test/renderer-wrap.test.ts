import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { createViewport } from "../src/core/viewport.ts";
import { parseDocument } from "../src/core/document.ts";
import { render, span } from "../src/core/renderer.ts";

const long = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
const vp = () => createViewport(0, 0, 26, 24);

describe("wrap continuation prefixes", () => {
  test("blockquote rows repeat the bar", () => {
    const doc = parseDocument(`> ${long}`);
    const rows = render(doc, vp());
    assert.ok(rows.length > 2);
    for (const [i, r] of rows.entries()) {
      assert.ok(r.slice(2).startsWith("│ "), `row ${i}: ${JSON.stringify(r)}`);
    }
  });

  test("nested blockquote keeps both bars", () => {
    const doc = parseDocument(`> > ${long}`);
    const rows = render(doc, vp());
    for (const r of rows) {
      assert.ok(r.slice(2).startsWith("│ │ "), JSON.stringify(r));
    }
  });

  test("list items hang past the bullet", () => {
    const doc = parseDocument(`- ${long}`);
    const rows = render(doc, vp());
    assert.ok(rows.length > 2);
    assert.ok(rows[0]!.slice(2).startsWith("- alpha"));
    for (const r of rows.slice(1)) {
      assert.ok(r.startsWith("    ") && r[4] !== " ", JSON.stringify(r));
    }
  });

  test("task items hang past the box", () => {
    const doc = parseDocument(`- [ ] ${long}`);
    const rows = render(doc, vp());
    for (const r of rows.slice(1)) {
      assert.ok(r.startsWith("      ") && r[6] !== " ", JSON.stringify(r));
    }
  });

  test("span matches rendered rows for wrapped constructs", () => {
    const doc = parseDocument(`> ${long}\n\n- [ ] ${long}`);
    const v = vp();
    const rows = render(doc, v);
    let total = 0;
    for (let i = 0; i < doc.lines.length; i++) total += span(doc, i, v);
    assert.equal(rows.length, total);
  });
});
