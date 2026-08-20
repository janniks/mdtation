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
