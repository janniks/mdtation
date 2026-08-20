import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import type { Command } from "../src/core/commands.ts";
import { COMMANDS, matchKey, reduceCommand, toChord } from "../src/core/commands.ts";
import { createViewport, jumpToLine, moveCursor } from "../src/core/viewport.ts";

const V = () => createViewport(0, 0, 80, 10);
const TOTAL = 100;

function chord(e: { name?: string; ctrl?: boolean; shift?: boolean }) {
  return toChord(e);
}

describe("commands", () => {
  describe("toChord", () => {
    test("plain, ctrl, shift", () => {
      assert.equal(chord({ name: "j" }), "j");
      assert.equal(chord({ name: "f", ctrl: true }), "ctrl+f");
      assert.equal(chord({ name: "g", shift: true }), "shift+g");
      assert.equal(chord({ name: "c", ctrl: true }), "ctrl+c");
    });
  });

  describe("matchKey (first-match-wins)", () => {
    test("matches the first command in declaration order", () => {
      assert.equal(matchKey("j")?.id, "cursorDown");
      assert.equal(matchKey("down")?.id, "cursorDown"); // both chords hit one command
    });

    test("resolves every documented chord to its command", () => {
      const cases: [string, string][] = [
        ["j", "cursorDown"],
        ["k", "cursorUp"],
        ["ctrl+d", "pageDown"],
        ["pagedown", "pageDown"],
        ["ctrl+u", "pageUp"],
        ["pageup", "pageUp"],
        ["g", "top"],
        ["shift+g", "bottom"],
        ["q", "quit"],
        ["ctrl+c", "quit"],
        ["ctrl+s", "save"],
        ["x", "toggle"],
        ["space", "toggle"],
        ["/", "palette"],
        ["c", "comment"],
        ["shift+c", "copy"],
        ["[", "prevComment"],
        ["]", "nextComment"],
        ["?", "help"],
      ];
      for (const [key, id] of cases) {
        assert.equal(matchKey(key)?.id, id, `${key} -> ${id}`);
      }
    });

    test("unknown chord yields nothing", () => {
      assert.equal(matchKey("z"), undefined);
      assert.equal(matchKey("y"), undefined);
    });

    test("render toggles have no chord (menu, palette, help only)", () => {
      for (const c of COMMANDS) {
        if (c.category === "View" && c.group === "Render") assert.deepEqual(c.keys, []);
      }
    });

    test("first of two commands sharing a chord wins", () => {
      const shared: Command[] = [
        { id: "a", title: "A", category: "X", keys: ["k"] },
        { id: "b", title: "B", category: "X", keys: ["k"] },
      ];
      assert.equal(matchKey("k", shared)?.id, "a");
    });
  });

  describe("reduceCommand", () => {
    test("navigation affects the viewport", () => {
      assert.deepEqual(reduceCommand("cursorDown", V(), TOTAL).vp, moveCursor(V(), 1, TOTAL));
      assert.deepEqual(reduceCommand("top", V(), TOTAL).vp, jumpToLine(V(), 0, TOTAL));
      assert.deepEqual(reduceCommand("bottom", V(), TOTAL).vp, jumpToLine(V(), 99, TOTAL));
    });

    test("quit returns a quit action", () => {
      assert.equal(reduceCommand("quit", V(), TOTAL).quit, true);
      assert.equal(reduceCommand("quit", V(), TOTAL).vp, undefined);
    });

    test("deferred commands are no-ops on the viewport", () => {
      for (const id of [
        "palette",
        "comment",
        "copy",
        "prevComment",
        "nextComment",
        "help",
        "save",
        "toggle",
        "viewColor",
        "viewEmphasis",
        "viewSyntax",
      ]) {
        const a = reduceCommand(id, V(), TOTAL);
        assert.equal(a.quit, undefined);
        assert.equal(a.vp, undefined);
      }
    });

    test("unknown id is a safe no-op", () => {
      const a = reduceCommand("nope", V(), TOTAL);
      assert.equal(a.quit, undefined);
      assert.equal(a.vp, undefined);
    });

    test("undefined id is a no-op", () => {
      assert.deepEqual(reduceCommand(undefined, V(), TOTAL), {});
    });

    test("every command id is handled without throwing (parity)", () => {
      // The { [K in CommandId]: ... } type on HANDLERS is the real typecheck
      // guard; this runtime check asserts dispatch survives all catalog ids.
      for (const c of COMMANDS) {
        assert.doesNotThrow(() => reduceCommand(c.id, V(), TOTAL));
      }
    });
  });
});
