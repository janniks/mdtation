---
status: draft
---

# Golden path: the review loop

How we tell people to use mdtation with an agent, and what is missing to make that loop tight.

## The loop

1. Agent writes or rewrites a markdown file (plan, spec, draft).
2. Agent runs `mdtation <file> watch` and blocks.
3. Human opens `mdtation <file>`, reads, leaves comments, replies to agent comments.
4. Human says "done" (a key in the TUI).
5. The agent's `watch` prints every new comment and exits.
6. Agent answers in threads with `add --re`, edits the file, goes to step 2.

While both run, the TUI reloads live: file changed on disk, comments changed, agent replied.
No modes, no flags, the file and the json are the channel.

## What exists today

- TUI already follows the comments json and the markdown on disk (`TuiShell.follow`).
  - Known broken: the markdown watcher dies after one atomic save, the two watchers cancel each other, a reload can move comments onto the wrong lines.
  - All of that is specced in `watch-DRAFT.md` with 8 open questions, nothing implemented yet.
- CLI `watch` streams comments by others as they land, never exits.
  - Parses the document once, so its `Line N` output goes stale after a rewrite.
- `mark [name]` writes a checkpoint; `list --since last` reads from it.
- Agent `add` shows up inline for the human at once (json watch).

## What is missing

- A "done" signal from the human to the agent.
- A way for `watch` to exit on that signal, so an agent can `await` it.
- The reload hardening from `watch-DRAFT.md`, so the loop does not lie mid-review.
- The README and the `skill` text telling the story above, in that order.

## Proposal

### Done is a mark

- A mark is already "a checkpoint in the comment stream", which is what done means.
- TUI: `d` (and `Comments > Done`) writes a mark named `done` and badges `SENT`.
  - Question: should `q` also write it? Proposal: no, quitting is not the same as done; but ask once if there are unsent comments? (see Q1)
- CLI: `mark done` does the same from the shell.

### `watch` exits on done

- `watch` prints comments as they land (today), and when a `done` mark arrives it prints any rest and exits 0.
- `watch --forever` keeps today's behaviour for dashboards and logs.
  - Question: default to exit-on-done, or keep the never-exit default and add `--until done`? Proposal: exit on done is the default; the loop is the point. (Q2)
- Output on exit: the same markdown blocks `list` prints, so the agent reads one format everywhere.
- `--json` prints one line per comment plus a final `{"event":"done"}` line.
- Re-read the document each tick so `Line N` and quotes are current.

### Other events

- Only two events exist: `comment` (someone else wrote, edited, replied) and `done`.
- Human quit without done: nothing is printed; the agent keeps waiting, or its own timeout fires.
  - Question: should quit emit a `quit` event so an agent can stop waiting? (Q3)
- Agent-side timeouts are the agent's problem; `watch --timeout 30m` is cheap if wanted. (Q4)

### Live reload in the TUI

- Implement `watch-DRAFT.md` in its suggested order: watcher fixes, badges and deferral, anchor fingerprint.
- One shared `src/core/watch.ts` for TUI and CLI.
- Answer its 8 open questions in that file, not here.

### Docs

- README: replace the "Tell your agent" line with the six-step loop, then the key table.
- `skill`: lead with `watch`, then `list`, `add --re`, `mark done`.
- Recommend `$MDTATION_AUTHOR=<agent name>` so replies read as a conversation.

## Not in scope

- Launching the TUI for the human from the agent.
- Comments on anything but markdown files.
- Multiple humans on one file at once.

## Order

1. `watch` exits on `done`, `d` in the TUI, `mark done`. Small, ships the loop end to end with today's flaky reload.
2. Reload hardening from `watch-DRAFT.md`.
3. README and skill text.

## Open questions

1. Should `q` prompt "send N unsent comments?" when comments were left since the last mark, or stay silent?
2. Exit-on-done as the `watch` default, with `--forever` to opt out?
3. Emit a `quit` event when the human closes the TUI without done?
4. Add `--timeout` to `watch`, or leave timeouts to the caller?
5. Name of the key and mark: `d` / `done`? Alternatives: `s` / `send`, `enter` on nothing.
6. Should `done` also archive nothing, or auto-archive comments the agent has already replied to?
