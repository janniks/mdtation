---
status: draft
---

# Dialogue: agents that listen, answer, and thread

Builds on the CLI notes in `notes/cli-vs-hunk.md` (your comments of 2026-08-22).
Goal: let an agent read your comments without you copying anything, answer inline, and keep a thread, while the golden path stays `open → c → C → paste`.

## The idea in one line

The comment file *is* the channel.
Human writes through the TUI, agent reads and writes through the CLI, both watch the same json.
No daemon, no socket, no session: a file on disk you can `cat`.

## Vision fit

- mdtation is the human's reading surface; the agent never needs the TUI.
- hunk solves "diff lives in a process" with a broker daemon.
  Our document lives on disk, so watching a file gives us the same loop for free.
- Every new feature layers on the store.
  Nothing in the golden path grows a step.

## Golden path, unchanged

1. `mdtation spec.md`, move, `c`, type, `↵`.
2. `C` copies the block, paste into the agent.

Same keys, same copy format, same status hints.
Everything below is opt-in by the *agent* (it starts using the CLI) or by a key you never have to press.

## Data model

One new concept: a comment has an author and may answer another comment.

```ts
interface Comment {
  id; anchor; text; quote?; createdAt; archived?; archivedAt?;   // as today
  author?: string;   // absent = you (the local human)
  agent?: true;      // set by the CLI `add`; drives color, inline rendering, { } nav
  re?: string;       // id of the comment this answers; absent = top of a thread
}
```

- Free-text `author` ("claude", "jannik", "reviewer-2"); the enum you asked about collapses to the `agent` flag.
  Two fields instead of a type enum keeps the human case *absent*, so today's json stays valid.
- A reply copies its parent's `anchor` at creation, so every comment resolves on its own and `re` is only for grouping.
- Threads are flat: `re` always points at the thread's first comment, not the previous reply.
  Depth-one keeps rendering, copy, and nav simple; a "reply to a reply" is just the next message in the thread.
- Ids become `time36 + 2 random chars` so CLI `add` in a loop cannot collide.

## Storage (from your CLI notes, needed here)

- `~/.mdtation/` (override `$MDTATION_HOME`), no XDG.
- One file per document: `~/.mdtation/comments/<abs-path-encoded>.json`.
  Per-file json is what makes `watch` cheap: one `fs.watch`, one parse.
- `settings.json` and `last-copy.md` stay at the top level.
- Your current `~/.local/share/mdtation/comments.json` is moved by hand once; no migration code.

## CLI verbs (agent side)

Flags stay noun-less; the file is always the first positional.

```sh
mdtation spec.md list                 # live comments as markdown (today's --list)
mdtation spec.md list --json          # same as JSON lines, one comment per line
mdtation spec.md list --since <iso|id>   # only comments newer than …
mdtation spec.md list --archive       # print, then archive what was printed (your "both in one")
mdtation spec.md add "text" --line 12           # agent comment on a line
mdtation spec.md add "text" --re mt1gq3el       # reply into a thread
mdtation spec.md add "text" --line 12 --author jannik --human   # another person, no agent flag
mdtation spec.md edit <id> "text"
mdtation spec.md archive <id…> | restore <id…> | clear
mdtation spec.md watch [--json]       # block; print each new human comment as it lands
mdtation spec.md print                # static render to stdout (your rename of --no-tui)
mdtation spec.md status               # data path, counts, last copy (your rename of --where)
mdtation skill                        # print SKILL.md for the agent to load (name open)
```

- `add` defaults `author` to `$MDTATION_AUTHOR`, else `"agent"`, and sets `agent: true` unless `--human`.
- `watch` is `fs.watch` on the one json, diffed by id set; it prints human comments only (an agent should not hear itself).
  `--json` for tools, markdown blocks otherwise, same `copyFormat` as `C`.
- Turn-based agents mostly cannot block, so `list --since` is the practical loop and `watch` serves long-running agents and hooks.
  Both are the same code path; `watch` is `list --since` in a loop with a file event as the trigger.
- The skill file teaches exactly this: `list --since` at the start of a turn, `add --re` to answer, `watch` when idle.

## TUI

### Refresh

- The TUI watches its own json and the markdown file.
  No mode, no toggle, no `r`: a file on disk changed, so the screen follows.
- Store change: reload comments, keep an open comment box untouched, badge `1 new reply` / `2 new comments` in the status corner (fades like COPIED).
- Markdown change: re-parse, keep the cursor on its heading anchor, fall back to the same line number.
- A save in progress wins over an incoming change (write, then re-read).

### Inline rendering

- Your comments stay where they are: a gutter marker, text only in the popup and the copy.
- Agent comments render inline under their line as a muted block, the way a blockquote looks:

```
  The parser keeps one sentence per line.
  ┃ claude  Agreed, but the wrapper re-joins them; see wrap.ts:40.
  ┃ you     Then wrap only in flow mode?
  ┃ claude  Yes, done in 3caee2d.
```

- Whole thread under one line, oldest first, `you` for the local human, `author` for others.
- `View > Inline comments  [agent] [all] [off]` cycler; default `agent`.
  `all` also inlines your own threads, `off` is today's look.
- Inline rows count as rows of their line for the scroll margin (`span()` already knows about rows), so scrolling stays smooth.
- The cursor never lands on an inline row; `j`/`k` skip them.

### Keys

- `{` / `}`: previous / next agent comment, mirrors `[` / `]`.
- `r`: reply to the thread on the cursor line (chooser when several, like `e`).
  Opens the same comment box, title `Reply`.
- `c` on a line that already has an agent comment still makes a *new* comment, not a reply.
  Reply is always an explicit `r`.
- That is the whole key delta: two nav keys and `r`.

### Copy and report

- A reply copies as its thread: the parent block, then `  > claude: …` lines nested under it.
- `list --json` carries `re` and `author`; the markdown report shows threads nested the same way.
- Archiving the parent archives the thread.

## Non-goals

- Multi-user concurrency on one file beyond last-writer-wins.
- A daemon or socket of any kind.
- Rich agent notes beside the text (hunk `--agent-context`): v2, tracked in `notes/cli-vs-hunk.md`.
- Editing another author's comment from the TUI.

## Acceptance

- [ ] Json with no `author`/`agent`/`re` loads and renders exactly as today.
- [ ] `add --line` from a second terminal shows inline in an open TUI within a second, with a badge.
- [ ] `watch` prints a human comment made in the TUI as markdown within a second and never echoes agent comments.
- [ ] `r` on a thread, then `list --json`: the reply has `re` = thread id and the parent's anchor.
- [ ] `{`/`}` stop only on agent comments; `[`/`]` unchanged.
- [ ] `Inline comments [off]` renders byte-identical to the current build on the tour file.
- [ ] Scroll margin stays smooth with inline rows (trace test like `settle`).
- [ ] Editing the markdown in `$EDITOR` while the TUI is open keeps the cursor on its heading.

## Phases (for the plan)

1. Store move + per-file json + ids; `status`, `print`, `list --json/--since/--archive`.
2. `author`/`agent`/`re` in the model, `add`/`edit`/`archive`/`restore` verbs, report threads.
3. TUI refresh on both files, badge.
4. Inline rendering cycler, `{ }`, `r`.
5. `watch`, `skill`.

## Open questions (for the interview)

- `agent: true` flag vs `kind: "agent" | "human"` enum: flag keeps human absent; enum reads better in json. Flag proposed.
- Should `r` on a line with only *your* comments start a thread on your own comment? Proposed no: a thread needs two voices.
- Default author label for you in inline rows: `you`, or `$USER`?
- `list --since` cursor: the agent remembers the last id it saw, or we store a `seenAt` per author in the json? Proposed agent-side; the json stays comments-only.
- Thread depth one (flat): accept, or allow nested `re`?
