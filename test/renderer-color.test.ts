import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { render } from "../src/core/renderer.ts";
import { createViewport } from "../src/core/viewport.ts";

const ESC = "\x1b";

test("renderer stays plain by default (golden regression)", () => {
  const doc = parseDocument("# H1\n**bold**\n");
  const frame = render(doc, createViewport(0, 0, 80, 24));
  assert.equal(frame[0], "> # H1");
  assert.equal(frame[1], "  **bold**");
  // no ANSI escapes leak into plain output
  assert.equal(
    frame.some((l) => l.includes(ESC)),
    false,
  );
});

test("renderer color=true styles headings, inline, and code", () => {
  const doc = parseDocument("# H1\n\n**bold** text\n\n```ts\ncode\n```\n");
  const frame = render(doc, createViewport(0, 0, 80, 24), { color: true });
  // line 0: green cursor gutter + bold red heading
  assert.ok(
    frame[0]?.startsWith(`${ESC}[32m> ${ESC}[0m${ESC}[1m${ESC}[31m# H1${ESC}[0m`),
    frame[0],
  );
  // line 2: inline bold
  assert.ok(frame[2]?.endsWith(`${ESC}[1mbold${ESC}[0m text`), frame[2]);
  // line 5: code block dimmed
  assert.ok(frame[5]?.includes(`${ESC}[2mcode${ESC}[0m`), frame[5]);
});
