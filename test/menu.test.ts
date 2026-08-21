import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { COMMANDS } from "../src/core/commands.ts";
import { hint, menus, prefix, specs, step, width } from "../src/core/menu.ts";

describe("menu", () => {
  test("hint renders chords human-readably", () => {
    assert.equal(hint("ctrl+d"), "^d");
    assert.equal(hint("shift+g"), "G");
    assert.equal(hint("/"), "/");
    assert.equal(hint("?"), "?");
    assert.equal(hint("down"), "↓");
    assert.equal(hint("escape"), "Esc");
    assert.equal(hint(undefined), "");
  });

  test("menus group by category in declaration order", () => {
    const m = menus(COMMANDS);
    assert.deepEqual(
      m.map((x) => x.label),
      ["File", "View", "Comments", "Help"],
    );
    assert.deepEqual(m[2]!.entries[0], { id: "comment", title: "New Comment", hint: "c" });
    assert.ok(!m.some((x) => x.label === "Navigate")); // menu: false, still in help
    assert.equal(m[0]!.entries[0]!.hint, "q");
    assert.equal(m[1]!.entries[0]!.hint, "");
  });

  test("state marks entries checkable", () => {
    const m = menus(COMMANDS, (id) => (id === "viewColor" ? false : undefined));
    assert.equal(m[1]!.entries[0]!.checked, false);
    assert.equal("checked" in m[1]!.entries[1]!, false);
    assert.equal(prefix(m[1]!.entries[0]!), "[ ] ");
    assert.equal(prefix({ ...m[1]!.entries[0]!, checked: true }), "[x] ");
    assert.equal(prefix(m[0]!.entries[0]!), "  ");
  });

  test("specs pack labels after a one-column gutter", () => {
    const s = specs(menus(COMMANDS));
    assert.deepEqual(s[0], { id: "file", label: "File", left: 0, width: 6 });
    assert.deepEqual(s[1], { id: "view", label: "View", left: 6, width: 6 });
  });

  test("width fits the longest title + hint", () => {
    assert.equal(width({ label: "X", entries: [{ id: "a", title: "Hi", hint: "q" }] }), 20);
    const long = { id: "a", title: "A rather long command title", hint: "^d" };
    assert.equal(width({ label: "X", entries: [long] }), 27 + 2 + 5);
    assert.equal(width({ label: "X", entries: [{ ...long, checked: true }] }), 27 + 2 + 7);
  });

  test("step wraps", () => {
    assert.equal(step(0, -1, 3), 2);
    assert.equal(step(2, 1, 3), 0);
    assert.equal(step(1, 1, 3), 2);
    assert.equal(step(0, 1, 0), 0);
  });
});

test("menus: the first entry of a group carries its section title", () => {
  const m = menus([
    { id: "a", title: "A", category: "V", keys: [], group: "x" },
    { id: "b", title: "B", category: "V", keys: [], group: "x" },
    { id: "c", title: "C", category: "V", keys: [], group: "y" },
  ]);
  assert.deepEqual(
    m[0]!.entries.map((e) => e.group),
    [undefined, undefined, "y"],
  );
});
