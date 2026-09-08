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

Most of this already exists; only true removal is new.

- Have: `mdtation <file> list --archived` (inspect), `restore <id>` (undo), `archive <id>`, `clear` (wipe all).
- Add: `mdtation <file> expire [--older <dur>]` — permanent removal of archived comments; no flag = the retention setting.

Reasoning: recovery and true deletion are rare, deliberate acts that suit a typed command better than a modal;
the retention sweep stays the automatic path, `expire` is the manual one.
`clear` today deletes everything live; consider fencing it to archived-only later.

## Touches

`commands.ts` (archive verb + menu entry), `tui.ts` (`d` handler), `bin.ts` (`expire` verb), tests per piece.

## Closed questions (shipped 2026-09-08)

1. Chooser on a multi-thread row picks one thread.
2. `restore` stays CLI-only.
3. `expire` with no flag uses the retention setting; `--older 1d|7d|30d|1y` overrides.
4. Badge reads `ARCHIVED n  restore via cli`.
