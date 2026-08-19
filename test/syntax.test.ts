import { strict as assert } from "node:assert";
import { test } from "node:test";
import { highlight } from "../src/core/syntax.ts";

test("highlight keyword, number, string, comment", () => {
  const out = highlight("const n = 42; // hi", "ts");
  assert.ok(out.includes("\x1b[36mconst\x1b[0m"));
  assert.ok(out.includes("\x1b[35m42\x1b[0m"));
  assert.ok(out.includes("= "));
  assert.ok(out.includes("\x1b[90m// hi\x1b[0m"));
});

test("plain identifier is unstyled", () => {
  assert.equal(highlight("foo", "ts"), "foo");
});

test("unknown language is plain", () => {
  assert.equal(highlight("const x = 1;", "brainfuck"), "const x = 1;");
});

test("null language is plain", () => {
  assert.equal(highlight("const x", null), "const x");
});

test("string literal including slashes is consumed whole", () => {
  const out = highlight('const u = "https://x";', "ts");
  assert.ok(out.includes('\x1b[32m"https://x"\x1b[0m'));
});
