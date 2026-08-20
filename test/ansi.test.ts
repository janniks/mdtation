import { test } from "node:test";
import assert from "node:assert/strict";
import { spans, strip } from "../src/core/ansi.ts";

test("plain text is one span", () => {
  assert.deepEqual(spans("hello"), [{ text: "hello" }]);
});

test("empty input yields no spans", () => {
  assert.deepEqual(spans(""), []);
});

test("bold + color + reset split into spans", () => {
  const s = spans("a \x1b[1m\x1b[32mb\x1b[0m c");
  assert.deepEqual(s, [{ text: "a " }, { text: "b", bold: true, fg: "#0dbc79" }, { text: " c" }]);
});

test("combined codes and bare reset", () => {
  assert.deepEqual(spans("\x1b[1;36mx\x1b[my"), [
    { text: "x", bold: true, fg: "#11a8cd" },
    { text: "y" },
  ]);
});

test("dim, italic, strike, gray", () => {
  const s = spans("\x1b[2m\x1b[3m\x1b[9m\x1b[90mz\x1b[0m");
  assert.deepEqual(s, [{ text: "z", dim: true, italic: true, strike: true, fg: "#808080" }]);
});

test("span text concatenates to the stripped text", () => {
  const raw = "\x1b[1m# \x1b[36mHead\x1b[0m 团队 🧑‍🤝‍🧑 \x1b[90m|\x1b[0m";
  assert.equal(
    spans(raw)
      .map((s) => s.text)
      .join(""),
    strip(raw),
  );
  assert.equal(strip(raw), "# Head 团队 🧑‍🤝‍🧑 |");
});

test("underline on and off", () => {
  assert.deepEqual(spans("\x1b[4ma\x1b[24mb"), [
    { text: "a", underline: true },
    { text: "b", underline: false },
  ]);
});

test("background colors", () => {
  assert.deepEqual(spans("\x1b[43m\x1b[30m✦\x1b[0m"), [
    { text: "✦", bg: "#e5e510", fg: "#000000" },
  ]);
});
