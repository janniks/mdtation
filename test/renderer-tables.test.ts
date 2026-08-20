import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument } from "../src/core/document.ts";
import { render } from "../src/core/renderer.ts";
import { layout as tableLayout } from "../src/core/table.ts";
import { createViewport } from "../src/core/viewport.ts";
import { displayWidth } from "../src/core/unicode.ts";

const ESC = "\x1b";

describe("renderer tables", () => {
  test("aligns columns to the widest cell (plain golden)", () => {
    const md = "| n | age |\n| --- | --- |\n| Al | 3 |\n| B | 2 |\n";
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 99, 80, 4));
    assert.equal(frame[0]!, "  | n   | age |");
    assert.equal(frame[1]!, "  | --- | --- |");
    assert.equal(frame[2]!, "  | Al  | 3   |");
    assert.equal(frame[3]!, "  | B   | 2   |");
  });

  test("cursor gutter tracks the table row under the cursor", () => {
    const md = "| n | age |\n| --- | --- |\n| Al | 3 |\n";
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 2, 80, 3));
    assert.equal(frame[0]!, "  | n   | age |");
    assert.equal(frame[1]!, "  | --- | --- |");
    assert.equal(frame[2]!, "> | Al  | 3   |");
  });

  test("color mode paints borders gray and dims the separator", () => {
    const md = "| name | age |\n| --- | --- |\n| Ali | 30 |\n";
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 99, 80, 3), { color: true });
    assert.ok(frame[0]!.includes(`${ESC}[90m|`), frame[0]); // gray borders
    assert.ok(frame[1]!.includes(`${ESC}[2m`), frame[1]); // sep dimmed
    assert.ok(frame[2]!.includes(`${ESC}[90m|`), frame[2]);
  });

  test("a table inside a fenced code block is left untouched", () => {
    const md = "```ts\n| a | b |\n| - | - |\n| 1 | 2 |\n```\n";
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 99, 80, 5));
    assert.equal(frame[0]!, "  ```ts");
    assert.equal(frame[1]!, "  | a | b |");
    assert.equal(frame[2]!, "  | - | - |");
    assert.equal(frame[3]!, "  | 1 | 2 |");
    assert.equal(frame[4]!, "  ```");
  });

  test("two cells but no separator row is NOT treated as a table", () => {
    const md = "| a | b |\n| c | d |\nplain\n";
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 99, 80, 3));
    assert.equal(frame[0]!, "  | a | b |");
    assert.equal(frame[1]!, "  | c | d |");
    assert.equal(frame[2]!, "  plain");
  });

  test("does not crash on emoji ZWJ / CJK inside table cells", () => {
    const emoji = String.fromCodePoint(0x1f9d1, 0x200d, 0x1f917, 0x200d, 0x1f9d1); // 🧑‍🤗‍🧑
    assert.equal(displayWidth(emoji), 6);
    const md = `| name | sig |\n| --- | --- |\n| 团队 | ${emoji} |\n`;
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 99, 80, 3));
    // no lone surrogate -> the whole frame round-trips through UTF-8
    Buffer.from(frame.join("\n"), "utf-8");
    assert.equal(frame[0]!, "  | name | sig    |");
    assert.equal(frame[1]!, "  | ---  | ---    |");
    assert.equal(frame[2]!, `  | 团队 | ${emoji} |`);
  });

  test("table row wider than the pane is emitted as a single unwrapped row", () => {
    const md = `| a | b | c |\n| - | - | - |\n| ${"x".repeat(60)} | 1 | 2 |\n`;
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 99, 20, 3));
    assert.equal(frame.length, 3);
    assert.ok(frame[2]!.startsWith("  | "), frame[2]);
    assert.ok(frame[2]!.includes("x".repeat(60)));
  });

  test("renders complex ZWJ family sequences without a lone-surrogate crash", () => {
    const families = [
      String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467), // 👨‍👩‍👧
      String.fromCodePoint(0x1f469, 0x200d, 0x1f469, 0x200d, 0x1f467, 0x200d, 0x1f466), // 👩‍👩‍👧‍👦
      String.fromCodePoint(0x1f9d1, 0x200d, 0x1f91d, 0x200d, 0x1f9d1), // 🧑‍🤝‍🧑
    ];
    for (const emoji of families) {
      const md = `| n | sig |\n| --- | --- |\n| x | ${emoji} |\n`;
      const doc = parseDocument(md);
      const frame = render(doc, createViewport(0, 99, 80, 3));
      Buffer.from(frame.join("\n"), "utf-8"); // no lone surrogate
      assert.ok(
        frame.some((l) => l.includes(emoji)),
        `missing emoji in ${emoji}`,
      );
    }
  });
});

describe("tableLayout (pure unit)", () => {
  test("pads the narrowest column to the widest cell", () => {
    const out = tableLayout(["| a | bb |", "| c | d |"]);
    assert.equal(out[0]!, "| a | bb |");
    assert.equal(out[1]!, "| c | d  |");
  });

  test("single-cell rows are laid out with no inter-column padding logic", () => {
    const out = tableLayout(["| a |", "| b |"]);
    assert.equal(out[0]!, "| a |");
    assert.equal(out[1]!, "| b |");
  });

  test("does not throw on empty input", () => {
    assert.deepEqual(tableLayout([]), []);
  });
});
