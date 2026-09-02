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
- Marks stay as they are. A mark could become an event line later; nothing needs that now.

### `watch`

- Prints one event per change as it lands, in the `list` markdown format for comments and a one-line `quit` / `open` note; `--json` prints one object per line with an `event` field.
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

## Order

1. Events log, every writer appends, `watch` tails it and gains `--until`. Ships the loop end to end with today's flaky reload.
2. Reload hardening from `watch-DRAFT.md`.
3. README and skill text.

## Open questions

1. `--json` shape: one object per line with `event` plus the comment, or the comment as-is with a top-level `event` key?
2. Should `watch` print events that landed while no agent was watching, or start from now like today?
3. Should the log be trimmed ever, or is one small line per event fine forever?
