# Delete comment + click cursor fix

## Why

Comments can be archived but never fully removed from inside the TUI.
Clicks land on the wrong line whenever wrapped, hidden, or inline rows sit above the click, which also mis-targets toggles.

## Part 1: click mapping fix (bug, ships first)

- `click()` and drag-select map `offset + row` straight to a line, assuming one row per line.
- Fix: a `lineAt(row)` helper that walks lines from `view.offset` accumulating `span()`, so wraps, hidden lines, and inline threads count correctly.
- Inline thread rows resolve to their host line.
- Checkbox toggle, frontmatter edit, and table alignment clicks inherit the fix for free.
- Pure unit tests for the walk.

## Part 2: delete (`d`)

- `d` in VIEW mode acts on the cursor row.
- 0 comments: status badge "no comment here".
- 1 comment: confirm, then remove and save.
- Several comments: the existing edit chooser palette picks one, then confirm.
- Confirm reuses the quit-guard pattern: first `d` shows "d again to delete", second `d` within 2 s deletes.
- Setting `Delete > Confirm` `[on, off]`, default `on`; `off` deletes on first press.
- Deleting a parent also deletes its replies; the confirm badge says so.
- Delete is permanent; archive stays the recoverable path.
- Touches: `comment.ts` (remove with replies), `settings.ts`, `commands.ts` (palette verb), `tui.ts`, tests per piece.

## Out of scope

- CLI `delete` verb (agents archive; humans delete in the TUI).
- Undo, multi-select delete.

## Open questions

1. Should `d` on a reply delete just the reply (current plan) or offer the whole thread?
2. After delete, show "archive instead: a" in the badge, or keep the badge minimal?
3. Chooser for several comments: is reusing the edit palette right, or should `d` delete the newest without choosing?
4. Confirm style: is the d-again guard enough, or do you want an explicit y/n modal when a thread has replies?
5. Should the click fix ship alone as 0.1.1 before the delete feature lands?
