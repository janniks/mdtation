# Stable position

Supersedes the recommendation in `anchors-DRAFT.md` (see "Position metric").
Evidence: `.github/specs/stable/` (`audit.md`, `viewport.md`, `metric.md`, `track.ts`, `proto.diff`, `scores.md`).

## Why

The reader loses their place when:

- an agent or editor rewrites the file
- anyone adds, edits or removes a comment
- the window or the layout changes

The position is held as line numbers and a top line.
Both change under a rewrite, and comment rows change the screen without changing lines.

## What the audit measured

174 scenarios, 80x30, 120-line page. Full matrix in `.github/specs/stable/audit.md`.

- Every file reload snaps the window.
  - `reloadDoc` ends in `jumpToLine` (`src/ui/tui.ts:569`), which puts the cursor on the top margin.
  - Jump: 4 rows at margin 8, 12 at margin 0, worst case 26.
  - A one-character change off screen jumps as far as a rewrite.
- Every other redraw pins the top line, not the cursor (`tui.ts:731`, `src/core/caret.ts:94`).
  - Rows added or removed between the top and the cursor move the cursor by that count.
  - Sources: comments, replies, width resize, fence and inline toggles.
- The page ends allow no empty rows (`caret.ts:107-110`).
  - Page below the cursor removed: cursor moves 14 rows.
  - Taller window near the end: 16 rows.
- The cursor line is found by exact text, else by its old number (`src/core/comments.ts:9-16`).
  - Wrong line for: reworded line with a shift above, deleted line, blank line, duplicate text, renamed heading.
- Three ways to lose the place fully:
  - A half-written file is read after 150 ms (`src/core/watch.ts:6`); the cursor ends on line 0.
  - Flow on moves the cursor 14 lines; flow off does not bring it back (`caret.ts:77-80`).
  - A reload that arrives while the comment box is open lands on submit (`tui.ts:296`).

## Design

Two parts. They are independent.

### 1. Viewport: hold the cursor row

Detail and prototype: `.github/specs/stable/viewport.md`, `proto.diff`.

- Rule: after a change the reader did not make, the first row of the cursor line keeps its screen row.
- The top of the window takes up every row added or removed above.
- Where content runs out, empty rows show. Nothing moves.
- State: one new shell field `row` (the screen row of the caret at the last draw).
  `Viewport.skip` can be negative: empty rows above the first line.
- Three draw modes:
  - hold: passive changes (reload, store reload, comment add or remove, toggles, resize). No margin, no fill.
  - follow: cursor steps, wheel, click. Smallest shift.
  - strict: page keys, `g`, `G`, comment jumps, go to line. As today.
- Empty space is one way.
  - It appears only in hold mode.
  - A scroll out of it makes it smaller. No user move makes it larger.
  - A strict jump removes it.
- Margin:
  - Does nothing on a passive change.
  - On a user move it asks for at most the rows the caret had on that side.
    The page then scrolls row by row; the caret does not hop.
  - A click never scrolls.
- Prototype (60x24, margin 3), cursor row before and after:

  | scenario | today | proposed |
  |---|---|---|
  | reload, 5 lines inserted above | 11 to 3 | 11 to 11 |
  | reload, page below removed | 3 to 18 | 3 to 3 |
  | reload, lines above removed | 12 to 2 | 12 to 12 |
  | agent comment 3 lines above | 11 to 14 | 11 to 11 |
  | resize 24 to 16 rows | 11 to 9 | 11 to 11 |

- Size: about +45 / -30 in `src`, +120 in tests, no new file.

### 2. Position metric: `track`

Detail, scores and code: `.github/specs/stable/metric.md`, `track.ts`.

- One pure function maps every old line to a new line, once per save.
  ```ts
  interface Spot { to: number; sure: number } // sure: 1 same, 0.6..1 reworded, 0.5 replaced, 0 gone
  function track(old: readonly string[], next: readonly string[]): Spot[];
  ```
- Steps:
  1. A line that occurs once on each side is the same line, wherever it moved.
  2. Grow each pair over equal neighbours (blank lines, rules, repeated lines).
  3. Pair the rest best first by bigram Dice above 0.6.
  4. Put what is left into the hole its neighbours left.
- Never null. A lost line goes to the replacement text, or to the neighbour in its block.
- Scores, 56 hand-written rewrites of 4 real files (right line):

  | mapper | kept | reworded | deleted | wrong section |
  |---|---|---|---|---|
  | today | 99% | 49% | 41% | 7% |
  | line diff (draft option A) | 96% | 78% | 90% | 6% |
  | fingerprints (draft option B) | 100% | 81% | 41% | 4% |
  | `track` | 100% | 97% | 97% | 0% |

- Time on 2000 lines: 38 ms for a normal save, 202 ms when every line is reworded.
- Size: 118 lines, no dependency.
- Limits:
  - The corpus and the mapper have one author; the 0.6 threshold was tuned on the same pairs.
  - Short headings can pair wrongly (`## Open questions` with `## Design options`).
  - A section moved and reworded in one save loses its heading.

### Comments between sessions

- Live, `track` has both texts. Between sessions it needs the old text.
- Option S: the store keeps `base`, the text the anchor numbers point into.
  - Written only on a store write that happens anyway. A reload never writes.
  - Old stores resolve as today; the first write adds `base`. No migration code.
  - Cost: the store holds one copy of the document.
- Option F: no `base`. Fingerprints between sessions (the 81% / 41% row).
- Recommendation: S, as its own phase, after the viewport and live tracking prove out.

## Phases

1. Hold. The viewport part, with today's line finder. Fixes most measured jumps.
2. Track, live. `src/core/track.ts`; `reloadDoc` maps the cursor through it. In memory only.
3. Lose-the-place fixes.
   - Half-written file: ignore an empty or much shorter read until the next event or a longer wait.
   - Flow toggle: the cursor stays in its paragraph.
   - Reload during the comment box: held, like any passive change (falls out of phase 1; verify).
4. Comments through `track`. Never null, replies follow the parent, drift and lost marks (`~`, `?`).
   Then option S or F for stored anchors.

Row and line mix-ups found on the way (the `PAPERCUTS` 2026-10-19 class):

- `clampBounds` clamps `offset` in lines for a window in rows (`src/core/viewport.ts:72-76`). Passive sites stop calling it (phase 1).
- `withCursorVisible` shifts in lines (`viewport.ts:87-95`); the count move stops using it (phase 1).
- Page keys step `height - 1` lines, not rows (`viewport.ts:109-117`). Separate fix.
- `renderer.ts:428`, `:432`. Harmless today; note only.

## Defaults taken (change if wrong)

- Own comment that lands below the fold: the page stays; no shift.
- Cursor line deleted: the mapped nearest line takes the same row.
- `keep` is an explicit flag at the passive draw sites, not inferred.
- Menu bar or crumb toggle moves the body one row: left as is.
- Comment jumps keep the re-anchor of today.
- No animation, no changed-line marks, no filler glyph, no stored slack counter.

## Open questions

1. Empty rows above line 1 (content above the cursor removed): accept them, or let the cursor rise in that one case?
2. Taller window at the end of the page: empty rows at the bottom (like vim), or refill as today?
3. Empty space lifetime: stays until scrolled out or a jump key. Or collapse on the first cursor move?
4. Stored anchors: option S (`base` in the store) or option F (fingerprints)?

## Tests

- `test/caret.test.ts`: `hold`, follow `fit`, negative `skip` (list in `.github/specs/stable/viewport.md`).
- Headless shell tests on the cursor line's frame row: reload insert and remove above, page below removed, comment above added and archived, resize, click in the margin zone, `G` after empty space.
- `test/track.test.ts`: a golden table from the corpus: insert above, delete, reword, reorder, reflow, tick a box, duplicate lines, truncate.
