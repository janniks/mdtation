import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { QUIET } from "../src/core/watch.ts";
import { run, watching } from "../src/verbs.ts";

const dir = mkdtempSync(join(tmpdir(), "mdt-verbs-"));
const file = join(dir, "doc.md");

describe("verbs", () => {
  before(() => {
    process.env.MDTATION_HOME = join(dir, "home");
    writeFileSync(file, "# Title\n\nfirst\nsecond\n");
  });

  test("add then list prints the comment on its line", async () => {
    const added = await run(file, "add", ["looks wrong"], { line: "3" }, "bot");
    assert.match(added.err ?? "", /^added /);
    const list = await run(file, "list", [], {}, "bot");
    assert.match(list.out ?? "", /Line 3/);
    assert.match(list.out ?? "", /looks wrong/);
  });

  test("add refuses a line outside the document", async () => {
    await assert.rejects(run(file, "add", ["x"], { line: "9" }, "bot"), /outside 1\.\./);
  });

  test("mark then list --since last hides what came before", async () => {
    await run(file, "mark", [], {}, "bot");
    const none = await run(file, "list", [], { since: "last" }, "bot");
    assert.equal(none.out?.trim().split("\n").length, 1);
    await new Promise((r) => setTimeout(r, 5));
    await run(file, "add", ["later"], { line: "4" }, "bot");
    const one = await run(file, "list", [], { since: "last" }, "bot");
    assert.match(one.out ?? "", /later/);
    assert.doesNotMatch(one.out ?? "", /looks wrong/);
  });

  test("status reports the counts", async () => {
    const s = await run(file, "status", [], {}, "bot");
    assert.match(s.out ?? "", /live      2/);
  });

  test("watch hands over comments by others as they land, in json", async () => {
    const got: string[] = [];
    const stop = watching(file, "bot", true, (s) => got.push(s));
    await new Promise((r) => setTimeout(r, 50));
    await run(file, "add", ["from a human"], { line: "2", human: true }, "jannik");
    await run(file, "add", ["from the bot"], { line: "2" }, "bot");
    await new Promise((r) => setTimeout(r, QUIET * 3));
    stop();
    assert.equal(got.length, 1);
    assert.equal(JSON.parse(got[0]!).text, "from a human");
  });
});
