import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { COMMANDS } from "../src/core/commands.ts";
import { hint, menus, specs, step, width } from "../src/core/menu.ts";

describe("menu", () => {
  test("hint renders chords human-readably", () => {
    assert.equal(hint("ctrl+f"), "^F");
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
      ["File", "Navigate", "Notes", "Tools", "Help"],
    );
    assert.deepEqual(m[1]!.entries[0], { id: "cursorDown", title: "Cursor Down", hint: "j" });
    assert.equal(m[0]!.entries[0]!.hint, "q");
  });

  test("specs pack labels after a one-column gutter", () => {
    const s = specs(menus(COMMANDS));
    assert.deepEqual(s[0], { id: "file", label: "File", left: 1, width: 6 });
    assert.deepEqual(s[1], { id: "navigate", label: "Navigate", left: 7, width: 10 });
  });

  test("width fits the longest title + hint", () => {
    assert.equal(width({ label: "X", entries: [{ id: "a", title: "Hi", hint: "q" }] }), 20);
    const long = { id: "a", title: "A rather long command title", hint: "^F" };
    assert.equal(width({ label: "X", entries: [long] }), 27 + 2 + 5);
  });

  test("step wraps", () => {
    assert.equal(step(0, -1, 3), 2);
    assert.equal(step(2, 1, 3), 0);
    assert.equal(step(1, 1, 3), 2);
    assert.equal(step(0, 1, 0), 0);
  });
});
