import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cycle, DEFAULTS, rows, SETTINGS } from "../src/core/settings.ts";
import { COMMANDS, CYCLES, type Cycle } from "../src/core/commands.ts";
import { filter } from "../src/core/palette.ts";

test("cycle wraps through the value list and ignores unknown ids", () => {
  let v = DEFAULTS;
  assert.equal(v.margin, "8");
  v = cycle(v, "margin");
  assert.equal(v.margin, "10");
  assert.equal(cycle(v, "margin", -1).margin, "8");
  assert.equal(cycle(DEFAULTS, "crumb", -1).crumb, "6");
  assert.equal(cycle(v, "nope"), v);
});

test("rows expose the current value as the hint", () => {
  assert.deepEqual(rows(DEFAULTS)[2], {
    id: "set:front",
    title: "Advanced > Frontmatter editing",
    category: "Advanced",
    keys: ["on"],
  });
});

test("every setting has its category and composes one popup title", () => {
  assert.deepEqual(
    rows(DEFAULTS).map((c) => c.title),
    [
      "View > Scroll margin",
      "View > Crumb depth",
      "Advanced > Frontmatter editing",
      "Comments > Remove after",
      "View > Inline width",
      "Comments > Agent side",
      "Comments > Your side",
      "Comments > Time",
      "View > Highlight line",
      "View > Popup corners",
      "View > Badge corner",
    ],
  );
  for (const [at, s] of SETTINGS.entries()) {
    assert.ok(!s.title.includes(">"));
    assert.deepEqual(rows(DEFAULTS)[at], {
      id: `set:${s.id}`,
      title: `${s.category} > ${s.title}`,
      category: s.category,
      keys: [DEFAULTS[s.id]],
    });
  }
});

test("View filter includes view settings and cyclers; clearing it restores all categories", () => {
  const out = rows(
    DEFAULTS,
    COMMANDS.filter((c) => c.id in CYCLES).map((c) => ({
      ...c,
      keys: [CYCLES[c.id as Cycle][0]!],
    })),
  );
  assert.deepEqual(
    filter(out, "View >").map((c) => c.id),
    [
      "set:margin",
      "set:crumb",
      "set:width",
      "set:line",
      "set:corners",
      "set:status",
      "viewCaret",
      "viewNumbers",
      "viewFences",
      "viewQuote",
      "viewCheck",
    ],
  );
  assert.deepEqual(
    out.find((c) => c.id === "viewCopy"),
    {
      id: "viewCopy",
      title: "Comments > Copy format",
      category: "Comments",
      keys: ["simple"],
    },
  );
  assert.deepEqual(filter(out, ""), out);
  assert.deepEqual(
    filter(out, "Advanced").map((c) => c.id),
    ["set:front"],
  );
});
