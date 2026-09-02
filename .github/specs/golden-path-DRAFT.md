---
status: draft
---

# Golden path: the review loop

How we tell people to use mdtation with an agent, and what is missing to make that loop tight.

## The loop

1. Agent writes or rewrites a markdown file (plan, spec, draft).
2. Agent runs `mdtation <file> watch` and blocks on events.
3. Human opens `mdtation <file>`, reads, leaves comments, replies to agent comments.
4. Each comment reaches the agent as an event as it lands; quitting the TUI is an event too.
5. Agent answers in threads with `add --re`, edits the file, goes to step 2.

While both run, the TUI reloads live: file changed on disk, comments changed, agent replied.
No modes, no flags, the file and the json are the channel.

## What exists today

- TUI already follows the comments json and the markdown on disk (`TuiShell.follow`).
  - Known broken: the markdown watcher dies after one atomic save, the two watchers cancel each other, a reload can move comments onto the wrong lines.
  - All of that is specced in `watch-DRAFT.md` with 8 open questions, nothing implemented yet.
- CLI `watch` streams comments by others as they land, never exits.
  - Parses the document once, so its `Line N` output goes stale after a rewrite.
  - Only knows about new comments: edits, replies, archives and the TUI closing are invisible.
- Agent `add` shows up inline for the human at once (json watch).

## What is missing

- Events beyond "new comment": edit, reply, archive, and the TUI quitting.
- A way for `watch` to return on an event the agent picks, so it can be awaited.
- The reload hardening from `watch-DRAFT.md`, so the loop does not lie mid-review.
- README and `skill` text telling the story above.

## Proposal

### Events

- `comment`: someone else added, edited, replied to, or archived a comment.
- `quit`: the human closed the TUI on this file.
- `open`: the human opened the TUI on this file, so an agent knows the review started.
- Nothing else. No new concepts, no marks involved.

### Where events live

- An append-only log next to the comments json: `<mangled-path>.events.jsonl`, one object per line `{ "at": <iso>, "event": "open" | "quit" | "comment", "id"?: <comment id>, "by": <author> }`.
- Every writer appends its own line: the TUI on open, quit and comment; the CLI on add, edit, archive, restore.
- Why not a `session` field in the comments json:
  - every open and quit would rewrite the whole json and wake both watchers for a non-comment change;
  - the TUI and the CLI each read-modify-write that file, so a quit written while an agent adds a reply can drop the reply;
  - the json is already the thing we want to keep small.
- Why the log wins: appends do not race, `watch` tails it instead of diffing the store, and the comments json stays pure data.
- Storage stays per document: one json and one log per markdown file under `~/.mdtation/comments/`, named after the file's path. No sqlite: native dependency, no fs events on inserts, nothing to `cat`. Revisit past thousands of comments per document.
- Marks stay as they are. A mark could become an event line later; nothing needs that now.

### `watch`

- Prints one event per change as it lands, in the `list` markdown format for comments and a one-line `quit` / `open` note.
- `--json`: one object per line, the comment as-is plus a top-level `event` key; `open` and `quit` lines carry only `event`, `at`, `by`.
- Starts from now. `--since last|<mark>|<iso>` replays what landed after that point first, then streams; same flag `list` has.
- `--until quit` (or `--until comment`) makes it exit 0 after printing that event, so an agent can block on one command. Default stays: never exit.
- Re-read the document each tick so `Line N` and quotes are current.
- Ignores the agent's own writes (`$MDTATION_AUTHOR`), as today.

### Live reload in the TUI

- Implement `watch-DRAFT.md` in its suggested order: watcher fixes, badges and deferral, anchor fingerprint.
- One shared `src/core/watch.ts` for TUI and CLI.
- Answer its 8 open questions in that file, not here.

### Docs

- README: replace the "Tell your agent" line with the five-step loop.
- `skill`: one screen. The loop in five lines, the verbs, `watch --until` as an option. Not prescriptive: no cadence, no must.
- Recommend `$MDTATION_AUTHOR=<agent name>` so replies read as a conversation.

## Not in scope

- Launching the TUI for the human from the agent.
- Multiple humans on one file at once.

## Implementation shape

The watch, reload and event code lives today in the two untested files, `src/ui/tui.ts` (1063 lines) and `src/bin.ts`, and the watcher is written twice (`TuiShell.follow`, `watching()`).
Build the base first so every later piece is pure and tested:

1. `src/core/watch.ts`: `follow(dir, hit, fn)`, one watcher for TUI and CLI, one timer per call, content-equality suppression.
2. `changes(prev, next)` on two stores returning events, tested; both badges and `watch` output come from it.
3. Events log in `store.ts`: `append(file, event)`, `read(file, from)`, beside `load` and `save`.
4. CLI verbs out of `bin.ts` into `verbs.ts`, each a function of `(file, args)` returning text; `bin.ts` keeps citty and stdout. `list`, `add`, `mark`, `watch` get plain tests.
5. `reload(doc, cursor, store, text)` pure, in core; the anchor fingerprint from `watch-DRAFT.md` lands there.
6. Commit the headless PTY harness as a test helper for open, comment, reload, quit flows.

Don't split `tui.ts` by file for its own sake; pull out only what becomes pure.

## Order

1. Shape steps 1 to 4.
2. Events: every writer appends, `watch` tails, `--until`, `--since`.
3. Reload hardening from `watch-DRAFT.md` (shape step 5).
4. README and skill text, plus the PTY harness.

## Open questions

1. Should the log be trimmed ever, or is one small line per event fine forever?
