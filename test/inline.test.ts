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
  assert.equal(when(now - 90_000, now, "relative"), "1m ago");
  assert.equal(when(now - 3 * 3_600_000, now, "relative"), "3h ago");
  assert.equal(when(now - 50 * 3_600_000, now, "relative"), "2d ago");
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

test("rows: text first, meta closes the note, each side set per author", () => {
  const list = notes(store, doc, { agent: true, own: true }).get(2)!;
  const o = { time: "hide" as const, now: 0, color: false, width: "fit" as const };
  assert.deepEqual(rows(list, 30, { ...o, agent: "left", own: "left" }), [
    "  why?        you",
    "  because  claude",
  ]);
  assert.deepEqual(rows(list, 30, { ...o, agent: "right", own: "right" }), [
    "               why?        you",
    "               because  claude",
  ]);
  // `you` right, agent left: the thread reads as a chat.
  assert.deepEqual(rows(list, 30, { ...o, agent: "left", own: "right" }), [
    "               why?        you",
    "  because  claude",
  ]);
});

test("rows: long text wraps and only the last row carries the meta", () => {
  const one = [{ id: "x", who: "me", text: "one two three four five", at: 0, agent: false }];
  assert.deepEqual(
    rows(one, 24, {
      time: "hide",
      now: 0,
      color: false,
      width: "fit",
      agent: "left",
      own: "left",
    }),
    ["  one two three four", "  five            me"],
  );
});

test("rows: a long comment wraps inside the configured width, not the pane", () => {
  const one = [{ id: "x", who: "me", text: "word ".repeat(30).trim(), at: 0, agent: false }];
  const o = {
    time: "hide" as const,
    now: 0,
    color: false,
    agent: "left" as const,
    own: "left" as const,
  };
  const half = rows(one, 100, { ...o, width: "50" });
  const full = rows(one, 100, { ...o, width: "full" });
  // 50% of the 98-column pane is 49; every row stays inside it, so the text takes more rows.
  assert.ok(half.every((r) => r.length <= 2 + 49));
  assert.ok(half.length > full.length);
});

test("rows: chat layout holds the block to 60% of the width", () => {
  const one = [{ id: "x", who: "me", text: "hi", at: 0, agent: false }];
  const o = { time: "hide" as const, now: 0, color: false, agent: "left" as const };
  const wide = rows(one, 40, { ...o, width: "60", own: "left" })[0]!;
  const snug = rows(one, 40, { ...o, width: "fit", own: "left" })[0]!;
  // 60% of the 38-column pane is 22, so the block is padded out to it.
  assert.equal(wide, `  ${"hi".padEnd(22 - 4)}  me`);
  assert.equal(wide.length, 2 + 22);
  assert.equal(snug, "  hi  me");
});
