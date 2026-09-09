import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import type { Command } from "../src/core/commands.ts";
import { COMMANDS, CYCLES, matchKey, reduceCommand, toChord, verbs } from "../src/core/commands.ts";
import { CHECKS } from "../src/core/renderer.ts";
import { rows } from "../src/core/palette.ts";
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
        if (c.category === "View" && "group" in c && (c.group === "Text" || c.group === "Blocks"))
          assert.deepEqual(c.keys, []);
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

test("verbs flips Show to Hide for toggles that are on", () => {
  const out = verbs(COMMANDS, { viewLinks: true, viewColor: true }, {});
  assert.equal(out.find((c) => c.id === "viewLinks")?.title, "Hide links");
  assert.equal(out.find((c) => c.id === "viewMarks")?.title, "Show inline marks");
  assert.equal(out.find((c) => c.id === "viewColor")?.title, "Disable color");
});

test("verbs uses the specified actions for both toggle states", () => {
  for (const [id, title, off] of [
    ["viewColor", "Enable color", "Disable color"],
    ["viewMouse", "Capture mouse", "Release mouse"],
    ["viewEmphasis", "Color text decoration", "Gray text decoration"],
    ["viewSyntax", "Highlight code syntax", "Plain code"],
    ["viewFlow", "Flow paragraphs", "Unflow paragraphs"],
    ["viewIndent", "Indent paragraphs", "Unindent paragraphs"],
    ["viewArchive", "Archive on copy", "Keep on copy"],
    ["viewSelect", "Select to comment", "Select to copy"],
    ["viewBar", "Show menu bar", "Hide menu bar"],
  ] as const) {
    assert.equal(verbs(COMMANDS, { [id]: false }, {}).find((c) => c.id === id)?.title, title);
    assert.equal(verbs(COMMANDS, { [id]: true }, {}).find((c) => c.id === id)?.title, off);
  }
});

test("verbs expands every cycler and excludes its current value at every index", () => {
  for (const [id, titles] of [
    [
      "viewNumbers",
      ["Hide line numbers", "Show absolute line numbers", "Show relative line numbers"],
    ],
    ["viewFences", ["Show code fences as ticks", "Show code fences as lines", "Hide code fences"]],
    [
      "viewQuote",
      ["Show blockquotes with a bar", "Show blockquotes with >", "Hide blockquote marks"],
    ],
    ["viewCaret", ["Use > caret", "Use + caret", "Use ● caret"]],
    ["viewCheck", CHECKS.map((c) => `Use ${c[1]} checkboxes`)],
    ["viewCopy", ["Copy in simple format", "Copy in detailed format"]],
  ] as const) {
    assert.equal(titles.length, CYCLES[id].length);
    for (let at = 0; at < titles.length; at++) {
      assert.deepEqual(
        verbs(
          COMMANDS.filter((c) => c.id === id),
          {},
          { [id]: at },
        ),
        titles.flatMap((title, i) =>
          i === at
            ? []
            : [
                {
                  id: `${id}=${i}`,
                  title,
                  category: id === "viewCopy" ? "Comments" : "View",
                  keys: [],
                },
              ],
        ),
      );
    }
  }
});

test("palette expansion preserves plain actions and neutral help titles without duplicates", () => {
  const before = rows(COMMANDS);
  const out = verbs(COMMANDS, { viewMouse: true }, { viewNumbers: 2 });
  assert.deepEqual(
    out.find((c) => c.id === "viewMore"),
    {
      id: "viewMore",
      title: "More view settings…",
      category: "View",
      keys: [],
      group: " ",
    },
  );
  assert.equal(new Set(out.map((c) => c.id)).size, out.length);
  assert.ok(out.every((c) => !c.id.startsWith("set:")));
  assert.deepEqual(rows(COMMANDS), before);
  assert.equal(COMMANDS.find((c) => c.id === "viewColor")?.title, "Color");
  assert.equal(COMMANDS.find((c) => c.id === "viewSyntax")?.title, "Syntax highlight");
  assert.deepEqual(
    rows(COMMANDS)
      .flatMap((c) => c.items)
      .filter((c) => c.title === "Capture mouse"),
    [{ title: "Capture mouse", hint: "M" }],
  );
});
