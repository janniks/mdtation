import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { COMMANDS } from "../src/core/commands.ts";
import { filter, hint, rows } from "../src/core/palette.ts";

const CAT = [
  { id: "quit", title: "Quit", category: "File", keys: ["q"] },
  { id: "pageDown", title: "Page Down", category: "Navigate", keys: ["ctrl+f"] },
  { id: "top", title: "Top", category: "Navigate", keys: ["g"] },
  { id: "bottom", title: "Bottom", category: "Navigate", keys: ["shift+g"] },
  { id: "comment", title: "New Comment", category: "Notes", keys: ["c"] },
  { id: "copy", title: "Copy Reference", category: "Notes", keys: ["y"] },
];
const ids = (q: string) => filter(CAT, q).map((c) => c.id);

describe("palette", () => {
  test("empty query keeps catalog order", () => {
    assert.deepEqual(
      ids(""),
      CAT.map((c) => c.id),
    );
    assert.deepEqual(ids("   "), ids(""));
  });

  test("ranks title prefix over substring over id/category", () => {
    assert.deepEqual(ids("p"), ["pageDown", "top", "copy"]);
    assert.deepEqual(ids("notes"), ["comment", "copy"]);
    assert.deepEqual(ids("pagedown"), ["pageDown"]);
  });

  test("is case-insensitive and drops misses", () => {
    assert.deepEqual(ids("BOT"), ["bottom"]);
    assert.deepEqual(ids("zzz"), []);
  });

  test("hint labels the first chord", () => {
    assert.equal(hint(["ctrl+f"]), "^F");
    assert.equal(hint(["shift+g"]), "G");
    assert.equal(hint(["q", "ctrl+c"]), "q");
    assert.equal(hint(["down"]), "down");
    assert.equal(hint([]), "");
  });

  test("rows group by category in catalog order", () => {
    const r = rows(CAT);
    assert.deepEqual(
      r.map((x) => x.category),
      ["File", "Navigate", "Notes"],
    );
    assert.deepEqual(r[0]?.items, [{ title: "Quit", hint: "q" }]);
    assert.deepEqual(r[1]?.items.at(-1), { title: "Bottom", hint: "G" });
    assert.equal(rows(COMMANDS).flatMap((x) => x.items).length, COMMANDS.length);
  });
});
