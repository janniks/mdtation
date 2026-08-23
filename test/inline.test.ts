import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { CommentStore } from "../src/core/comment.ts";
import { notes, rows, when } from "../src/core/inline.ts";

const doc = parseDocument("# T\n\nbody\n");
const store = CommentStore.fromJSON([
  { id: "a", anchor: { kind: "line", n: 2 }, text: "why?", createdAt: 1000 },
  {
    id: "b",
    anchor: { kind: "line", n: 2 },
    text: "because",
    createdAt: 2000,
    author: "claude",
    agent: true,
    re: "a",
  },
]);

test("when: relative steps, absolute is time today and date later, hide is empty", () => {
  const now = Date.UTC(2026, 0, 2, 12);
  assert.equal(when(now - 5000, now, "relative"), "now");
  assert.equal(when(now - 90_000, now, "relative"), "1m");
  assert.equal(when(now - 3 * 3_600_000, now, "relative"), "3h");
  assert.equal(when(now - 50 * 3_600_000, now, "relative"), "2d");
  assert.equal(when(now - 50 * 3_600_000, now, "absolute"), "2025-12-31");
  assert.match(when(now - 60_000, now, "absolute"), /^\d\d:\d\d$/);
  assert.equal(when(now, now, "hide"), "");
});

test("notes picks voices and labels the local human `you`", () => {
  assert.deepEqual(
    notes(store, doc, { agent: true, own: false })
      .get(2)
      ?.map((n) => n.who),
    ["claude"],
  );
  assert.deepEqual(
    notes(store, doc, { agent: true, own: true, me: "jannik" })
      .get(2)
      ?.map((n) => n.who),
    ["you", "claude"],
  );
  assert.equal(notes(store, doc, { agent: false, own: false }).size, 0);
});

test("rows: one block, names padded, right flush or left indented, long text wraps", () => {
  const list = notes(store, doc, { agent: true, own: true }).get(2)!;
  const o = { time: "hide" as const, now: 0, color: false };
  assert.deepEqual(rows(list, 30, { ...o, align: "left" }), [
    "     you  why?",
    "  claude  because",
  ]);
  assert.deepEqual(rows(list, 30, { ...o, align: "right" }), [
    "                  you  why?",
    "               claude  because",
  ]);
  const long = rows([{ who: "me", text: "one two three four five", at: 0 }], 20, {
    ...o,
    align: "left",
  });
  assert.deepEqual(long, ["  me  one two", "      three four", "      five"]);
});
