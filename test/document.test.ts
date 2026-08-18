import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { parseDocument, slugify, findHeading, type Heading } from "../src/core/document.ts";

describe("slugify", () => {
  test("lowercases, dashes on non-alphanumerics, trims edge dashes", () => {
    assert.equal(slugify("Hello, World!"), "hello-world");
    assert.equal(slugify("Papercuts & Unsure"), "papercuts-unsure");
    assert.equal(slugify("Agent behavior (P17 split)"), "agent-behavior-p17-split");
    assert.equal(slugify("  spaced  "), "spaced");
    assert.equal(slugify("a.b.c"), "a-b-c");
  });
});

describe("parseDocument", () => {
  test("empty input", () => {
    const doc = parseDocument("");
    assert.equal(doc.lines.length, 1);
    assert.equal(doc.headings.length, 0);
    assert.equal(doc.codeBlocks.length, 0);
  });

  test("ATX headings produce slugs, levels, paths, and line numbers", () => {
    const md = "# Title\n\n## Sub\n\n### Deep\n\n## Sibling\n";
    const doc = parseDocument(md);
    assert.equal(doc.headings.length, 4);
    const [a, b, c, s] = doc.headings as [Heading, Heading, Heading, Heading];

    assert.equal(a.level, 1);
    assert.equal(a.slug, "title");
    assert.deepEqual(a.path, ["title"]);
    assert.equal(a.startLine, 0);

    assert.equal(b.level, 2);
    assert.deepEqual(b.path, ["title", "sub"]);
    assert.equal(b.startLine, 2);

    assert.equal(c.level, 3);
    assert.deepEqual(c.path, ["title", "sub", "deep"]);
    assert.equal(c.startLine, 4);

    assert.equal(s.level, 2);
    assert.deepEqual(s.path, ["title", "sibling"]);
    assert.equal(s.startLine, 6);
  });

  test("does not treat `#` inside a fenced code block as a heading", () => {
    const md = "# Real\ntext\n```ts\n# fake heading in code\n```\n";
    const doc = parseDocument(md);
    assert.equal(doc.headings.length, 1);
    assert.equal(doc.headings[0]!.slug, "real");
  });

  test("fenced code blocks record fence, language, and line span", () => {
    const md = "# Title\n\ntext\n\n```ts\nconst x = 1\n```\n";
    const doc = parseDocument(md);
    assert.equal(doc.codeBlocks.length, 1);
    const cb = doc.codeBlocks[0]!;
    assert.equal(cb.fence, "```");
    assert.equal(cb.lang, "ts");
    assert.equal(cb.startLine, 4);
    assert.equal(cb.endLine, 6);
  });

  test("tilde fences are supported and independent from backtick fences", () => {
    const md = "~~~rust\nlet x = 1;\n~~~\n\n```\n// backtick block\n```\n";
    const doc = parseDocument(md);
    assert.equal(doc.codeBlocks.length, 2);
    assert.equal(doc.codeBlocks[0]!.fence, "~~~");
    assert.equal(doc.codeBlocks[0]!.lang, "rust");
    assert.equal(doc.codeBlocks[1]!.fence, "```");
    assert.equal(doc.codeBlocks[1]!.lang, null);
  });

  test("a fence closes only on a matching fence, so # inside survives", () => {
    const md = "```ts\n# inside\n```\n# outside\n";
    const doc = parseDocument(md);
    assert.equal(doc.headings.length, 1);
    assert.equal(doc.headings[0]!.slug, "outside");
    assert.equal(doc.codeBlocks.length, 1);
  });
});

describe("findHeading", () => {
  test("resolves a slug path to its heading", () => {
    const md = "# Top\n## Child\n### Leaf\n## Other\n";
    const doc = parseDocument(md);
    const leaf = findHeading(doc, ["top", "child", "leaf"]);
    assert.ok(leaf);
    assert.equal(leaf!.level, 3);
    assert.equal(leaf!.startLine, 2);
  });

  test("returns undefined for an unknown path", () => {
    const doc = parseDocument("# Top\n## Child\n");
    assert.equal(findHeading(doc, ["top", "nope"]), undefined);
  });
});
