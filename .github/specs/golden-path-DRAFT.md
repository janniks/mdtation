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
- `open`: the human opened the TUI on this file (cheap, and lets an agent know the review started). (Q1)
- Nothing else. No new concepts, no marks involved.

### Where the TUI writes them

- The TUI already owns the comments json; `open` and `quit` are written there too, as a small `session` field: `{ open: <iso> | null, quit: <iso> | null }`.
  - One file, one watcher, no new paths.
  - Alternative: a sidecar `<file>.events` log. More to clean up, nothing gained yet. (Q2)
- Comment events need no new data: the watcher diffs the store between ticks (new id, changed text, new reply, archived flag).

### `watch`

- Prints one event per change as it lands, in the `list` markdown format for comments and a one-line `quit` / `open` note; `--json` prints one object per line with an `event` field.
- `--until quit` (or `--until comment`) makes it exit 0 after printing that event, so an agent can block on one command. Default stays: never exit. (Q3)
- Re-read the document each tick so `Line N` and quotes are current.
- Ignores the agent's own writes (`$MDTATION_AUTHOR`), as today.

### Live reload in the TUI

- Implement `watch-DRAFT.md` in its suggested order: watcher fixes, badges and deferral, anchor fingerprint.
- One shared `src/core/watch.ts` for TUI and CLI.
- Answer its 8 open questions in that file, not here.

### Docs

- README: replace the "Tell your agent" line with the five-step loop.
- `skill`: lead with `watch --until quit`, then `list`, `add --re`.
- Recommend `$MDTATION_AUTHOR=<agent name>` so replies read as a conversation.

## Not in scope

- Launching the TUI for the human from the agent.
- Multiple humans on one file at once.

## Order

1. `open` / `quit` in the json, `watch` diffs the store and gains `--until`. Ships the loop end to end with today's flaky reload.
2. Reload hardening from `watch-DRAFT.md`.
3. README and skill text.

## Open questions

1. Is `open` worth having, or only `quit`?
2. Session field in the comments json, or a separate events file?
3. Should `watch` keep never-exiting as the default, with `--until <event>` to opt in?
4. `--json` shape: one object per line with `event` plus the comment, or the comment as-is with a top-level `event` key?
5. Should `watch` print the initial state (comments that landed while no agent was watching) before streaming, or start from now like today?
