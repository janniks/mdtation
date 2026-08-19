import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { render } from "../src/core/renderer.ts";
import { createViewport } from "../src/core/viewport.ts";

/** True if `s` contains a lone UTF-16 surrogate — the thing that makes
 * OpenTUI's native UTF-8 encoder panic (the actual render crash). */
function hasLoneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (n >= 0xdc00 && n <= 0xdfff) {
        i++;
        continue; // valid pair
      }
      return true;
    }
    if (c >= 0xdc00 && c <= 0xdfff) {
      return true; // lone low surrogate
    }
  }
  return false;
}

describe("renderer unicode", () => {
  test("emoji line that wraps has no lone surrogate (regression: crash on split surrogate)", () => {
    const doc = parseDocument("🧑\u200d🤝\u200d🧑".repeat(40));
    const frame = render(doc, createViewport(0, 0, 30, 24)); // colWidth 28 -> forces a wrap
    assert.equal(hasLoneSurrogate(frame.join("\n")), false);
  });

  test("CJK line wraps with no lone surrogate and yields multiple rows", () => {
    const doc = parseDocument("你好世界".repeat(20));
    const frame = render(doc, createViewport(0, 0, 30, 24));
    assert.equal(hasLoneSurrogate(frame.join("\n")), false);
    assert.ok(frame.length >= 2);
  });

  test("mixed ASCII + emoji wraps with no lone surrogate", () => {
    const doc = parseDocument("x".repeat(20) + "🎉");
    const frame = render(doc, createViewport(0, 0, 30, 24));
    assert.equal(hasLoneSurrogate(frame.join("\n")), false);
  });

  test("color mode on emoji line has no lone surrogate", () => {
    const doc = parseDocument("🧑\u200d🤝\u200d🧑".repeat(40));
    const frame = render(doc, createViewport(0, 0, 30, 24), { color: true });
    assert.equal(hasLoneSurrogate(frame.join("\n")), false);
  });

  test("narrow pane: emoji line wraps with no lone surrogate on any row", () => {
    const doc = parseDocument("🧑\u200d🤝\u200d🧑".repeat(20));
    const frame = render(doc, createViewport(0, 0, 6, 24)); // colWidth 4 -> many wraps
    for (const line of frame) {
      assert.equal(hasLoneSurrogate(line), false);
    }
  });

  test("emoji on cursor line: exactly one cursor-gutter row", () => {
    const doc = parseDocument("🧑".repeat(40));
    const frame = render(doc, createViewport(0, 0, 30, 24), { color: true });
    const cursorRows = frame.filter((l) => l.startsWith("\x1b[32m>"));
    assert.equal(cursorRows.length, 1);
  });

  test("empty document renders a single cursor gutter", () => {
    const frame = render(parseDocument(""), createViewport(0, 0, 30, 24));
    assert.deepEqual(frame, ["> "]);
  });

  test("every rendered row fits its pane width (code units <= width)", () => {
    const doc = parseDocument("你好".repeat(30) + "\n" + "a".repeat(90));
    const frame = render(doc, createViewport(0, 0, 20, 5)); // colWidth 18
    for (const l of frame) {
      assert.ok(l.length <= 20, `row too long (${l.length}): ${JSON.stringify(l.slice(0, 30))}`);
    }
  });

  test("code block with emoji inside renders with no lone surrogate", () => {
    const doc = parseDocument("```ts\nconst x = '🎉'\n```");
    const frame = render(doc, createViewport(0, 0, 30, 24), { color: true });
    assert.equal(hasLoneSurrogate(frame.join("\n")), false);
    assert.equal(frame.length, 3); // fence, code, fence
  });

  test("unclosed fence renders the whole doc without crash or lone surrogate", () => {
    const doc = parseDocument("```ts\nconst x = '🎉'\n");
    const frame = render(doc, createViewport(0, 0, 30, 24), { color: true });
    assert.equal(hasLoneSurrogate(frame.join("\n")), false);
    assert.ok(frame.length >= 2); // fence + code line
  });
});
