import { describe, it } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { parseDocument } from "../src/core/document.ts";
import { sendFormat } from "../src/core/sendformat.ts";
import type { Comment, Anchor } from "../src/core/comment.ts";

function doc(text: string) {
  return parseDocument(text);
}

function c(anchor: Anchor, text: string): Comment {
  return { id: "test", anchor, text, createdAt: 0 };
}

describe("sendFormat", () => {
  it("heading-anchored comment", () => {
    const d = doc("# H1\n## H2\nbody");
    const anchor: Anchor = { kind: "heading", slug: ["h1", "h2"] };
    const out = sendFormat(c(anchor, "note"), d);
    const parts = out.split("\n");
    const jsonLine = parts[0]!;
    const blockquote = parts[1]!;
    const parsed = JSON.parse(jsonLine);
    deepStrictEqual(parsed, {
      type: "mdtation/comment",
      line: 1,
      anchor,
      text: "note",
    });
    strictEqual(blockquote, "> note");
  });

  it("line-anchored comment", () => {
    const d = doc("line 0\nline 1\nline 2");
    const anchor: Anchor = { kind: "line", n: 2 };
    const out = sendFormat(c(anchor, "on line 2"), d);
    const parts = out.split("\n");
    const jsonLine = parts[0]!;
    const blockquote = parts[1]!;
    const parsed = JSON.parse(jsonLine);
    deepStrictEqual(parsed, {
      type: "mdtation/comment",
      line: 2,
      anchor,
      text: "on line 2",
    });
    strictEqual(blockquote, "> on line 2");
  });

  it("unresolvable anchor", () => {
    const d = doc("# H1\nbody");
    const anchor: Anchor = { kind: "heading", slug: ["missing"] };
    const out = sendFormat(c(anchor, "ghost"), d);
    const parts = out.split("\n");
    const jsonLine = parts[0]!;
    const blockquote = parts[1]!;
    const parsed = JSON.parse(jsonLine);
    deepStrictEqual(parsed, {
      type: "mdtation/comment",
      line: null,
      anchor,
      text: "ghost",
    });
    strictEqual(blockquote, "> ghost");
  });
});
