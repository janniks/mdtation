# Stable position

Spec: `.github/specs/stable.md`.

## Phase 1: hold the cursor row

- [x] `hold` and follow mode in `src/core/caret.ts`; negative `skip` renders blank rows.
- [x] Passive draws keep the row: doc reload, store reload, comment submit, archive, copy and archive, edit, cyclers, toggles, resize.
- [x] Click and drag-select never scroll; jumps drop the empty rows.
- [x] Count move no longer uses the line-based `moveCursor`.
- [x] Pure tests in `test/caret.test.ts`, `test/renderer.test.ts`.
- [x] Nine headless scenarios hold the row (`.github/specs/stable/viewport.md`, run with bun; not in `npm test`, which runs under node).

## Phase 2: track, live

- [x] `src/core/track.ts` with a golden table test.
- [x] `reloadDoc` maps the cursor through `track`.

## Phase 3: lose-the-place fixes

- [x] Half-written file: an empty read is ignored. A partial read is not detected (see `UNSURE.md`).
- [x] Flow toggle keeps the paragraph (cursor goes up off a row-less line on a passive draw).
- [x] Reload during the comment box: the deferred reload draws in hold mode. Read in code, not driven in a test.

## Phase 4: comments through `track`

- [x] The store keeps `base`, the text its anchors point into.
- [x] `rebase(doc)` moves every anchor into the current text, in memory; only a write that happens anyway saves it.
- [x] Never null with a base; a reply rests on its parent; a comment whose line went away is `lost` and prints `Line N?`.
- [x] CLI `add`, `edit`, `list`, `read`, `watch` and the TUI (open, both reloads, own edits) rebase.
- [ ] Not built: a gutter mark for lost comments, a `~` for reworded lines, a palette verb to re-anchor.

## Log

| date | phase | commit | note |
|---|---|---|---|
| 2026-11-12 | 1 | 63e1bfd | defaults taken for open questions 1-3: accept empty rows above, empty rows at the end, kept until scrolled out |
| 2026-11-12 | 2, 3 | ee9aa44 | one commit: both touch `reloadDoc` and `draw`; `join` left out until phase 4 needs it |
| 2026-11-12 | 4 | (this) | rebase at load instead of a resolver per call site: no call site changed, and a live session chains save by save |
