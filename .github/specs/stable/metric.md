# Position metric: where were we after a rewrite

Status: prototype, measured. Scripts and corpus sit next to this file.

## Short answer

- Do not resolve anchors one by one. Map the whole old text onto the whole new text, once per save.
- One function: `track(old, next): Spot[]`. One `Spot { to, sure }` per old line.
- It is not a diff. It is a matching: unique lines first, then grow, then fuzzy, then fill holes by position.
- Live path: `old` is the text the TUI just had.
- Stored path: `old` is `base`, the text the anchors point into, kept in the store file.
- The spec's option B (fingerprints) loses to this on every column. Option A (LCS diff) loses on moves and rewording.

## Candidates

| name | idea | input it needs |
|---|---|---|
| now | exact trimmed text nearest to `n`, else stay on `n` | anchor `{n, text}` |
| A lcs diff | longest common subsequence of lines, changed hunks pair by position | whole old text |
| B fingerprint | per anchor `{n, text, before, after, under}`, Dice plus context score | anchor only |
| track | unique lines, grow, best-first fuzzy, positional hole fill | whole old text |
| track, stored ±2 | same `track`, but the old text is only the anchor line and 2 lines each side | anchor with 5 lines |

- A and B are my builds of the sketches in `anchors-DRAFT.md`. B's weights are guesses, lightly tuned. A tuned B would score a little higher, not a lot.
- All candidates share the same `norm` (case, spacing, list, quote, checkbox marks dropped), so the comparison is about the method.

## Corpus

- 4 real files: `test/tour.md` (52 lines), `README.md` (99), `.github/specs/anchors-DRAFT.md` (129), `.github/plans/terminal-themes.md` (20).
- 15 edit kinds, written by hand as ops on old line numbers (`corpus.ts`):
  - insert a section above, delete a section, light reword, heavy reword, reorder sections
  - tick checkboxes, reflow a paragraph, rewrite a table, truncate the tail
  - a mixed agent revision, a whole-file paraphrase
  - four combos, because real saves shift lines and reword at once: above+heavy, order+light, drop+para, order+para
- 56 old/new pairs, 4123 old lines: 2303 kept, 695 reworded, 177 gone (non-blank), the rest blank.
- Ground truth is by construction: every op says which old lines became which new lines. All lines are scored, not a sample.
- Live chains: per file, 5 saves in a row (above, light, order, mix, heavy), scored after every save against the first text.
- Generated files: `corpus/out/`.

## How a line is scored

- same: old line kept its text. edit: reworded, reflowed. gone: deleted.
- hit: the mapper lands on the right new line. For a reflow, any line of the new paragraph. For a gone line, anywhere in the hole it left (between where its surviving neighbours went).
- edit≤3: within 3 lines.
- wrong section: lands under a different heading than the truth.
- silent wrong: mapper says `sure = 1` and the line is wrong. The worst failure for a comment.
- false lost: the line survived, mapper says gone.
- false found: the line is gone, mapper claims a match.
- blank: hit rate on blank old lines (cursor and window top sit on them).

## Scores

### One shot (old text against one save), non-blank lines

| mapper | same | edit | edit≤3 | gone | wrong section | silent wrong | false lost | false found | blank |
|---|---|---|---|---|---|---|---|---|---|
| now (exact text or n) | 99% | 49% | 65% | 41% | 7% | 1% | 23% | 5% | 59% |
| A lcs diff | 96% | 78% | 82% | 90% | 6% | 0% | 6% | 8% | 92% |
| B fingerprint | 100% | 81% | 86% | 41% | 4% | 0% | 7% | 10% | 91% |
| **track, whole old text** | 100% | 97% | 99% | 97% | 0% | 0% | 3% | 1% | 95% |
| track, stored ±2 lines | 99% | 80% | 83% | 7% | 8% | 1% | 6% | 8% | 91% |

### Hit rate by edit kind (kept, reworded and gone together)

| mapper | above | drop | light | heavy | order | tick | flow | table | tail | mix | para | above+heavy | order+light | drop+para | order+para |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| now | 99% | 79% | 100% | 99% | 98% | 100% | 94% | 97% | 99% | 96% | 79% | 62% | 88% | 40% | 63% |
| A lcs diff | 100% | 100% | 100% | 99% | 81% | 100% | 98% | 97% | 100% | 99% | 96% | 84% | 80% | 78% | 73% |
| B fingerprint | 100% | 79% | 100% | 99% | 100% | 100% | 100% | 99% | 99% | 98% | 92% | 81% | 100% | 64% | 86% |
| track | 100% | 100% | 100% | 99% | 100% | 100% | 100% | 100% | 100% | 100% | 98% | 99% | 100% | 96% | 96% |
| track, stored ±2 | 100% | 78% | 100% | 87% | 100% | 100% | 100% | 98% | 81% | 95% | 87% | 87% | 100% | 65% | 86% |

- Single edit kinds are easy for everyone: a reword that keeps the line count lets "stay on `n`" win by luck.
- The combos separate the field. That is where `now` drops to 40 to 63%.
- A fails on reorder (a diff cannot express a move, the moved block reads as delete plus insert).
- B fails on deleted sections (no idea where the hole is) and claims matches for 10% of gone lines.

### Live session: 5 saves in a row, scored after every save

| mapper | same | edit | edit≤3 | gone | wrong section | silent wrong | false lost | false found | blank |
|---|---|---|---|---|---|---|---|---|---|
| **track, step by step** | 100% | 96% | 100% | 92% | 0% | 0% | 1% | 8% | 99% |
| A lcs, step by step | 89% | 84% | 84% | 85% | 12% | 0% | 12% | 31% | 91% |
| B, re-fingerprinted every step | 100% | 100% | 100% | 65% | 0% | 1% | 3% | 46% | 98% |
| track, first text kept (one shot) | 100% | 93% | 94% | 31% | 2% | 0% | 3% | 8% | 87% |
| track, stored ±2 | 100% | 90% | 90% | 4% | 4% | 1% | 3% | 35% | 84% |
| B fingerprint, stored once | 100% | 83% | 83% | 23% | 3% | 1% | 4% | 42% | 83% |
| now, stored once | 98% | 8% | 9% | 19% | 15% | 2% | 24% | 23% | 21% |

After the fifth save only:

| mapper | same | edit | edit≤3 | gone | wrong section | false lost | false found |
|---|---|---|---|---|---|---|---|
| track, step by step | 100% | 90% | 99% | 93% | 0% | 5% | 7% |
| B, re-fingerprinted every step | 100% | 99% | 100% | 64% | 0% | 16% | 43% |
| track, first text kept | 100% | 83% | 85% | 14% | 9% | 17% | 7% |
| B fingerprint, stored once | 100% | 56% | 56% | 21% | 15% | 22% | 36% |

- Stepping through every save beats any one-shot. Each step is an easy problem.
- B re-fingerprinted every step is good on reworded lines (it searches the whole file with context), but it attaches almost half of the deleted lines to something. That is a comment on the wrong text with a confident face.
- A stale `base` decays: 97% edit hit after one save, 83% after five stacked saves. Still far ahead of a stale fingerprint (56%).

### Time, 2000-line file (`time.ts`)

| mapper | normal save | every line reworded |
|---|---|---|
| now, all lines | 62 ms | 41 ms |
| A lcs diff, all lines | 18 ms | 17 ms |
| B fingerprint, 650 anchors | 1598 ms | 1661 ms |
| track, all lines | 38 ms | 202 ms |
| track, stored ±2, 650 anchors | 3609 ms | 3445 ms |

- `track` maps all 2000 lines in one call, so 650 comments cost the same as one.
- Normal save: about 100 lines reworded, some sections inserted and removed.
- Worst case is a whole-file paraphrase. `REACH = 100` caps it. Without the cap it is 1.4 s. The cap changed no score on the corpus.
- A's table is 2000 x 2000 cells of memory. `track` is linear outside the fuzzy step.
- B and the ±2 variant are plain code, not tuned for speed. They scale with the number of anchors either way.

## Recommendation

- Land `track` as `src/core/track.ts`. 118 lines, no dependency, pure.
- Live: `track(prev.lines, next.lines)` on every reload. Cursor, window top and comments all go through it.
- Stored: keep `base` (the text the anchor numbers point into) in the store file. Resolve with `track(base, text)`.
- Drop per-anchor fingerprints. An anchor becomes a line number into `base`.

### Signature

```ts
interface Spot {
  to: number;   // 0-based new line. Always a real line.
  sure: number; // 1 same, 0.6..1 reworded, 0.5 replaced in place, 0 gone
}
function track(old: readonly string[], next: readonly string[]): Spot[]; // one Spot per old line
const join: (a: readonly Spot[], b: readonly Spot[]) => Spot[];          // chain two saves
```

### The four steps

1. A line that occurs once in old and once in new is the same line. Order does not matter, so moves are free.
   - This is the patience idea without the diff: no longest-increasing run, because a map does not need an edit script.
   - Blank lines and `---` never pair here. They are not unique.
2. Grow each pair down, then up, while the neighbours are equal. This is how blank lines, rules and repeated lines (`- Good:`) get paired, by their place next to a unique line. The file edges count as pairs.
3. Leftover lines pair best first by bigram Dice above 0.6. Global best first, so a deleted line cannot steal the match of a reworded one.
4. What is still left goes into its hole by position (see below).

### What a lost line returns

- Never null, never a line outside the file. `sure` tells how much to trust `to`.
- The hole is the gap between where the nearest paired line above and below went.
- Hole has free lines: lost lines pair with them in order, skipping blank lines. Most "lost" lines are heavy rewords, so the replacement text is the right place. From a heading on, count from the bottom: a heading belongs to what follows it.
  - Same number of lost and free lines: `sure = 0.5` (replaced in place). 99% right on the corpus.
  - Else `sure = 0`.
- Hole is empty (a plain delete): the neighbour in the same block. The line above, unless the lost line started its block (blank line or file start above it), then the line below.
  - Why not always above or always below: forcing either drops the edit hit rate from 97% to 64% (rows `lost up`, `lost down` in `scores.md`), because it ignores the replacement text.
  - Why same block: a reader lands in the paragraph or list they were in, not across a blank line in the next one. A comment stays under its own heading.
- Deleted tail: the last line of the file. Deleted top: the first.

### Confidence

Measured on one-shot pairs plus live chains, non-blank lines:

| sure | lines | right line | within 3 | truly gone | wrong section |
|---|---|---|---|---|---|
| 1 (same) | 3178 | 100% | 100% | 0% | 0% |
| 0.6 to 1 (reworded) | 594 | 99% | 99% | 0% | 1% |
| 0.5 (replaced in place) | 260 | 99% | 100% | 1% | 0% |
| 0 (gone) | 303 | 90% | 98% | 66% | 2% |

- UI rule: `sure === 1` shows nothing, `sure > 0` shows `~` (drift), `sure === 0` shows `?` (lost).
- A third of the `0` lines survived but were reworded past recognition. Their place is still right 90% of the time. The `?` is honest: we cannot tell a rewrite from delete plus insert.
- `join` takes the minimum, so a line lost once stays `?` until the user re-anchors it.

### How live and stored share it

One function, two inputs. The TUI keeps `map: Spot[]`, from `base` lines to current lines.

```ts
// store file: one new field
interface File { comments; marks; base?: string } // text the anchor numbers point into
type Anchor = { kind: "line"; n: number; sure?: number } // n is a line of base

// open
map = track(base.split("\n"), doc.lines);
// reload (live)
const step = track(doc.lines, next.lines);
map = join(map, step);
cursor = step[cursor].to; // window top the same way, keep the cursor on its screen row
// where is a comment
map[anchor.n];
// any store write that happens anyway (add, edit, archive)
anchor.n = map[anchor.n].to; // for every anchor; keep sure when below 1
base = doc.text;             // map becomes the identity
// CLI: no live state
track(base.split("\n"), text.split("\n"));
```

- Only user actions write the store, as `watch-DRAFT.md` asks. A reload never writes.
- Heading anchors need no slug path. A heading is a line, a renamed heading is a reworded line.
- Old stores without `base`: resolve as today. The first write adds `base`. No migration code.
- Cost: the store holds one copy of the text. Five lines of context per anchor (the ±2 variant) is smaller only while comments are sparse, and it scores far worse.

### If `base` in the store is rejected

- Live path stays `track`, in memory only.
- Between sessions fall back to B fingerprints. Expect the B row: 81% edit hit, 41% gone, 10% false found, 56% after five stacked saves.
- Do not use `track` on a 5-line snippet. Measured: gone 7%, 3.6 s for 650 anchors. A snippet has no rivals, so nothing stops a gone line from claiming a look-alike.

## The code (`track.ts`, as it would land in `src/core/track.ts`)

```ts
/** Where did each line go when the text was rewritten? Pure: no terminal or I/O here. */

export interface Spot {
  /** 0-based line in the new text. Always a real line; a neighbour when `sure` is 0. */
  readonly to: number;
  /** 1 = the same line, 0.6 to 1 = reworded (its likeness), 0.5 = replaced in place, 0 = gone. */
  readonly sure: number;
}

/** Likeness under this is noise; 0.6 came out of the golden corpus. */
const MIN = 0.6;
/** How many free lines either side a leftover line is compared with; bounds a whole-file rewrite. */
const REACH = 100;

/** A line without what agents churn: case, spacing, list, quote and checkbox marks. */
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/^(>\s*)+/, "")
    .replace(/^([-*+]|\d+[.)])\s+(\[[ x]\]\s+)?/, "")
    .replace(/\s+/g, " ");

const grams = (s: string) => {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
};

/** Dice likeness of two gram sets, 0 to 1. */
const like = (a: Set<string>, b: Set<string>) => {
  let hit = 0;
  for (const g of a) if (b.has(g)) hit++;
  return (2 * hit) / (a.size + b.size || 1);
};

/** One Spot per line of `old`: where it is in `next`, and how sure. */
export function track(old: readonly string[], next: readonly string[]): Spot[] {
  const a = old.map(norm);
  const b = next.map(norm);
  const to = a.map(() => -1);
  const from = b.map(() => -1);
  const sure = a.map(() => 0);
  const link = (i: number, j: number, s: number) => {
    to[i] = j;
    from[j] = i;
    sure[i] = s;
  };
  const free = (i: number, j: number) => to[i] === -1 && from[j] === -1;

  // 1. A line that occurs once on each side is the same line, wherever it moved.
  const seen = new Map<string, number[]>();
  const count = (s: string, i: number, k: number) => {
    const x = seen.get(s) ?? [0, 0, 0, 0];
    x[k]!++;
    x[k + 1] = i;
    seen.set(s, x);
  };
  a.forEach((s, i) => count(s, i, 0));
  b.forEach((s, j) => count(s, j, 2));
  for (const [s, x] of seen) if (s && x[0] === 1 && x[2] === 1) link(x[1]!, x[3]!, 1);

  // 2. Grow each pair down, then up, over equal neighbours (blank lines, rules, repeats). The file edges count as pairs.
  for (let i = 0; i < a.length; i++) {
    const j = i ? to[i - 1]! + 1 : 0;
    if ((!i || j > 0) && j < b.length && free(i, j) && a[i] === b[j]) link(i, j, 1);
  }
  for (let i = a.length - 1; i >= 0; i--) {
    const j = i < a.length - 1 ? to[i + 1]! - 1 : b.length - 1;
    if (j >= 0 && free(i, j) && a[i] === b[j]) link(i, j, 1);
  }

  // 3. Leftover lines pair best first by likeness.
  const ga = a.map(grams);
  const gb = b.map(grams);
  const rest = b.flatMap((s, j) => (s && from[j] === -1 ? [j] : []));
  const left = a.flatMap((s, i) => (s && to[i] === -1 ? [i] : []));
  const cand: number[][] = [];
  left.forEach((i, x) => {
    const mid = Math.round((x * rest.length) / left.length);
    for (const j of rest.slice(Math.max(0, mid - REACH), mid + REACH)) {
      const s = like(ga[i]!, gb[j]!);
      if (s > MIN) cand.push([s, i, j]);
    }
  });
  cand.sort((x, y) => y[0]! - x[0]!);
  for (const [s, i, j] of cand) if (free(i!, j!)) link(i!, j!, s!);

  // 4. What is left is gone. Its hole is the gap between where its neighbours went: lines pair off with
  // the free lines there in order, from a heading on counted from the bottom (a heading hangs off what follows).
  // An empty hole leaves the neighbour in the same block: the line above, or the line below at a block start.
  const spot = a.map(() => 0);
  for (let s = 0; s < a.length; s++) {
    if (to[s]! >= 0) continue;
    let e = s;
    while (e + 1 < a.length && to[e + 1]! < 0) e++;
    const lo = s ? to[s - 1]! : -1;
    const hi = e + 1 < a.length ? to[e + 1]! : b.length;
    const news: number[] = [];
    for (let j = lo + 1; j < hi; j++) if (b[j] && from[j] === -1) news.push(j);
    const olds: number[] = [];
    for (let k = s; k <= e; k++) if (a[k]) olds.push(k);
    const cut = olds.findIndex((k) => a[k]!.startsWith("#"));
    const edge = s && a[s - 1] ? lo : hi;
    for (let k = s; k <= e; k++) spot[k] = hi - lo > 1 ? Math.min(lo + 1 + k - s, hi - 1) : edge;
    olds.forEach((k, x) => {
      const y = cut < 0 || x < cut ? Math.min(x, news.length - 1) : Math.max(news.length - olds.length + x, 0);
      spot[k] = news.length ? news[y]! : edge;
      if (news.length === olds.length) sure[k] = 0.5;
    });
    s = e;
  }
  return a.map((_, i) => ({ to: to[i]! < 0 ? Math.max(0, Math.min(spot[i]!, b.length - 1)) : to[i]!, sure: sure[i]! }));
}

/** Chain two saves: `a` maps first to second, `b` second to third. A line lost once stays unsure. */
export const join = (a: readonly Spot[], b: readonly Spot[]): Spot[] =>
  a.map((s) => ({ to: b[s.to]!.to, sure: Math.min(s.sure, b[s.to]!.sure) }));
```

## Failure cases

- Short lines fool Dice. `## Open questions` pairs with `## Design options` at 0.63 when the true heading was renamed to `## Unresolved`. Wrong section, shown as `~`. Raising the bar to 0.7 fixes this one and adds more misses elsewhere (26 against 20 on the one-shot pairs).
- A section that is moved and reworded in the same save: its heading is usually lost (headings are short), its body lines pair one by one only if they stay above 0.6.
- Heavy paraphrase with a changed line count in the same hole: positional fill is a guess. 90% right, 98% within 3 lines, flagged `?`.
- Reflow: three lines merged into one all map to it. One line split into three maps to one of them, the most alike.
- A line that is unique in both texts is taken as the same line. If the agent deletes a unique line and writes the same words elsewhere, the comment follows the words.
- Stacked saves with no store write in between: `track(base, now)` decays (83% edit hit, gone lines mostly misplaced, 9% wrong section after five). The live chain does not (90% hit, 99% within 3).
- TUI and CLI can disagree. The TUI chains steps, the CLI sees only `base` and the file. They agree again after the next store write.
- `REACH` limits the fuzzy step to 100 free lines either side. A reworded line that also moved further than that inside a mass rewrite is lost.
- `norm` drops checkbox state and list markers on purpose. `- [ ] a` and `1. a` are the same line.
- Columns of a table are not tracked. A rewritten row is one reworded line.

## Limits of this measurement

- I wrote the corpus and the mapper. The threshold 0.6 was picked on the same 56 pairs. No held-out set.
- Files are small (20 to 129 lines). The 2000-line file is used for time only, not for accuracy.
- Rewording is mine, not sampled from real agent sessions. Recording real before/after saves from dogfooding would be the next check.
- Truth for a gone line is the hole between its true neighbours. Above and below both count as right, so the table cannot say which one readers prefer. That choice is argued, not measured.

## Files

- `track.ts`: the mapper as it would land.
- `lab.ts`: same mapper with knobs, for the tuning rows. `score.ts check` proves both agree on every pair.
- `rivals.ts`: `now`, A (lcs), B (fingerprint), the ±k snippet variant.
- `gen.ts`, `corpus.ts`, `corpus/`: op language, the hand-written edits, the four source files, generated outputs in `corpus/out/`.
- `score.ts`: all tables. `bun score.ts [shot|kind|tune|live|sure|check]`. Output saved in `scores.md`.
- `time.ts`: timing, saved in `times.md`. `miss.ts [filter]`: prints every miss of `track`.
