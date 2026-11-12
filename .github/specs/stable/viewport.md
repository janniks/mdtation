# Stable viewport

Scope: the window side only.
Assumed given: a reliable `old line -> new line` for the cursor line after a rewrite.

Prototyped in a copy of `src/` (not in the repo).
All 297 existing tests pass on the copy, PTY suite included.

- Patch: `proto.diff` (+46 / -21 in `src`)
- Scenarios: `run.ts` (`bun run.ts <root>`, repo or `proto/`)
- The patch is partial: see "Not yet in the prototype" below.

## Invariant

After any change the reader's cursor did not make, the first row of the cursor line stays on the same screen row.

- Applies to: doc reload, store reload, comment add / edit / archive by anyone, toggles and settings that change rows, resize.
- Anchor is the cursor line, not the top line.
  - The eye is on the cursor; a TUI always has one on screen.
  - Differs from `anchors-DRAFT.md` ("top line stays pinned"): both cannot hold when rows change between top and cursor. Cursor wins, top is derived.
- Anchor is the line's first row, not the caret row.
  - So archiving the note under the caret moves the caret up, not the text down.
  - So a re-wrap on resize keeps the line start still.

What gives way, in order:

1. Margins. Never enforced on a passive change.
2. Fill. Blank rows appear instead of movement: below the last row, or above the first row.
3. The top (`offset` / `skip`). It absorbs every row added or removed above the cursor.
4. Only then the cursor row, and only in three cases:
   - window got shorter than the row (resize): caret clamps to the last row
   - cursor line starts above the window and its block shrank: top becomes the caret row
   - cursor line is gone: the mapped line (nearest survivor) takes over the same row

## State model

One new field, one widened meaning. No slack field.

- `TuiShell.row?: number` (next to `seg`)
  - screen row the caret was drawn on, written at the end of every `draw`
  - `undefined` = unknown, so the next draw fits strictly (start-up, jumps)
- `Viewport.skip` may be negative
  - `skip > 0`: rows of the top block scrolled off (today)
  - `skip < 0`: blank rows above the first line (top slack). Only valid on the first reachable line.
  - Caret math already works with it: `gap`, `step`, `place` all subtract `top.seg`.
- Bottom slack is derived: rows from top to the last row, minus `height`. Nothing is stored.

Pure functions in `src/core/caret.ts`:

```ts
/** Top row that puts the first row of `c`'s line on screen row `row`. No margin, no fill. */
export function hold(vp: Viewport, c: Caret, row: number, total: number, rows: Rows): Caret

/** `row` given: follow a user move by the smallest shift. `row` undefined: strict, as today. */
export function fit(vp: Viewport, c: Caret, total: number, rows: Rows, row?: number): Caret

/** Rendered rows from `a` down to `b` (already exists, becomes exported). */
export function gap(a: Caret, b: Caret, rows: Rows, cap?: number): number
```

`hold` (10 lines):

- start at the virtual row `{ line: c.line, seg: -min(row, height - 1 - c.seg) }`
- while `seg < 0` and the line is below `home`: go one line up, add its rows
- stops on `home` with `seg < 0`: that is the blank lead
- if the result is below the caret, return the caret

`fit` with `row` (follow mode), three differences from today:

- top margin asked = `min(margin, row)`, bottom margin asked = `min(margin, height - 1 - row)`
- no pull-back loop (the one that fills the bottom)
- a negative `skip` is kept instead of pinned to 0

Three modes, picked in `draw`:

| mode | when | function | margin | fill |
|---|---|---|---|---|
| hold | `draw(mode, true)` and `row` known | `hold(view, c, row - seg, …)` | off | off |
| follow | any other draw with `row` known | `fit(view, c, …, row)` | lazy | off |
| strict | `row` undefined | `fit(view, c, …)` | full | on |

`draw` core (replaces `tui.ts:729-732`):

```ts
const c = pin({ line: this.view.cursor, seg: this.seg }, total, rows);
const t = keep && this.row !== undefined
  ? hold(this.view, c, this.row - this.seg, total, rows)   // old seg: the line start stays
  : fit(this.view, c, total, rows, this.row);
this.seg = c.seg;
this.view = { ...this.view, cursor: c.line, offset: t.line, skip: t.seg };
this.row = gap(t, c, rows);
```

- Follow is the default, because a draw where nothing changed is then an exact no-op (badge fade, count digits, overlay close).
- A passive site that forgets `keep` degrades to today's top-pinned behaviour, not to something new.

## Rules per event

| event | mode | what stays | what moves |
|---|---|---|---|
| doc reload (agent or editor) | hold | cursor line's row | top; blank rows if content ran out |
| store reload (agent adds / removes notes) | hold | cursor line's row | top, for notes above; rows below, for notes below |
| own comment on the cursor line | hold | cursor line's row | new rows grow downward, may fall below the fold |
| archive thread under the cursor | hold | cursor line's row | caret steps up to the line's last row; rows below rise; blank at the end |
| copy + archive all | hold | cursor line's row | same |
| view toggles, style cyclers, settings | hold | cursor line's row | top |
| task box, table align, frontmatter edit | hold | cursor line's row | nothing in practice |
| resize height | hold | cursor line's row, while it fits | bottom edge; taller at the end shows blank |
| resize width | hold | cursor line's first row | re-wrapped rows above move the top |
| `j` / `k`, arrows, wheel, count moves | follow | top, while the caret is inside the lazy margin | top, by the fewest rows |
| click, drag-select | follow, `row` = clicked row | everything | nothing. A click never scrolls. |
| page, `g`, `G`, comment jumps, go to line | strict | nothing | window re-anchors, slack is dropped |
| overlay open during doc reload | deferred (as today) | | held when it closes |

## Slack lifecycle

- Born: only in hold mode, when content changed under the reader and rows ran out.
  - below: document shrank, notes removed, window grew at the end
  - above: lines above the cursor removed while the cursor sits lower than what is left
- Stored: nowhere (below), as negative `skip` (above).
- Shrinks: whenever a user move shifts the top away from it.
  - below shrinks when the top steps up
  - above shrinks when the top steps down (`step` raises a negative `seg` first)
- Never grows by a user move:
  - follow moves the top down only to keep the caret visible, and the caret cannot pass the last row
  - follow moves the top up only while it is below `home`
  - so the reader cannot scroll back into blank space, with no extra rule
- Dropped at once: page keys, `g` / `G`, comment jumps, go to line (strict fit fills and pins `skip` to 0).
- Kept: plain cursor moves that do not scroll, resize, further passive changes (hold recomputes it; new content fills it).
- Seen in the prototype:
  - cursor on row 3, page below removed: 15 blank rows, cursor still row 3. `k` x8 leaves 7. `j` x10 leaves 7.
  - cursor on row 12, all but 2 lines above removed: 10 blank rows above, cursor still row 12. `j` x12 leaves 3. `k` x30 leaves 3.

Borrowed, and not:

- Browsers (`overflow-anchor`): pick one anchor node, after layout add its position delta to the scroll offset. Same idea; our anchor is the cursor line.
- Browsers clamp the scroll range, so at the ends content does shift. We do not clamp: blank rows instead.
- Vim: `~` filler rows after the last line stay until you scroll. Same as bottom slack.
- Not borrowed: anchor selection heuristics, suppression windows, scroll-position history.

## Margin (scrolloff)

- Passive change: margin does nothing.
- User move: margin asked on each side = `min(margin, rows the caret had on that side before the move)`.
  - Normal case (caret inside the band): identical to today.
  - Caret already inside the margin zone (after a hold, a resize, a click): the page scrolls one row per step, the caret does not hop.
  - Moving away from the edge restores the full margin by itself, with no shift.
- Click: `row` is set to the clicked row first, so the margin is already satisfied and nothing scrolls.
  - Today a click inside the margin zone scrolls the page under the pointer (row 1 becomes row 3), which also breaks double-click.
- Jumps keep the full margin (strict).

## Call sites to change

Core:

- `src/core/caret.ts:43` `place`: `seg: Math.max(0, row - acc)`, so a click in the blank lead lands on the first row.
- `src/core/caret.ts:52` `gap`: export.
- `src/core/caret.ts:87-112` `fit`: add `row?`; lazy margins (`:100`, `:103`); keep negative `skip` (`:94`); skip the pull-back (`:108`).
- `src/core/caret.ts`: add `hold`.
- `src/core/renderer.ts:436` `render`: start `lines` with `-skip` blank rows.
- `src/core/viewport.ts:25` doc comment for `skip`.

Shell (`src/ui/tui.ts`):

- `:229` add `row?: number`.
- `:718`, `:729-732` `draw(mode, keep = false)` as above.
- `:566-574` `reloadDoc`: drop `jumpToLine` and `clampViewport`; `this.view = { ...this.fit(), cursor: line }`; `draw("RELOADED", true)`.
- `:533`, `:539` `reloadStore`: `keep`.
- `:776`, `:796` comment and reply submit: `keep`.
- `:859` `archive`, `:959` copy + archive: `keep`.
- `:463` `edit`, `:602` `step`: `keep`.
- `:1100-1101` toggles: drop `clampViewport`, `keep`.
- `:1210-1212` `resize` (also reached from settings `:1048`): drop `clampViewport`, `keep`.
- `:391` `click`, `:215` selection: `this.row = row`.
- `:274` `setCursor`, `:1167` page / top / bottom, `:1113-1128` comment jumps: `this.row = undefined`.
  - The four comment cases are the same three lines; fold them into one while there.
- `:1141-1146` count move: drop `moveCursor`; `cursor: pin({ line: cursor ± n, seg: 0 }, …).line`. `pin` already clamps.
- `:158` start-up: unchanged (`row` is undefined, strict).

Row-versus-line bugs (the PAPERCUTS 2026-10-19 class):

- `viewport.ts:72-76` `clampBounds`: `maxOffset` is in lines, the window is in rows.
  - Reached from every `clampViewport(this.fit(), …)`: `tui.ts:570`, `:1100`, `:1210`.
  - Reproduced on today's code: 60 wrapped lines, cursor 9 rows from the top near the end, flip a row-neutral toggle: cursor line jumps from row 9 to row 17.
  - Fix: passive sites stop calling it. It would also erase slack, which is by definition an offset past `maxOffset`.
- `viewport.ts:87-95` `withCursorVisible`: shifts `offset` in lines. Used by the count move (`tui.ts:1141`) and `settle` (`:646`).
  - Hidden today because strict `fit` repairs it on every draw. Follow mode does not repair, so the count move must stop using it.
  - `settle` runs only after a jump (strict), so it can stay.
- `viewport.ts:109-117` `pageDown` / `pageUp`: a page is `height - 1` lines, not rows. On wrapped text a page skips content. Not caused by this work; separate fix.
- `renderer.ts:428` `cursorOn`: compares the cursor line with `offset + height` (rows). Wrong with hidden or wrapped lines; harmless while `draw` keeps the caret visible.
- `renderer.ts:432` look-ahead of `2 * height` lines: a run of hidden lines longer than that leaves blank rows.
- Fine as is: `tui.ts:382` (`row >= height`, both rows), `caret.ts` (all rows).

## Prototype results (60x24, margin 3, body 21 rows)

`row` = screen row of the cursor line.

| scenario | today | proposed |
|---|---|---|
| reload, 5 lines inserted above | 11 -> 3 | 11 -> 11 |
| reload, page below removed (cursor row 3) | 3 -> 18 | 3 -> 3, 15 blank below |
| reload, lines above removed (cursor row 12) | 12 -> 2 | 12 -> 12, 10 blank above |
| 3-row agent note 3 lines above | 11 -> 14 | 11 -> 11 |
| resize 24 -> 16 rows | 11 -> 9 | 11 -> 11 |
| at the end, 24 -> 34 rows | 20 -> 30 | 20 -> 20, 10 blank below |
| wrapped doc, row-neutral toggle | 9 -> 17 | 9 -> 9 |
| click on body row 1 | lands on row 3 | lands on row 1 |

## Not yet in the prototype

- `keep` at `reloadStore`, submit, `archive`, copy + archive, `edit`, `step`.
- `row = undefined` at the comment jumps.
- Count move without `moveCursor`.
- Selection handler `row`.

## Tests

`test/caret.test.ts` (pure):

- `hold`: rows added above, top moves down by exactly that many, caret row equal.
- `hold`: rows removed above, top moves up.
- `hold`: fewer rows above than `row`: top is `home` with `seg = -(missing)`.
- `hold`: top lands mid-block: positive `seg`.
- `hold`: `row` beyond `height - 1`: caret on the last row.
- `hold`: line starts above the window and shrank: top is the caret.
- `hold`: hidden lines above count as 0 rows.
- `fit` follow: bottom blank is not refilled when the caret does not move.
- `fit` follow: bottom blank shrinks on the way up and does not grow on the way down.
- `fit` follow: negative `skip` rises toward 0 on the way down, never falls.
- `fit` follow: caret on row 1 with margin 3, one step up: caret still row 1, top one row up.
- `fit` follow: caret inside the band behaves exactly like strict (existing margin tests, with `row` passed).
- `fit` strict: negative `skip` is dropped, bottom is filled (existing tests unchanged).
- `place`: with a negative top `seg`, rows in the lead map to the first row, rows below are offset by the lead.

`test/renderer.test.ts`:

- negative `skip` renders that many blank rows first and still returns at most `height` rows.

`test/tui.test.ts` or a new headless file (`createTestRenderer`), each asserting the cursor line's frame row:

- reload with lines inserted above, then removed.
- reload with the page below removed: row equal, blank rows below, `k` then `j` does not bring them back.
- reload with lines above removed: row equal, blank rows above, `j` consumes, `k` does not restore.
- agent note added above, then archived.
- own note on the cursor line: line row equal, note rows below it.
- archive with the caret on the note row: line row equal, caret on the line's last row.
- resize shorter, taller, narrower.
- wrapped doc near the end, row-neutral toggle (the `clampBounds` regression).
- click inside the margin zone does not scroll; second click hits the same row.
- `G` after slack: no blank rows.
- short page (fewer lines than rows, with wraps): no blank rows at start-up (PAPERCUTS 2026-10-19 repro stays green).

## Size

- `caret.ts`: about +22 / -5
- `renderer.ts`: +2 / -1
- `viewport.ts`: +1 / -1 (comment)
- `tui.ts`: about +22 / -24 (the comment-jump fold and the count move pay for the rest)
- `src` total: about +45 / -30
- tests: about +120
- No new file, no new module.

## Would not build

- Scroll animation or easing.
- Markers on changed lines, a "N lines changed above" hint. The `RELOADED` and `N NEW COMMENTS` badges already say it; the draft's `3 DRIFTED` badge belongs to the anchor work.
- A filler glyph (`~`) for slack rows. Blank is what a short page already shows.
- A stored slack counter, a timer that collapses slack, or a "scroll back into slack" key.
- A pure pan (window moves, cursor stays). The wheel moves the cursor today; keep it.
- A fallback anchor on the top line. See question 6.

## Open questions

1. Blank rows above line 1: accept them (prototype), or let the cursor rise in that one case? Dropping it is one `Math.max(0, …)` in `hold`.
2. Taller window at the end of the document: blank rows at the bottom (prototype, like vim), or refill as today? Refill breaks the invariant for resize only.
3. Own new comment that lands below the fold: stay put (prototype), or shift just enough to show it?
4. Slack lifetime: it stays until scrolled out or a jump key. On a page that now fits the window, blank rows above stay until `g`. Collapse on the first cursor move instead?
5. Lazy margin (prototype): caret inside the margin zone scrolls row by row. Or restore the full margin on the next move, which hops the page by up to `margin` rows?
6. Cursor line deleted: the mapped nearest line takes the same row (prototype). Or keep the old top line still and put the caret on whatever is now at that row? Needs the top-line mapping and about 5 more lines.
7. `keep` is an explicit flag at 11 draw sites. Alternative: `draw` infers it ("caret is where the last draw left it") and only `reloadDoc` says so. Fewer lines, more magic.
8. Comment jumps and go-to-line re-anchor the window even when the target is already on screen. Make them follow (no scroll when visible)? Out of scope here.
9. Page keys count lines, not rows. Fix with this work or separately?
10. Toggling the menu bar or crumb moves the body one terminal row. Compensate `row` by one, or leave it?
