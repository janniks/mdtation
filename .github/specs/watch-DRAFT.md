# Watch / reload

## Why

The screen should be true.
A file on disk changed, so the view follows it: no mode, no key (decided in `dialogue.md`).

Most of this shipped in `4ea97c6` as `TuiShell.follow` / `reloadStore` / `reloadDoc`.
This spec is the hardening pass: the markdown watcher dies after one save, the two watchers cancel each other, and a reload can silently move comments onto the wrong lines.

## Not the CLI `watch` verb

`mdtation <file> watch` is an agent-facing tail: block, print each new comment by someone else, exit never.
It is a different feature and stays.
It duplicates the TUI's dir-watch plus prefix plus debounce verbatim, so both move onto one `src/core/watch.ts` helper.
It also parses the document once at startup, so its `Line N` output goes stale after the markdown changes; it re-reads per tick.

## Mechanism: `node:fs` `watch` on directories, no new dependency

Probed on Node and Bun (scratchpad, 2026-09-01), against `test/tour.md`-shaped saves:

- `watch(file)` is dead after the first atomic save.
  A write-tmp-then-rename replaces the inode; Node fires three events for save 1 and nothing for saves 2 and 3, Bun fires exactly one event ever.
  This is the bug behind "reload worked once, then stopped".
- Bun's directory watch reports only the *source* name of a rename.
  An editor writing `4913` and renaming it over `doc.md` shows up as `rename 4913` and never mentions `doc.md`.
  So no filename filter can catch a vim-style save under Bun.

Positions:

- Markdown: watch the containing directory and **ignore the filename entirely**.
  Any event means "maybe", then debounce, re-read the one file, and let content equality decide.
  Cost of a false wake is one `readFile` plus a string compare.
- Comments json: keep the directory watch with the existing `startsWith(base)` prefix filter.
  That filter is safe here only because mdtation owns both writers and names its own temp `<base>.<pid>.tmp`.
- No `watchFile` polling: a stat per interval per file, laggy, and worse than an idle watcher.
- No chokidar: it exists to paper over exactly the two quirks above, and dropping the name filter costs less than a dependency.

### Dropbox

The repo lives in a synced folder, so the document's directory is noisy.

- Spurious events are absorbed by the content-equality check, at one read each.
- Conflicted copies (`spec (jannik's conflicted copy 2026-09-01).md`) arrive as *new* files.
  They wake the watcher, we re-read the real document, nothing changed, no-op.
  mdtation never opens or offers them.
- `~/.mdtation/comments/` is outside Dropbox and stays quiet.

### Debounce

- 150 ms trailing, unchanged, but **one timer per source**.
  Today both watchers share `this.wait`, so a markdown change and a comment change inside 150 ms cancel one another and one is lost.
- Node fires up to four events per atomic save, Bun one; the trailing edge collapses both.

## Reload semantics

- Full re-parse, full re-anchor.
  `parseDocument` is a line scan and the store is one small json, so nothing narrower is worth the bookkeeping.
- Keep the reader's place *visually*: preserve the cursor's row inside the window, do not `jumpToLine`.
  `jumpToLine` sets `offset = line`, which re-anchors the window and snaps the page (see the 2026-08-22 papercut).
  `clampViewport` plus the existing `fit` is the right pair.
- The cursor keeps its line by the same rule comments use (below), falling back to its old number.
- A drifted or lost comment is never dropped from the store, only from the screen; the store is only written by an explicit user action.

## Anchors: the crux

A reload that silently misplaces comments is worse than no reload, and today two things go wrong:

- `{ kind: "line", n }` maps 1:1 by number, so one inserted paragraph slides every comment down relative to its text.
- `{ kind: "heading", slug }` re-anchors by slug, but an edited heading fails `findHeading`, `resolve` returns null, and the comment vanishes from markers, inline notes, nav and `here()` with no signal.

This is not new with watching, only newly visible.
The fix belongs in `resolveAnchor`, which fixes the CLI in the same stroke.

- Line anchors gain an optional `text`: the anchored line, trimmed, recorded at creation.
  Blank lines record nothing (every blank line would match).
- Resolution order: `lines[n]` still matches `text` (fast path), else the nearest line that matches exactly, else keep `n` and mark it drifted.
- `Location` gains `drift?: true` so the renderer can say so.
- Additive and optional: comments written before this keep today's behaviour, no migration (P02b).
- The resolved line is **not** written back.
  `resolveAnchor` stays pure, `n` stays the creation-time origin, and the search is document-wide with nearest-to-`n` as the tiebreak.

## Modal state

`draw()` leaves the overlay alone, so a reload under an open modal does not close it, but it can lie:

- `comment()` captures `line` at open time, `reply()` captures `parent`, and the `e` / `r` choosers capture their list.
- Store reloads apply immediately: they never move text under the composer.
- Markdown reloads are **deferred** while a Modal is open, badged, and applied on close.
- A chooser (`Palette`) rebuilds its items on the next keystroke, so a stale row resolves to nothing; `store.get(id)!` must stop being a non-null assertion.

## Unsaved edits

- `reloadDoc` returns early when `dirty`, silently, so the user never learns the file moved.
- Badge `FILE CHANGED ON DISK` instead, keep the edits, and leave the choice to `File > Reload`.
- `save()` writes with `writeFile` (truncate in place, un-awaited) and clears `dirty` first, so the watcher can read a half-written file.
  Make it atomic (tmp plus rename) like `store.save`, and await it.

## Self-writes

- Suppression stays content equality: `reloadStore` compares the serialized store, `reloadDoc` compares the text.
- Better than a mute window or mtime bookkeeping: it needs no timers, and it is still correct when someone else writes the identical bytes.
- Cost is one read per own write, which happens at human speed.

## Visibility

- Markdown applied: `RELOADED` (today).
- Comments applied: today only *new* ids badge, so an agent editing or archiving a comment changes the screen in silence.
  Badge every applied change: `N NEW COMMENTS` / `N NEW REPLIES` / `COMMENTS UPDATED`.
- Deferred: `FILE CHANGED ON DISK`, cleared when applied.
- All fade like `COPIED`.
- Off-anchor comments are counted, not hidden: `report()` already prints `Line ?`.

## Scope

- Stays always-on, no `--watch` flag, no setting, no mode.
  `dialogue.md` decided this and nothing since argues against it; a toggle only buys the right to be stale.
  The escape hatch, if it ever annoys, is one `Beta > Follow changes` row in `SETTINGS`.
- Piped stdin has no file, so `follow()` returns early as it does today.

## Naming

- New module `src/core/watch.ts`, one export `follow(dir, hit, fn)`.
- Locals stay single-word: `dir`, `base`, `wait`, `fresh`, `hit`, `drift`, `text`.

## Menu

- One new entry: `File > Reload`, no chord, palette-visible.
- It earns its place as the manual path when watching fails, which is silent today (`catch {}` when a mount refuses).

## Touches

`core/watch.ts` (new), `ui/tui.ts` (`follow`, `reloadDoc`, `reloadStore`, `save`, deferral), `bin.ts` (reuse `watch.ts`, re-read the doc per tick), `core/comment.ts` (`Anchor.text`, `resolveAnchor`, `Location.drift`), `core/comments.ts` (`create` records the line), `core/commands.ts` (`reload`), tests per piece.

Suggested order: watcher fixes, then badges and deferral, then the anchor fingerprint (the largest piece, and separable).

## Open questions

1. A drifted comment kept on its old line number: how visible? A dimmed gutter marker, a different glyph, or nothing beyond a count in the status bar?
2. Heading anchor whose slug path is gone: fall back to matching the last segment alone (survives a renamed parent), or resolve to nothing as today?
3. Doc changed while `dirty`: badge and wait for `File > Reload` (proposed), or show what changed, or auto-reload and lose the edits?
4. Store the whole trimmed line as the fingerprint, or clip it (80 chars, like `PREVIEW`) so the json stays small on long lines?
5. Should `File > Reload` re-read the comments json too, or only the markdown?
6. A watcher that fails to attach is silent today. Say so once at startup, or stay quiet?
7. The markdown watcher ignores filenames, so a busy Dropbox directory re-reads the file often. Acceptable, or gate the read behind a cheap `stat` mtime check?
8. Should a fingerprint match that relocates a comment rewrite `n` (persisting the move), or leave `n` at its creation value forever (proposed)?
