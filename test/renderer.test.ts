import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { createViewport } from "../src/core/viewport.ts";
import { parseDocument } from "../src/core/document.ts";
import { render } from "../src/core/renderer.ts";

// No trailing newline -> 8 clean lines, easy to assert exactly.
const md = "# A\n## B\n### C\nhello\n```ts\nconst x = 1\n```\n# D";

describe("renderer", () => {
  test("renders the visible window with a cursor gutter", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 1, 80, doc.lines.length));
    assert.equal(frame.length, 8);
    assert.equal(frame[0]!, "  # A");
    assert.equal(frame[1]!, "> ## B");
    assert.equal(frame[5]!, "  const x = 1");
    assert.equal(frame[6]!, "  ```");
    assert.equal(frame[7]!, "  # D");
  });

  test("windows the document by offset/height", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(2, 0, 80, 3));
    assert.equal(frame.length, 3);
    assert.equal(frame[0]!, "  ### C");
    assert.equal(frame[1]!, "  hello");
    assert.equal(frame[2]!, "  ```ts");
  });

  test("marks commented lines in the gutter", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 0, 80, doc.lines.length), {
      markers: [3],
    });
    assert.equal(frame[3]!, "★ hello");
  });

  test("cursor gutter wins over a comment marker", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 3, 80, doc.lines.length), { markers: [3] });
    assert.equal(frame[3]!, "> hello");
  });

  test("off-screen cursor leaves no marker", () => {
    const doc = parseDocument(md);
    // cursor at line 7, window only shows line 0
    const frame = render(doc, createViewport(0, 7, 80, 1));
    assert.equal(frame[0]!, "  # A");
  });

  test("empty document renders a single empty cursor line", () => {
    const doc = parseDocument("");
    assert.deepEqual(render(doc, createViewport(0, 0, 80, 10)), ["> "]);
  });

  test("zero height renders nothing", () => {
    const doc = parseDocument(md);
    assert.deepEqual(render(doc, createViewport(0, 0, 80, 0)), []);
  });
});

test("gutter shows the comment count past one, and a custom caret", () => {
  const doc = parseDocument("a\nb\nc\n");
  const vp = createViewport(0, 0, 80, 3);
  assert.equal(render(doc, vp, { markers: [1, 1, 2] })[1], "2 b");
  assert.equal(render(doc, vp, { caret: "▶" })[0], "▶ a");
  const color = render(doc, vp, { color: true, markers: [1] })[1];
  assert.equal(color, "\x1b[43m\x1b[30m★\x1b[0m b");
});

const show = (src: string, opts = {}) =>
  render(parseDocument(src), createViewport(0, 99, 80, 99), opts);

describe("hide markup", () => {
  const rule = "─".repeat(20);

  test("strips inline marks, link urls and heading hashes", () => {
    const out = show("## Hi\n**b** __b__ *i* _i_ ~~s~~ `c` [t](http://x)", { markup: false });
    assert.deepEqual(out, ["  Hi", "  b b i i s c t"]);
  });

  test("fence rows become rules with the language label", () => {
    const out = show("```ts\nconst x = 1\n```", { markup: false });
    assert.deepEqual(out, [`  ${rule} ts`, "  const x = 1", `  ${rule}`]);
  });

  test("thematic breaks are rules; frontmatter opens blank and closes full-width", () => {
    assert.deepEqual(show("---\ntitle: T\n---\n***"), [
      "  ",
      "  title: T",
      `  ${"─".repeat(78)}`,
      `  ${rule}`,
    ]);
    assert.equal(show("___", { markup: false })[0], `  ${rule}`);
  });

  test("styling still applies to the stripped text", () => {
    const out = show("**b** [t](u)", { markup: false, color: true });
    assert.equal(out[0], "  \x1b[1m\x1b[33mb\x1b[0m \x1b[4m\x1b[34mt\x1b[0m");
  });

  test("wrapping measures the stripped text and re-opens styles per chunk", () => {
    const doc = parseDocument("**abcdef**");
    assert.deepEqual(render(doc, createViewport(0, 0, 6, 9), { markup: false }), [
      "> abcd",
      "  ef",
    ]);
    const styled = render(doc, createViewport(0, 0, 6, 9), { markup: false, color: true });
    assert.deepEqual(styled, [
      "\x1b[32m> \x1b[0m\x1b[1m\x1b[33mabcd\x1b[0m",
      "  \x1b[1m\x1b[33mef\x1b[0m",
    ]);
  });

  test("tables drop edge pipes, use │ between cells and a rule for the separator", () => {
    const out = show("| a | bb |\n| - | - |\n| c | d |", { markup: false });
    assert.deepEqual(out, ["  a │ bb", `  ${"─".repeat(10)}`, "  c │ d "]);
  });

  test("ragged source tables are re-laid from their cells in both modes", () => {
    const src = "a|bb\n--|--\n|ccc | d\n| e|f|";
    assert.deepEqual(show(src), [
      "  | a   | bb |",
      "  | --  | -- |",
      "  | ccc | d  |",
      "  | e   | f  |",
    ]);
    assert.equal(show(src, { markup: false })[2], "  ccc │ d ");
  });
});
