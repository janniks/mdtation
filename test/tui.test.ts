import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { CommentStore } from "../src/core/comment.ts";
import { parseDocument } from "../src/core/document.ts";
import { log, path } from "../src/core/store.ts";
import { tui, usable, type Key } from "./pty.ts";

test("count three source lines, comment, quit", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "First\nSecond\nThird\nDistinct fourth line\nLast");
  const { home } = tui(file, [
    [1500, "3j"],
    [400, "c"],
    [400, "line four\\r"],
    [1000, "q"],
  ]);
  const store = CommentStore.fromJSON(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
  );
  assert.equal(store.live().length, 1);
  assert.equal(store.live()[0]!.text, "line four");
  assert.equal(
    store.resolve(store.live()[0]!.anchor, parseDocument(readFileSync(file, "utf-8")))?.startLine,
    3,
  );
});

test(
  "counts cross wraps and notes; arrows, zero, cancellation, and input digits",
  { skip: !usable },
  () => {
    const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
    writeFileSync(file, `${"Wrapped words ".repeat(12)}\nSecond\nThird\nFourth\nLast`);
    const { home } = tui(
      file,
      [
        [1500, "c"],
        [300, "seed\\r"],
        [400, "j2\\033[Bc"],
        [300, "down 123\\r"],
        [400, "1\\033[Ac"],
        [300, "up\\r"],
        [400, "01kc"],
        [300, "leading zero\\r"],
        [400, "j0jc"],
        [300, "zero on wrap\\r"],
        [400, "2xjc"],
        [300, "unbound clears\\r"],
        [400, "G2\\033"],
        [300, "kc"],
        [300, "escape clears\\r"],
        [400, "2gc"],
        [300, "top\\r"],
        [400, "2Gc"],
        [300, "bottom\\r"],
        [400, "99999kc"],
        [300, "clamped\\r"],
        [600, "q"],
      ],
      24,
      50,
    );
    const store = CommentStore.fromJSON(
      JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
    );
    const doc = parseDocument(readFileSync(file, "utf-8"));
    assert.deepEqual(
      store.live().map((c) => [c.text, store.resolve(c.anchor, doc)?.startLine]),
      [
        ["seed", 0],
        ["down 123", 2],
        ["up", 1],
        ["leading zero", 0],
        ["zero on wrap", 0],
        ["unbound clears", 0],
        ["escape clears", 3],
        ["top", 0],
        ["bottom", 4],
        ["clamped", 0],
      ],
    );
    assert.ok(store.live().find((c) => c.text === "zero on wrap")?.quote);
  },
);

for (const [mode, index] of [
  ["off", 0],
  ["absolute", 1],
  ["relative", 2],
] as const) {
  test(`selection and checkbox/table clicks with ${mode} numbers`, { skip: !usable }, () => {
    const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
    writeFileSync(
      file,
      "# Header\nAlpha beta\nGamma delta\n- [ ] task\n| A | B |\n| - | - |\n| a | b |",
    );
    const keys: Key[] = [
      [1500, "/"],
      [300, `show ${mode === "off" ? "relative" : mode} line numbers\\r`],
    ];
    // Set a visible mode before hiding, so off also exercises persistence.
    if (!index) {
      keys.push([300, "/"], [300, "hide line numbers\\r"]);
    }
    const width = index ? 4 : 2;
    // Column clicks need the pipes on screen; inline notes would shift the rows below.
    keys.push([300, "/"], [300, "show table pipes\\r"]);
    keys.push([300, "/"], [300, "hide own comments inline\\r"]);
    keys.push(
      [400, "\\033[<0;2;4M"],
      [200, `\\033[<32;${width + 6};5M`],
      [200, `\\033[<0;${width + 6};5m`],
      [400, "selected 123\\r"],
      [400, `\\033[<0;${width + 11};4M`],
      [200, `\\033[<32;${width + 7};4M`],
      [200, `\\033[<0;${width + 7};4m`],
      [400, "reverse\\r"],
      [400, `\\033[<0;${width + 4};6M\\033[<0;${width + 4};6m`],
      [400, `\\033[<0;${width + 3};8M\\033[<0;${width + 3};8m`],
      [400, "\\023"],
      [600, "q"],
    );
    const { home } = tui(file, keys);
    const store = CommentStore.fromJSON(
      JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
    );
    assert.equal(store.live().length, 2);
    assert.equal(store.live()[0]!.text, "selected 123");
    assert.equal(store.live()[0]!.quote, "Alpha beta\nGamma");
    // The cursor slab pads the row, so a drag past the line end stops inside the padding.
    assert.equal(store.live()[1]!.quote, "beta");
    assert.match(readFileSync(file, "utf-8"), /- \[x\] task/);
    assert.notEqual(readFileSync(file, "utf-8").split("\n")[5], "| - | - |");
    assert.equal(
      JSON.parse(readFileSync(join(home, "settings.json"), "utf-8")).picks.viewNumbers,
      index,
    );
  });
}

test(
  "counted hidden tail lands on the first wrapped row of the preceding line",
  { skip: !usable },
  () => {
    const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
    writeFileSync(file, `First row ${"word ".repeat(25)}\nHidden tail`);
    const { home } = tui(
      file,
      [
        [1500, "/"],
        [300, "flow paragraphs\\r"],
        [400, "1jc"],
        [300, "first segment\\r"],
        [600, "q"],
      ],
      24,
      50,
    );
    const store = CommentStore.fromJSON(
      JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
    );
    assert.equal(store.live().length, 1);
    assert.match(store.live()[0]!.quote!, /^First row /);
    assert.equal(
      store.resolve(store.live()[0]!.anchor, parseDocument(readFileSync(file, "utf-8")))?.startLine,
      0,
    );
  },
);

test("go to source line 3, comment, quit", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\nDistinct third line\nLast line\n");
  const { home } = tui(file, [
    [1500, ":3\\r"],
    [400, "c"],
    [400, "line three\\r"],
    [1000, "q"],
  ]);
  const store = CommentStore.fromJSON(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
  );
  assert.equal(store.live().length, 1);
  assert.equal(store.live()[0]!.text, "line three");
  assert.equal(
    store.resolve(store.live()[0]!.anchor, parseDocument(readFileSync(file, "utf-8")))?.startLine,
    2,
  );
});

test("cancelled, empty, and invalid jumps preserve the cursor", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\nLast line");
  const { raw, home } = tui(file, [
    [1500, "G:1"],
    [400, "\\033"],
    [400, ":\\r"],
    [400, ":   \\r"],
    [400, ":1e2\\r"],
    [400, "c"],
    [400, "still last\\r"],
    [1000, "q"],
  ]);
  const store = CommentStore.fromJSON(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
  );
  // The renderer emits changed cells only; some letters from VIEW stay in place.
  assert.match(stripVTControlCharacters(raw), /INVALID/);
  assert.equal(store.live().length, 1);
  assert.equal(store.live()[0]!.text, "still last");
  assert.equal(
    store.resolve(store.live()[0]!.anchor, parseDocument(readFileSync(file, "utf-8")))?.startLine,
    2,
  );
});

test(
  "palette jumps keep hidden frontmatter source numbers; help lists the key",
  { skip: !usable },
  () => {
    const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
    writeFileSync(file, "---\ntitle: Hidden\n---\n\n# Visible\nSource six\n");
    const { raw, home } = tui(
      file,
      [
        [1500, "/"],
        [400, "go to line\\r"],
        [400, "6\\r"],
        [400, "c"],
        [400, "source six\\r"],
        [600, ":1\\r"],
        [400, "c"],
        [400, "first reachable\\r"],
        [600, "?"],
        [400, "q"],
        [400, "q"],
      ],
      48,
    );
    const store = CommentStore.fromJSON(
      JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")),
    );
    const doc = parseDocument(readFileSync(file, "utf-8"));
    assert.match(stripVTControlCharacters(raw), /Go to line +:/);
    assert.deepEqual(
      store.live().map((c) => [c.text, store.resolve(c.anchor, doc)?.startLine]),
      [
        ["source six", 5],
        ["first reachable", 4],
      ],
    );
  },
);

test("open, comment, quit: the events log tells the story", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\none\ntwo\n");
  const { home } = tui(file, [
    [1500, "jjc"],
    [400, "hello\\r"],
    [1000, "q"],
  ]);
  const events = readFileSync(join(home, "comments", basename(log(file))), "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l).event);
  assert.deepEqual(events, ["open", "comment", "quit"]);
  assert.equal(
    JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8")).comments[0]
      .text,
    "hello",
  );
});

test("d archives the thread under the cursor", { skip: !usable }, () => {
  const file = join(mkdtempSync(join(tmpdir(), "mdt-tui-")), "doc.md");
  writeFileSync(file, "# T\n\none\ntwo\n");
  const { home } = tui(file, [
    [1500, "jjc"],
    [400, "bye\\r"],
    [600, "d"],
    [800, "q"],
  ]);
  const store = JSON.parse(readFileSync(join(home, "comments", basename(path(file))), "utf-8"));
  assert.ok(store.comments[0].archivedAt, "comment archived");
  const events = readFileSync(join(home, "comments", basename(log(file))), "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .filter((e) => e.event === "comment")
    .map((e) => e.what);
  assert.deepEqual(events, ["new", "archive"]);
});
