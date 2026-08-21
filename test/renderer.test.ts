import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { createViewport } from "../src/core/viewport.ts";
import { parseDocument } from "../src/core/document.ts";
import { hidden, render } from "../src/core/renderer.ts";

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
    assert.equal(frame[3]!, "▶ hello");
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
  assert.equal(color, "\x1b[43m\x1b[30m \x1b[0m b");
  const both = render(doc, createViewport(0, 1, 80, 3), { color: true, markers: [1] })[1];
  assert.equal(both, "\x1b[43m\x1b[30m>\x1b[0m b");
});

const show = (src: string, opts = {}) =>
  render(parseDocument(src), createViewport(0, 99, 80, 99), opts);

const hide = { hashes: false, marks: false, fences: "fence", pipes: false } as const;

describe("hide markup", () => {
  const rule = "─".repeat(78);

  test("strips inline marks, link urls and heading hashes", () => {
    const out = show("## Hi\n**b** __b__ *i* _i_ ~~s~~ `c` [t](http://x)", { ...hide });
    assert.deepEqual(out, ["  Hi", "  b b i i s c t"]);
  });

  test("fence rows become plain rules", () => {
    const out = show("```ts\nconst x = 1\n```", { ...hide });
    assert.deepEqual(out, [`  ${"─".repeat(11)}`, "  const x = 1", `  ${"─".repeat(11)}`]);
  });

  test("thematic breaks are rules; frontmatter drops its opener and closes full-width", () => {
    assert.deepEqual(show("---\ntitle: T\n---\n\n***"), [
      "  title: T",
      `  ${"─".repeat(78)}`,
      `  ${rule}`,
    ]);
    assert.equal(show("___", { ...hide })[0], `  ${rule}`);
  });

  test("styling still applies to the stripped text", () => {
    const out = show("**b** [t](u)", { ...hide, color: true });
    assert.equal(out[0], "  \x1b[1m\x1b[33mb\x1b[0m \x1b[4m\x1b[34mt\x1b[0m");
  });

  test("wrapping measures the stripped text and re-opens styles per chunk", () => {
    const doc = parseDocument("**abcdef**");
    assert.deepEqual(render(doc, createViewport(0, 0, 6, 9), { ...hide }), ["> abcd", "  ef"]);
    const styled = render(doc, createViewport(0, 0, 6, 9), { ...hide, color: true });
    assert.deepEqual(styled, [
      "\x1b[32m>\x1b[0m \x1b[1m\x1b[33mabcd\x1b[0m",
      "  \x1b[1m\x1b[33mef\x1b[0m",
    ]);
  });

  test("tables drop edge pipes, use │ between cells and a rule for the separator", () => {
    const out = show("| a | bb |\n| - | - |\n| c | d |", { ...hide });
    assert.deepEqual(out, ["  a │ bb", `  ${"─".repeat(6)}`, "  c │ d "]);
  });

  test("ragged source tables are re-laid from their cells in both modes", () => {
    const src = "a|bb\n--|--\n|ccc | d\n| e|f|";
    assert.deepEqual(show(src), [
      "  | a   | bb |",
      "  | --- | -- |",
      "  | ccc | d  |",
      "  | e   | f  |",
    ]);
    assert.equal(show(src, { ...hide })[2], "  ccc │ d ");
  });
});

test("task boxes follow the checkbox style", () => {
  const doc = parseDocument("- [ ] a\n- [x] b\n");
  const vp = createViewport(0, 0, 80, 2);
  assert.deepEqual(
    render(doc, vp, { markers: [], check: 0 }).map((l) => l.slice(2)),
    ["- [ ] a", "- [x] b"],
  );
  assert.deepEqual(
    render(doc, vp, { check: 2 }).map((l) => l.slice(2)),
    ["- ○ a", "- ● b"],
  );
  assert.equal(
    render(doc, vp, { check: 4, color: true })[1]!.slice(2),
    "\x1b[36m-\x1b[0m \x1b[32m✓\x1b[0m b",
  );
});

test("fence styles: ticks as written, fence as a rule, hide drops the rows", () => {
  const doc = parseDocument("```ts\nx\n```\n");
  const vp = createViewport(0, 0, 80, 3);
  assert.equal(render(doc, vp, { fences: "ticks" })[0], "> ```ts");
  assert.equal(render(doc, vp, { fences: "fence" })[0], "> ───"); // min 3 wide
  assert.deepEqual(render(doc, vp, { fences: "hide" }), ["  x"]);
});

describe("prose", () => {
  const src = "# T\n\nOne.\nTwo.\n\n- item\nThree.\n";
  const vp = createViewport(0, 0, 80, 10);
  test("flow joins a paragraph's lines into one row and hides the rest", () => {
    const out = render(parseDocument(src), vp, { flow: true });
    assert.deepEqual(out, ["> # T", "  ", "  One. Two.", "  ", "  - item", "  Three.", "  "]);
    assert.equal(hidden(parseDocument(src), 3, { flow: true }), true);
    assert.equal(hidden(parseDocument(src), 2, { flow: true }), false);
  });
  test("indent prefixes the first line of each paragraph only", () => {
    const out = render(parseDocument(src), vp, { indent: true });
    assert.deepEqual(out.slice(2, 4), ["    One.", "  Two."]);
  });
  test("flow wraps the joined text", () => {
    const out = render(parseDocument("aaaa bbbb\ncccc dddd"), createViewport(0, 0, 12, 5), {
      flow: true,
    });
    assert.deepEqual(out, ["> aaaa bbbb ", "  cccc dddd"]);
  });
});

test("blockquote styles: bar (default), > as written, hide", () => {
  const doc = parseDocument("> a\n>> b\n");
  const vp = createViewport(0, 0, 80, 2);
  assert.deepEqual(render(doc, vp), ["> │ a", "  │ │ b"]);
  assert.deepEqual(render(doc, vp, { quote: ">" }), ["> > a", "  >> b"]);
  assert.deepEqual(render(doc, vp, { quote: "hide" }), [">   a", "      b"]);
});
