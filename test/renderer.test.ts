import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { createViewport } from "../src/core/viewport.ts";
import { parseDocument } from "../src/core/document.ts";
import { gutter, hidden, render, span } from "../src/core/renderer.ts";
import { SGR, strip } from "../src/core/sgr.ts";

// No trailing newline -> 8 clean lines, easy to assert exactly.
const md = "# A\n## B\n### C\nhello\n```ts\nconst x = 1\n```\n# D";

describe("line numbers", () => {
  test("absolute labels and relative distances use source lines", () => {
    const doc = parseDocument("one\ntwo\nthree\nfour\nfive");
    const vp = createViewport(0, 3, 80, 5);
    assert.deepEqual(render(doc, vp, { numbers: "absolute", markers: [1] }), [
      "1   one",
      "2 ▶ two",
      "3   three",
      "4 > four",
      "5   five",
    ]);
    assert.deepEqual(render(doc, vp, { numbers: "relative" }), [
      "3   one",
      "2   two",
      "1   three",
      "4 > four",
      "1   five",
    ]);
    assert.deepEqual(render(doc, vp, { numbers: "off" }), render(doc, vp));
    assert.equal(gutter(doc), 2);
  });

  test("width and right alignment follow the last source number in both modes", () => {
    for (const [total, width] of [
      [9, 4],
      [10, 5],
      [100, 6],
    ] as const) {
      const doc = parseDocument(Array.from({ length: total }, () => "x").join("\n"));
      for (const numbers of ["absolute", "relative"] as const) {
        assert.equal(gutter(doc, { numbers }), width);
        for (const cursor of [0, total - 1]) {
          const out = render(doc, createViewport(0, cursor, 80, total), { numbers });
          assert.equal(out[0]!.length, width + 1);
          assert.equal(out[cursor], `${String(cursor + 1).padStart(width - 3)} > x`);
        }
      }
    }
    assert.equal(gutter(parseDocument(""), { numbers: "absolute" }), 4);
  });

  test("wrapped and inline rows have blank labels, even under the caret or after scrolling", () => {
    const doc = parseDocument("aaaa bbbb\nz");
    const vp = createViewport(0, 0, 9, 9);
    for (const numbers of ["absolute", "relative"] as const) {
      const opts = { numbers, inline: new Map([[0, ["note"]]]) };
      assert.deepEqual(render(doc, vp, { ...opts, seg: 1 }), [
        "1   aaaa",
        "  > bbbb",
        "    note",
        `${numbers === "absolute" ? 2 : 1}   z`,
      ]);
      assert.deepEqual(render(doc, { ...vp, skip: 1 }, { ...opts, seg: 2 }), [
        "    bbbb",
        "  > note",
        `${numbers === "absolute" ? 2 : 1}   z`,
      ]);
      assert.deepEqual(render(doc, { ...vp, skip: 2 }, { ...opts, seg: 2 })[0], "  > note");
      assert.equal(span(doc, 0, vp, opts), 3);
      assert.equal(render(doc, vp, opts).length, span(doc, 0, vp, opts) + span(doc, 1, vp, opts));
    }
  });

  test("number styling is dim and outside the text highlight and comment mark", () => {
    const out = render(parseDocument("x"), createViewport(0, 0, 8, 1), {
      numbers: "absolute",
      color: true,
      highlight: true,
      markers: [0],
    });
    assert.equal(
      out[0],
      `${SGR.dim}1 ${SGR.reset}${SGR.bgYellow}${SGR.black}>${SGR.reset} ${SGR.bgLine}x   ${SGR.reset}`,
    );
    assert.equal(strip(out[0]!), "1 > x   ");
  });

  test("hidden frontmatter and flowed lines retain source numbers", () => {
    const doc = parseDocument("---\ntitle: T\n---\n\n# H\nOne.\nTwo.\n\nEnd.");
    assert.deepEqual(
      render(doc, createViewport(0, 4, 20, 9), { numbers: "absolute", flow: true }),
      ["2   title: T", `3   ${"─".repeat(16)}`, "5 > # H", "6   One. Two.", "8   ", "9   End."],
    );
    assert.equal(render(doc, createViewport(4, 4, 20, 2), { numbers: "absolute" })[0], "5 > # H");
  });

  test("tables use the reduced width and leave inline labels blank", () => {
    const doc = parseDocument("| a | b |\n| - | - |\n| c | d |");
    const vp = createViewport(0, 0, 12, 9);
    const opts = { numbers: "absolute", inline: new Map([[0, ["note"]]]), seg: 1 } as const;
    assert.deepEqual(render(doc, vp, opts), [
      "1   | a | b…",
      "  > note",
      "2   | - | -…",
      "3   | c | d…",
    ]);
    assert.equal(span(doc, 0, vp, opts), 2);
  });
});

describe("renderer", () => {
  test("renders the visible window with a cursor gutter", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 1, 80, doc.lines.length));
    assert.equal(frame.length, 8);
    assert.equal(frame[0]!, "  # A");
    assert.equal(frame[1]!, "> ## B");
    assert.equal(frame[5]!, "  const x = 1");
    assert.equal(frame[6]!, "  ```");
    assert.equal(frame[7]!, "  # D");
  });

  test("windows the document by offset/height", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(2, 0, 80, 3));
    assert.equal(frame.length, 3);
    assert.equal(frame[0]!, "  ### C");
    assert.equal(frame[1]!, "  hello");
    assert.equal(frame[2]!, "  ```ts");
  });

  test("marks commented lines in the gutter", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 0, 80, doc.lines.length), {
      markers: [3],
    });
    assert.equal(frame[3]!, "▶ hello");
  });

  test("cursor gutter wins over a comment marker", () => {
    const doc = parseDocument(md);
    const frame = render(doc, createViewport(0, 3, 80, doc.lines.length), { markers: [3] });
    assert.equal(frame[3]!, "> hello");
  });

  test("off-screen cursor leaves no marker", () => {
    const doc = parseDocument(md);
    // cursor at line 7, window only shows line 0
    const frame = render(doc, createViewport(0, 7, 80, 1));
    assert.equal(frame[0]!, "  # A");
  });

  test("empty document renders a single empty cursor line", () => {
    const doc = parseDocument("");
    assert.deepEqual(render(doc, createViewport(0, 0, 80, 10)), ["> "]);
  });

  test("zero height renders nothing", () => {
    const doc = parseDocument(md);
    assert.deepEqual(render(doc, createViewport(0, 0, 80, 0)), []);
  });
});

test("gutter shows the comment count past one, and a custom caret", () => {
  const doc = parseDocument("a\nb\nc\n");
  const vp = createViewport(0, 0, 80, 3);
  assert.equal(render(doc, vp, { markers: [1, 1, 2] })[1], "2 b");
  assert.equal(render(doc, vp, { caret: "▶" })[0], "▶ a");
  const color = render(doc, vp, { color: true, deco: true, marks: false, markers: [1] })[1];
  assert.equal(color, "\x1b[43m\x1b[30m \x1b[0m b");
  const both = render(doc, createViewport(0, 1, 80, 3), {
    color: true,
    deco: true,
    markers: [1],
  })[1];
  assert.equal(both, "\x1b[43m\x1b[30m>\x1b[0m b");
});

const show = (src: string, opts = {}) =>
  render(parseDocument(src), createViewport(0, 99, 80, 99), opts);

const hide = { hashes: false, marks: false, links: false, fences: "fence", pipes: false } as const;

describe("hide markup", () => {
  const rule = "─".repeat(78);

  test("strips inline marks, link urls and heading hashes", () => {
    const out = show("## Hi\n**b** __b__ *i* _i_ ~~s~~ `c` [t](http://x)", { ...hide });
    assert.deepEqual(out, ["  Hi", "  b b i i s c t"]);
  });

  test("fence rows become plain rules", () => {
    const out = show("```ts\nconst x = 1\n```", { ...hide });
    assert.deepEqual(out, [`  ${"─".repeat(11)}`, "  const x = 1", `  ${"─".repeat(11)}`]);
  });

  test("thematic breaks are rules; frontmatter drops its opener and closes full-width", () => {
    assert.deepEqual(show("---\ntitle: T\n---\n\n***"), [
      "  title: T",
      `  ${"─".repeat(78)}`,
      `  ${rule}`,
    ]);
    assert.equal(show("___", { ...hide })[0], `  ${rule}`);
  });

  test("styling still applies to the stripped text", () => {
    const out = show("**b** [t](u)", { ...hide, color: true, deco: true, marks: false });
    assert.equal(out[0], "  \x1b[1m\x1b[33mb\x1b[0m \x1b[4m\x1b[34mt\x1b[0m");
  });

  test("wrapping measures the stripped text and re-opens styles per chunk", () => {
    const doc = parseDocument("**abcdef**");
    assert.deepEqual(render(doc, createViewport(0, 0, 6, 9), { ...hide }), ["> abcd", "  ef"]);
    const styled = render(doc, createViewport(0, 0, 6, 9), {
      ...hide,
      color: true,
      deco: true,
      marks: false,
    });
    assert.deepEqual(styled, [
      "\x1b[32m>\x1b[0m \x1b[1m\x1b[33mabcd\x1b[0m",
      "  \x1b[1m\x1b[33mef\x1b[0m",
    ]);
  });

  test("tables drop edge pipes, use │ between cells and a rule for the separator", () => {
    const out = show("| a | bb |\n| - | - |\n| c | d |", { ...hide });
    assert.deepEqual(out, ["  a │ bb", `  ${"─".repeat(6)}`, "  c │ d "]);
  });

  test("ragged source tables are re-laid from their cells in both modes", () => {
    const src = "a|bb\n--|--\n|ccc | d\n| e|f|";
    assert.deepEqual(show(src), [
      "  | a   | bb |",
      "  | --- | -- |",
      "  | ccc | d  |",
      "  | e   | f  |",
    ]);
    assert.equal(show(src, { ...hide })[2], "  ccc │ d ");
  });
});

test("task boxes follow the checkbox style", () => {
  const doc = parseDocument("- [ ] a\n- [x] b\n");
  const vp = createViewport(0, 0, 80, 2);
  assert.deepEqual(
    render(doc, vp, { markers: [], check: 0 }).map((l) => l.slice(2)),
    ["- [ ] a", "- [x] b"],
  );
  assert.deepEqual(
    render(doc, vp, { check: 2 }).map((l) => l.slice(2)),
    ["- ○ a", "- ● b"],
  );
  assert.equal(
    render(doc, vp, { check: 1, color: true, deco: true, marks: false })[1]!.slice(2),
    "\x1b[36m-\x1b[0m \x1b[32m✓\x1b[0m b",
  );
});

test("fence styles: ticks as written, fence as a rule, hide drops the rows", () => {
  const doc = parseDocument("```ts\nx\n```\n");
  const vp = createViewport(0, 0, 80, 3);
  assert.equal(render(doc, vp, { fences: "ticks" })[0], "> ```ts");
  assert.equal(render(doc, vp, { fences: "fence" })[0], "> ───"); // min 3 wide
  assert.deepEqual(render(doc, vp, { fences: "hide" }), ["  x", "  "]); // fills the freed row
});

describe("prose", () => {
  const src = "# T\n\nOne.\nTwo.\n\n- item\nThree.\n";
  const vp = createViewport(0, 0, 80, 10);
  test("flow joins a paragraph's lines into one row and hides the rest", () => {
    const out = render(parseDocument(src), vp, { flow: true });
    assert.deepEqual(out, ["> # T", "  ", "  One. Two.", "  ", "  - item", "  Three.", "  "]);
    assert.equal(hidden(parseDocument(src), 3, { flow: true }), true);
    assert.equal(hidden(parseDocument(src), 2, { flow: true }), false);
  });
  test("indent prefixes the first line of each paragraph only", () => {
    const out = render(parseDocument(src), vp, { indent: true });
    assert.deepEqual(out.slice(2, 4), ["    One.", "  Two."]);
  });
  test("indent leaves a paragraph's wrapped rows flush left", () => {
    const out = render(parseDocument("aaaa bbbb cccc"), createViewport(0, 0, 10, 5), {
      indent: true,
    });
    assert.deepEqual(out, [">   aaaa", "  bbbb", "  cccc"]);
  });
  test("flow wraps the joined text", () => {
    const out = render(parseDocument("aaaa bbbb\ncccc dddd"), createViewport(0, 0, 12, 5), {
      flow: true,
    });
    assert.deepEqual(out, ["> aaaa bbbb", "  cccc dddd"]);
  });
});

test("blockquote styles: bar (default), > as written, hide", () => {
  const doc = parseDocument("> a\n>> b\n");
  const vp = createViewport(0, 0, 80, 2);
  assert.deepEqual(render(doc, vp), ["> │ a", "  │ │ b"]);
  assert.deepEqual(render(doc, vp, { quote: ">" }), ["> > a", "  >> b"]);
  assert.deepEqual(render(doc, vp, { quote: "hide" }), [">   a", "      b"]);
});

test("blockquote stays gray after inline styles inside it", () => {
  const out = render(parseDocument("> has **b** in\n"), createViewport(0, 5, 80, 5), {
    color: true,
    deco: true,
    marks: false,
  });
  assert.equal(out[0], "  \x1b[90m│ \x1b[0m\x1b[90mhas \x1b[1m\x1b[33mb\x1b[0m\x1b[90m in\x1b[0m");
});

test("links toggle is independent of inline marks", () => {
  assert.equal(show("**b** [t](http://x)", { marks: false })[0], "  b [t](http://x)");
  assert.equal(show("**b** [t](http://x)", { links: false })[0], "  **b** [t]");
});

test("text decoration renders bold/italic/strike/underline without color", () => {
  const out = show("**b** *i* ~~s~~ [t](u)", { deco: true, marks: false })[0];
  assert.equal(out, "  \x1b[1mb\x1b[0m \x1b[3mi\x1b[0m \x1b[9ms\x1b[0m \x1b[4mt\x1b[0m (u)");
});

test("marks shown: styling wraps the marks instead of stripping them", () => {
  assert.equal(
    show("**b** *i* `c` [t](u)", { deco: true })[0],
    "  \x1b[1m**b**\x1b[0m \x1b[3m*i*\x1b[0m `c` \x1b[4m[t]\x1b[0m(u)",
  );
});

describe("tables in the window", () => {
  const src = "| a | b |\n|---|---|\n| one | two |\n| three | four |\n";
  test("rows stay aligned when the header has scrolled off", () => {
    const out = render(parseDocument(src), createViewport(3, 3, 80, 5));
    assert.equal(out[0], "> | three | four |");
  });
  test("too-wide rows are cut with an ellipsis instead of wrapping", () => {
    const out = render(parseDocument(src), createViewport(0, 9, 12, 5));
    assert.equal(out[2], "  | one   |…");
    assert.equal(out.length, 5); // 4 rows + trailing blank, nothing wrapped
  });
});

describe("highlight the cursor line", () => {
  const doc = parseDocument("aaaa bbbb\nz\n");
  test("the slab spans the pane and leaves the gutter alone", () => {
    const out = render(doc, createViewport(0, 0, 8, 3), { color: true, highlight: true });
    assert.deepEqual(out, [
      "\x1b[32m>\x1b[0m \x1b[100maaaa  \x1b[0m",
      "  \x1b[100mbbbb  \x1b[0m",
      "  z",
    ]);
  });
  test("styling inside re-opens the slab, so a reset cannot cut it short", () => {
    const out = render(parseDocument("**b** c"), createViewport(0, 0, 9, 1), {
      color: true,
      deco: true,
      marks: false,
      highlight: true,
    });
    assert.equal(out[0], "\x1b[32m>\x1b[0m \x1b[100m\x1b[1m\x1b[33mb\x1b[0m\x1b[100m c    \x1b[0m");
  });
  test("plain text mode has no slab to draw", () => {
    const out = render(doc, createViewport(0, 0, 8, 3), { highlight: true });
    assert.deepEqual(out, ["> aaaa", "  bbbb", "  z"]);
  });
});

test("skip starts the window mid-block, so scrolling is row by row", () => {
  const doc = parseDocument("aaaa bbbb cccc\nz\n");
  const vp = { ...createViewport(0, 9, 10, 3), skip: 2 };
  assert.deepEqual(render(doc, vp), ["  cccc", "  z", "  "]);
});

test("span counts inline comment rows, so the scroll margin sees them", () => {
  const doc = parseDocument("a\nb\n");
  const inline = new Map([[0, ["  x  note", "  y  more"]]]);
  assert.equal(span(doc, 0, createViewport(0, 0, 80, 5), { inline }), 3);
  assert.equal(span(doc, 1, createViewport(0, 0, 80, 5), { inline }), 1);
  assert.deepEqual(render(doc, createViewport(0, 9, 80, 5), { inline }), [
    "  a",
    "    x  note",
    "    y  more",
    "  b",
    "  ",
  ]);
});

test("a negative skip shows blank rows above the first line", () => {
  const doc = parseDocument("a\nb\nc\nd");
  const out = render(doc, { ...createViewport(0, 0, 10, 3), skip: -2 }, {});
  assert.equal(out.length, 3);
  assert.deepEqual(out.slice(0, 2), ["", ""]);
  assert.match(out[2]!, /a/);
});
