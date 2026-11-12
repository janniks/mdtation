# Stable anchors

> The recommendation here (fingerprints first) is superseded by `stable-DRAFT.md`, which measured it against a whole-text matcher.

## Why

An agent or an editor rewrites the file on disk.
The TUI reloads it.
Today two things go wrong:

- The page jumps.
  `reloadDoc` (`src/ui/tui.ts:543`) finds the cursor line again, then calls `jumpToLine`, which snaps the window.
- Comments lose their place.
  - A heading anchor is a slug path.
    Edit the heading text and `findHeading` fails, `resolveAnchor` returns null, and the comment vanishes with no signal (`src/core/comment.ts:133`).
  - A line anchor is `{ n, text }`.
    Edit the line itself and the exact match fails, so the comment stays on `n`, which may now be a different line.
  - A TUI reply anchors on the cursor (`tui.ts:787`), not on its parent, so the two can split after a reload.
  - `sameAnchor` compares line anchors by `n` only (`comment.ts:162`).

## Two designs explored

### A: diff-mapped

- Keep the previous text.
  Diff old lines against new lines (hand-rolled Myers, ~60 lines).
  This gives `map(n)` for every old line.
- Push the cursor, the window top and every anchor through `map`.
- To cover changes made while the TUI was closed, the store keeps `base`: the full text its anchors point into.
  Every doc change rebases the anchors and writes the store.
- Good:
  - An edited line follows its comment exactly (paired line in the hunk).
  - A renamed heading follows by position.
  - Precise viewport pinning.
- Bad:
  - The store holds a copy of the document, so its size doubles.
  - Every doc change writes the store, which races CLI writers.
    This reverses the `watch-DRAFT.md` rule that only a user action writes the store.
  - Two paths (live step diff and one-shot diff from `base`) can disagree.
  - Myers pairs blank lines and `---` across unrelated places.
- Size: ~170 src, ~150 tests, 7 files.

### B: content-addressed (fingerprints)

- Each anchor carries enough context to be found in any version.
  No history, no snapshot, no write-back.
  This is the W3C Web Annotation model (quote, prefix, suffix, position hint) at line granularity, resolved the way Hypothesis does it.
- Shape (additive, old stores still resolve):
  ```ts
  type Anchor =
    | { kind: "heading"; slug: readonly string[]; n?: number }
    | { kind: "line"; n: number; text?: string; before?: string; after?: string; under?: string };
  interface Location { startLine; endLine; fit?: "moved" | "drift" | "lost" }
  ```
  - `before` / `after`: the nearest non-blank line on each side, clipped to 80 chars.
  - `under`: the slug of the enclosing heading.
- Resolution:
  1. `norm(lines[n]) === norm(text)`: found.
     `norm` trims, collapses spaces, lowercases, and drops list, quote and checkbox markers, so a ticked box still matches.
  2. Exact match elsewhere: `moved`, nearest wins.
  3. Fuzzy (bigram Dice, ~10 lines) scored with context, section and distance: `drift` above a threshold.
     A line whose `before` and `after` both still match around it is also `drift` (a rewritten line).
  4. Else `lost`: placed at `clamp(n)`, never null, so nothing vanishes.
  - Headings use the same scorer over heading lines: full path, then last segment, then fuzzy slug plus `n`.
- Replies resolve to the parent's location (`store.where(c, doc)`), with their own anchor as the fallback.
  Seven call sites switch from `resolve(c.anchor)` to `where(c)`.
- Cost: cache per `Document` and anchor in a `WeakMap`.
  Reload replaces both objects, so invalidation is free.
  A full rewrite of a 2000-line file with 650 comments costs one pass, about 0.1 to 0.4 s, narrowed by scanning near `n` first.
- Good:
  - Stateless.
  - No store writes.
  - One code path for TUI and CLI.
  - Blank lines become anchorable through context.
- Bad:
  - The thresholds are tuned guesses.
  - Dice is weak on short lines and reworded prose.
  - Fingerprints stay as they were at creation, so many edits to one line end in `lost`.
- Size: ~150 src, ~130 tests, ~10 files.

### Both agree on

- The viewport keeps the cursor on the same screen row.
  The top visible line (with `skip`) stays pinned when it survives.
  No `jumpToLine` on reload.
- Drifted and lost comments are shown, never hidden:
  - a dim gutter glyph
  - `Line 42~` or `Line 42?` in `read`, `report` and copy
  - a badge such as `RELOADED  3 DRIFTED`
- Replies move with their parent.
- No IDs are written into the markdown.
  Agents own the file, they strip or duplicate markers, and other renderers show them.

## Recommendation

B first, then A's diff only in memory if B falls short.

- Phase 1: fingerprints, `norm`, never null, replies follow the parent, the `sameAnchor` fix, the cache.
- Phase 2: viewport pin on reload, from the cursor and top-line fingerprints.
- Phase 3: drift and lost glyphs, labels and the badge.
- Phase 4 (only if needed): an in-memory line diff inside the TUI, used as a better position hint `n` for the fingerprint search and the viewport during a live session.
  Do not persist `base`.
  This gets most of A's precision for edits made while the TUI watches, without A's store cost or races.

Why:

- Most edits are made by an agent while the TUI is open, or happen between sessions.
  B covers both with one path.
- A's main cost (a snapshot in the store, a write per doc change) is the part with the most risk, and it buys the least.

## Open questions

1. Diff in the model: should Phase 4 be in scope now, or wait for evidence that fingerprints miss?
2. Write-back: should a `moved` (exact) match refresh `n` and the context when the store is written anyway for another reason?
   Refresh only on exact matches, never on fuzzy ones.
3. Drift glyph: what mark in the gutter, and should a `lost` comment get a palette verb to re-anchor it on the cursor line?
4. Thresholds: accept a golden test table as the source of truth and tune against it?

## Tests (golden table, `test/comment.test.ts`, `test/viewport.test.ts`)

- Insert above, delete above: `moved`, exact line.
- Edit the anchored line by a word: `drift`, same line.
- Replace the line, neighbours intact: `drift`.
- Move a section: `moved`.
- Duplicate lines in two sections: `under` and context pick the right one.
- Tick a checkbox: found.
- Rename a heading: `drift`.
  Rename its parent: `moved`.
- Whole-file paraphrase by an agent: mostly `lost`, none on unrelated lines, timed.
- A reply follows its parent when its own anchor is stale.
- Reload after an insert above: cursor screen row unchanged, `skip` kept.
