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
  assert.equal(
    frame.some((l) => l.includes(ESC)),
    false,
  );
});

test("color=true styles headings, inline, fenced code, and syntax", () => {
  const doc = parseDocument("# H1\n\n**bold** text\n\n```ts\nconst n = 1; // c\n```\n");
  const frame = render(doc, createViewport(0, 0, 80, 24), {
    color: true,
    deco: true,
    marks: false,
  });
  // line 0: green cursor gutter + bold bright-white heading
  assert.ok(
    frame[0]?.startsWith(`${ESC}[32m>${ESC}[0m ${ESC}[1m${ESC}[97m# H1${ESC}[0m`),
    frame[0],
  );
  // line 2: inline bold
  assert.ok(frame[2]?.endsWith(`${ESC}[1m${ESC}[33mbold${ESC}[0m text`), frame[2]);
  // line 4: fence line dimmed
  assert.ok(frame[4]?.includes(`${ESC}[2m`), `frame[4]=${frame[4]}`);
  // line 5: inner code — keyword cyan, number magenta, comment gray
  assert.ok(frame[5]?.includes(`${ESC}[36mconst${ESC}[0m`), `frame[5]=${frame[5]}`);
  assert.ok(frame[5]?.includes(`${ESC}[35m1${ESC}[0m`), `frame[5]=${frame[5]}`);
  assert.ok(frame[5]?.includes(`${ESC}[90m`), `frame[5]=${frame[5]}`);
});

test("italic gets a color and links are underlined with a dim url", () => {
  const doc = parseDocument("*it* and [site](https://x.y)\n");
  const [line] = render(doc, createViewport(0, 0, 80, 1), {
    color: true,
    deco: true,
    marks: false,
  });
  assert.ok(line?.includes(`${ESC}[3m${ESC}[35mit${ESC}[0m`), line);
  assert.ok(
    line?.includes(`${ESC}[4m${ESC}[34msite${ESC}[0m ${ESC}[2m(https://x.y)${ESC}[0m`),
    line,
  );
});

test("emphasis/syntax flags switch inline colors and highlighting off", () => {
  const doc = parseDocument("- **b**\n```ts\nconst n = 1;\n```\n");
  const vp = createViewport(0, 0, 80, 4);
  const on = render(doc, vp, { color: true, deco: true, marks: false });
  assert.ok(on[0]?.includes(`${ESC}[1m${ESC}[33mb${ESC}[0m`), on[0]);
  assert.notEqual(on[2], "  const n = 1;");
  const off = render(doc, vp, { color: true, emphasis: false, syntax: false });
  assert.equal(off[0], `${ESC}[32m>${ESC}[0m ${ESC}[36m-${ESC}[0m **b**`);
  assert.equal(off[2], "  const n = 1;");
});
