# Skill: front-end loop

## Why

The human can keep mdtation open as the only window and talk to an agent through comments alone.
The agent's terminal can be hidden in the background.
The skill (`src/core/skill.ts`, the only copy, printed by `mdtation skill`) teaches only the review loop, which ends when the human quits.

## Findings

- Nothing blocks the front-end loop today.
  - `watch --since last --until comment` blocks, then exits.
  - It replays what came after the agent's mark, so a timeout or restart misses nothing (`test/verbs.test.ts:97`).
  - `add --re` copies the parent's anchor (`verbs.ts:161`).
- Gaps and stale lines in the skill:
  1. It says to quote ids into `add --re`, but plain `list` and `watch` print no ids.
     Ids show only in `--json`, `read` and `list --archived`.
  2. The loop assumes the human quits (`skill.ts:12`).
  3. `watch --until comment` stops at the first event of a batch (`verbs.ts:229`).
     Follow it with `list --since last` to catch the rest.
  4. `list --since` filters on `createdAt` (`verbs.ts:193`).
     An edit to an older comment wakes `watch` but does not show in `list --since`.
  5. `list` shows the caller's own comments; `watch` skips them (`verbs.ts:227`).
     The agent skips lines with `"agent":true`.
  6. CLI `archive` takes only the given ids (`store.ts:128`).
     The TUI `d` archives the whole thread (`tui.ts:850`).
     For the tidy-up use, keeping the agent's reply visible is the wanted result.
  7. Archived comments can be restored only until retention removes them (default 30 days, `settings.ts:55`).
  8. The `--json` and `--since` help text says "list/read" only (`bin.ts:23,26`); `watch` uses both.
  9. A bad `--since` in `watch` throws a stack trace instead of `die` (`verbs.ts:217`, `bin.ts:54`).
  10. `skill.ts:32` repeats `skill.ts:14`.
  11. If the agent's author equals the human's `$USER`, `watch` skips the human's events (`tui.ts:486`).
- Not in the skill, on purpose: `clear`, `print`, `add --human`.

## Proposed skill body (frontmatter unchanged)

````md
# mdtation

A terminal markdown viewer where a human leaves comments on lines.
Comments live in a json file per document; these verbs read and write it.
The human's viewer reloads on every change, so your replies and rewrites show up for them at once.

```sh
mdtation <file> list [--json] [--since last|<mark>|<iso>] [--archived]
mdtation <file> read [--json]               # the file with each comment inlined as <c id by re at>…</c>
mdtation <file> add "text" --line N         # comment on a 1-based line
mdtation <file> add "text" --re <id>        # reply under a comment
mdtation <file> edit <id> "text"
mdtation <file> mark [name]                 # "read up to here"; --since last starts after it
mdtation <file> archive|restore <id…>       # hide or bring back
mdtation <file> prune [--older 1d|7d|30d|1y]
mdtation <file> watch [--json] [--since …] [--until comment|open|quit]
                                            # block; print what others do to comments
mdtation <file> status
```

- Ids appear in `--json` and `read`, not in plain `list` or `watch`.
- Set `$MDTATION_AUTHOR` to your name and keep it: marks and `watch` are per author.
  Do not use the human's `$USER`.

## Two ways to work

Review: write the file, run `watch --until quit`, reply as comments land, revise when the human closes the viewer.

Front end: the human keeps mdtation open and talks to you only through comments.
Your terminal may be hidden.
Wait for a comment, answer it in the file, wait again.

```sh
export MDTATION_AUTHOR=claude
mdtation notes.md mark                                # once: skip older comments
# then repeat:
mdtation notes.md watch --since last --until comment  # wait for the human
mdtation notes.md list --json --since last            # everything new, with ids; skip "agent":true
mdtation notes.md mark                                # read up to here
mdtation notes.md add "answer" --re <id>              # or edit the document itself
```

- If the watch times out or you restart, run it again: `--since last` replays what came after your mark.
- When a human comment is short and fully answered, you may archive it to keep the page tidy.
  Your reply stays, and `restore <id>` brings it back.
````

## Small code fixes found on the way

- Help text for `--json` and `--since` names `watch` too.
- `watch` with a bad `--since` exits through `die`.
