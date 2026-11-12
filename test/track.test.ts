import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { track } from "../src/core/track.ts";

const old = [
  "# Plan", // 0
  "", // 1
  "First we read the file from disk.", // 2
  "Then we parse every line into blocks.", // 3
  "", // 4
  "## Steps", // 5
  "", // 6
  "- [ ] write the parser", // 7
  "- [ ] write the renderer", // 8
  "- Good:", // 9
  "", // 10
  "## Notes", // 11
  "", // 12
  "- Good:", // 13
  "The last line of the notes.", // 14
];
/** Where old line `i` lands in `next`, with its confidence. */
const go = (next: string[], i: number) => track(old, next)[i]!;
const at = (next: string[], i: number) => next[go(next, i).to];

describe("track", () => {
  test("lines inserted or deleted above shift the line, fully sure", () => {
    const more = ["intro", "more intro", ...old];
    assert.deepEqual(go(more, 8), { to: 10, sure: 1 });
    assert.deepEqual(go(old.slice(2), 8), { to: 6, sure: 1 });
  });

  test("a reworded line with a shift above is found, less than sure", () => {
    const next = ["intro", ...old];
    next[4] = "Then we parse each line into a list of blocks.";
    const s = go(next, 3);
    assert.equal(s.to, 4);
    assert.ok(s.sure > 0.6 && s.sure < 1);
  });

  test("blank lines and repeated lines follow their neighbours", () => {
    const next = ["intro", "", ...old];
    assert.equal(go(next, 4).to, 6);
    assert.equal(go(next, 9).to, 11);
    assert.equal(go(next, 13).to, 15);
  });

  test("a ticked checkbox is the same line", () => {
    const next = old.map((l) => l.replace("- [ ] write the parser", "- [x] write the parser"));
    assert.deepEqual(go(next, 7), { to: 7, sure: 1 });
  });

  test("a moved section takes its lines along", () => {
    const next = [...old.slice(0, 5), ...old.slice(11), "", ...old.slice(5, 10)];
    assert.equal(at(next, 8), "- [ ] write the renderer");
    assert.equal(at(next, 14), "The last line of the notes.");
  });

  test("a deleted line lands on its neighbour in the same block, unsure", () => {
    const next = old.filter((_, i) => i !== 8);
    assert.equal(at(next, 8), "- [ ] write the parser");
    assert.equal(go(next, 8).sure, 0);
    // The first line of a block goes down instead of across the blank line.
    assert.equal(
      at(
        old.filter((_, i) => i !== 2),
        2,
      ),
      "Then we parse every line into blocks.",
    );
  });

  test("a line replaced past recognition keeps its place", () => {
    const next = [...old];
    next[3] = "Completely different words here now.";
    assert.deepEqual(go(next, 3), { to: 3, sure: 0.5 });
  });

  test("a cut tail and an empty file still give a real line", () => {
    assert.equal(go(old.slice(0, 6), 14).to, 5);
    assert.equal(go([], 14).to, 0);
  });
});
