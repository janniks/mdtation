# Archive comment (`d`)

## Why

"Delete" in the TUI is archive: comments leave the screen at once but stay recoverable.
Nothing is lost to a slipped keypress; permanence comes only from the retention timer or the CLI.

## Decided (from review round 1)

- No permanent delete anywhere in the UI.
- No confirm step: archive is safe, so `d` acts immediately.
- Recovery window = the existing `Archive retention` setting (1d/7d/30d/1y/never) and its startup sweep.
- Archiving a parent archives its replies (the whole thread).
- The click-mapping fix shipped separately with the row caret work; dropped from this spec.

## Behaviour

- `d` in VIEW mode acts on the cursor row.
- 0 comments: status badge "no comment here".
- 1 thread: archive it, badge "ARCHIVED (n)" with the row count.
- Several threads on the row: the existing chooser palette (same as `e`) picks one.
- Caret on an inline note row: `d` targets that comment's thread directly, like `e`/`r` do.
- A reply under the caret archives its whole thread; the chooser lists threads, not replies.

## Naming

- Key stays `d` (muscle memory: delete).
- Menu bar and badges say "Archive comment" so the UI never promises destruction it does not do.
- Docs/help may note: "d — archive (delete)".

## CLI: the one place archives are managed

The TUI only archives; the CLI is where archived comments are inspected and changed.
Proposed verbs (small, reuses the store):

- `mdtation comments <file> --archived` — list archived threads with ids and ages.
- `mdtation restore <file> <id>` — un-archive a thread (the undo).
- `mdtation purge <file> [--older <dur>]` — permanent removal, explicit and scriptable; no flag = retention setting.

Reasoning: agents already talk to the store through the CLI; recovery and true deletion are rare,
deliberate acts that suit a typed command better than a modal.
The retention sweep stays the automatic path; `purge` is the manual one.

## Touches

`commands.ts` (archive verb + menu entry), `tui.ts` (`d` handler), `bin.ts`/`comments.ts` (CLI verbs), tests per piece.

## Open questions

1. Chooser on a multi-thread row: pick one thread (current plan) or `d` twice = archive all on the row?
2. Should `restore` also exist in the TUI later (an "Archived" overlay), or stay CLI-only for now?
3. `purge` with no args: retention-based (proposed) or refuse without `--older`?
