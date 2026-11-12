# Stable position

Spec: `.github/specs/stable-DRAFT.md`.

## Phase 1: hold the cursor row

- [x] `hold` and follow mode in `src/core/caret.ts`; negative `skip` renders blank rows.
- [x] Passive draws keep the row: doc reload, store reload, comment submit, archive, copy and archive, edit, cyclers, toggles, resize.
- [x] Click and drag-select never scroll; jumps drop the empty rows.
- [x] Count move no longer uses the line-based `moveCursor`.
- [x] Pure tests in `test/caret.test.ts`, `test/renderer.test.ts`.
- [x] Nine headless scenarios hold the row (`.github/specs/stable/viewport.md`, run with bun; not in `npm test`, which runs under node).

## Phase 2: track, live

- [ ] `src/core/track.ts` with a golden table test.
- [ ] `reloadDoc` maps the cursor through `track`.

## Phase 3: lose-the-place fixes

- [ ] Half-written file.
- [ ] Flow toggle keeps the paragraph.
- [ ] Reload during the comment box: verify held.

## Phase 4: comments through `track`

- [ ] Never null, replies follow the parent, drift and lost marks.
- [ ] Stored anchors: `base` or fingerprints (open question 4).

## Log

| date | phase | commit | note |
|---|---|---|---|
| 2026-11-12 | 1 | (this) | defaults taken for open questions 1-3: accept empty rows above, empty rows at the end, kept until scrolled out |
