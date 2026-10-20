import { test } from "node:test";
import assert from "node:assert/strict";
import { spans, strip } from "../src/core/ansi.ts";
import { theme } from "../src/core/theme.ts";

test("plain text is one span", () => {
  assert.deepEqual(spans("hello"), [{ text: "hello" }]);
});

test("empty input yields no spans", () => {
  assert.deepEqual(spans(""), []);
});

test("bold + color + reset split into spans", () => {
  const s = spans("a \x1b[1m\x1b[32mb\x1b[0m c");
  assert.deepEqual(s, [{ text: "a " }, { text: "b", bold: true, fg: "#99d892" }, { text: " c" }]);
});

test("combined codes and bare reset", () => {
  assert.deepEqual(spans("\x1b[1;36mx\x1b[my"), [
    { text: "x", bold: true, fg: "#9fdcd4" },
    { text: "y" },
  ]);
});

test("dim, italic, strike, gray", () => {
  const s = spans("\x1b[2m\x1b[3m\x1b[9m\x1b[90mz\x1b[0m");
  assert.deepEqual(s, [{ text: "z", dim: true, italic: true, strike: true, fg: "#8a8f8a" }]);
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
    { text: "✦", bg: "#e9d28a", fg: "#3a3d3a" },
  ]);
});

test("light theme maps syntax and comment/cursor slabs without changing text", () => {
  const raw = "\x1b[1;32mHeading\x1b[0m \x1b[40;90mcomment\x1b[49m \x1b[100;34mlink\x1b[0m plain";
  assert.deepEqual(spans(raw, theme("light")), [
    { text: "Heading", bold: true, fg: "#356b2e" },
    { text: " " },
    { text: "comment", bg: "#e5ebdf", fg: "#66705f" },
    { text: " ", bg: undefined, fg: "#66705f" },
    { text: "link", bg: "#edf0e8", fg: "#35658c" },
    { text: " plain" },
  ]);
  assert.equal(
    spans(raw, theme("light"))
      .map((s) => s.text)
      .join(""),
    strip(raw),
  );
});

test("theme selection preserves dark as the fallback", () => {
  assert.equal(theme(), theme("dark"));
  assert.equal(theme("unknown"), theme("dark"));
  assert.notEqual(theme("light"), theme("dark"));
});

test("light comment gutter keeps dark text on a pale highlight", () => {
  assert.deepEqual(spans("\x1b[43;30m>\x1b[0m", theme("light")), [
    { text: ">", bg: "#e9d28a", fg: "#293127" },
  ]);
});
