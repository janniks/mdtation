---
status: draft
---

# Dialogue: agents that listen, answer, and thread

Builds on the CLI notes in `notes/cli-vs-hunk.md` and your review of the first draft (2026-08-22).
Goal: the agent reads your comments when told (or when it listens), answers inline, threads form by themselves, and the common case stays `open → c → C → paste` or `open → c → "check my comments"`.

## The idea in one line

The comment file *is* the channel.
Human writes through the TUI, agent reads and writes through the CLI, both watch the same json.
No daemon, no socket, no session: a file on disk you can `cat`.

## Two golden paths, both short

1. Clipboard: `mdtation spec.md`, `c`, type, `↵`, `C`, paste.
2. CLI: same, then tell the agent "read my comments"; it runs `mdtation spec.md list --since last`.

Same keys, same copy format.
Everything below is opt-in by the agent (it uses more verbs) or by a key you never have to press.

## Data model

Two small ideas: a comment has an author and may have a parent; the file keeps marks.

```ts
interface Comment {
  id; anchor; text; quote?; createdAt; archivedAt?;   // as today (`archived` boolean folds into `archivedAt`)
  author?: string;   // absent = the local human (`$USER`); set for anyone else
  agent?: true;      // set by CLI `add`; the TUI styles and navigates on it
  re?: string;       // parent comment id; absent = top of a thread
}

interface File {
  comments: Comment[];
  marks: Mark[];     // checkpoints, see below
}

interface Mark {
  at: number;        // everything created before `at` is "handled" for `by`
  by?: string;       // author who marked; absent = the local human
  name?: string;     // optional label, e.g. "round 1"
}
```

- `author` defaults to `$USER` (settings override `Identity > Name`); the TUI shows `you` when it equals the current `$USER`.
- `agent` stays a flag: it keeps the human case absent and todays json valid.
  A `source: cli|tui` field was considered; `agent` already says what the TUI needs, so one field.
- `re` is just a parent pointer and a timestamp orders the thread.
  No "points at the first comment" rule, no "two voices" rule.
  Nesting is possible later because the pointer is already there; v1 renders a thread flat, sorted by time.
- A reply copies its parents `anchor`, so every comment resolves on its own.
- Ids become `time36 + 2 random chars` so CLI `add` in a loop cannot collide; ids are stable for life.
- `archivedAt` on a comment means "hidden from the human view"; retention sweeps on it (today).
- `marks` are the seen-ness: manual checkpoints, one per `mark` call, never implied by reading.
  `list --since last` means "since my latest mark"; `--since <name>` names one; `--since <iso>` is raw.
  Archive-on-copy in the TUI becomes `mark` + archive, so both stay one system: a mark says *read up to here*, archive says *hide*.

## Storage

- Root `~/.mdtation/` (override `$MDTATION_HOME`).
  If `$XDG_DATA_HOME` / `$XDG_CONFIG_HOME` are set they win for data / settings, each in a `mdtation/` dir; unset, everything lives under the one root.
- Data: `comments/<abs-path-encoded>.json`, one `File` per document, like Claude Code session names.
  Per-file json is what makes `watch` cheap: one `fs.watch`, one parse.
- Config: `settings.json` (also holds `Identity > Name`).
- `last-copy.md` stays beside the data.
- Atomic tmp+rename writes, last writer wins; a CRDT/yjs merge is v2 if two writers ever collide in practice.
- No migration code: move `~/.local/share/mdtation/comments.json` by hand once.

## CLI verbs (agent side)

File first, flags noun-less.

```sh
mdtation spec.md list                    # live comments as markdown
mdtation spec.md list --json             # JSON lines, one comment per line
mdtation spec.md list --since last|<name>|<iso>
mdtation spec.md list --archive          # print, then archive what was printed
mdtation spec.md mark [name]             # checkpoint now for the calling author
mdtation spec.md add "text" --line 12    # comment on a line (agent by default)
mdtation spec.md add "text" --re <id>    # reply
mdtation spec.md add "text" --line 12 --author jannik --human
mdtation spec.md edit <id> "text"
mdtation spec.md archive <id…> | restore <id…> | clear
mdtation spec.md watch [--json]          # block; print each new comment by others as it lands
mdtation spec.md read                    # the whole file with comments inlined, for agents
mdtation spec.md read --json             # same as one object (see `read`)
mdtation spec.md print                   # static render to stdout
mdtation spec.md status                  # data path, counts, marks, last copy
mdtation skill                           # print a short SKILL.md
```

- `add` author defaults to `$MDTATION_AUTHOR`, else `agent`; sets `agent: true` unless `--human`.
- `watch` is `list --since` driven by a file event; it skips the callers own author so an agent never hears itself.
- `skill` documents the verbs in a few lines and stops there; the harness decides how to use them.

### `read`: the full-context mode

`list` gives line numbers; an agent that cannot hold the file then zips `list` against its own `Read`.
`read` removes that step: the markdown verbatim, each thread inlined right under its line, nothing else.

```md
The parser keeps one sentence per line.
<c id=mt1x by=you>Then wrap only in flow mode?</c>
<c id=mt1y by=claude re=mt1x>Yes, done in 3caee2d.</c>
```

- One tag per comment, on its own line, directly after the anchored line; replies follow their parent in time order.
- Tags are the only markup; attributes are `id`, `by`, `re`, `at` (iso) and nothing else.
  `<c>` is unambiguous in markdown, one line per comment is cheap in tokens, and the agent can quote `id` straight back into `add --re`.
- `--since` and `--archived` apply like `list`; with `--since` the file still prints in full, only the tags are filtered.
- `--json`: `{ "file", "lines": ["…"], "comments": [{ "line": 12, "id", "by", "re", "at", "text" }] }`, lines 1-based like the TUI.
  No per-line objects: the array of lines stays compact and a comment points at its line.
- Multi-line comment text stays inside the tag; lines after the first are indented two spaces.

## TUI

### Follow changes

- The TUI watches its json and the markdown file and just follows them; no mode.
  Why no mode: a file on disk changed, the screen should be true; a toggle would only let it be stale.
  If it ever annoys, a `Beta > Follow changes` setting is a one-liner.
- Store change: reload comments, keep an open comment box untouched, badge `1 new reply` / `2 new comments` (fades like COPIED).
- Markdown change: re-parse, keep the cursor on its heading anchor, fall back to the line number.
- A save in progress wins over an incoming change (write, then re-read).

### Inline rendering

- Both voices can render inline, each its own toggle, default: agent on, own off.
  Gutter markers stay as today in every mode.
- A thread renders under its line as a quiet block: slightly lighter background, no border, never a popup look.

```
  The parser keeps one sentence per line.
                       claude  Agreed, the wrapper re-joins them.  2m
                          you  Then wrap only in flow mode?        1m
                       claude  Yes, done in 3caee2d.               now
```

- Settings, all in the popup and the View menu:
  - `Inline > Agent comments  [on] [off]`
  - `Inline > Own comments  [off] [on]`
  - `Inline > Align  [right] [left]`
  - `Inline > Time  [relative] [absolute] [hide]`, absolute is `14:02`, or the date when older than 24 h, never both.
- Inline rows are rows of their line for the scroll margin (`span()` already counts rows), so scrolling stays smooth.
- The cursor never lands on an inline row; `j`/`k` skip them.

### Keys

- `{` / `}`: previous / next agent comment, mirrors `[` / `]`.
- `r`: reply to the thread on the cursor line (chooser when several, like `e`).
  Same comment box, title `Reply`.
  `r` is free because reload needs no key.
- `c` always makes a new top-level comment; a reply is always an explicit `r`.
- That is the whole key delta: two nav keys and `r`.

### Copy and report

- A reply copies as its thread: the parent block, then `  > claude: …` lines nested under it.
- `list --json` carries `re`, `author`, `agent`; the markdown report nests threads the same way.
- Archiving a parent archives its thread.

## Non-goals

- Multi-writer merge beyond last-writer-wins (v2: CRDT).
- A daemon or socket.
- Nested rendering of threads (data allows it; v2).
- Rich agent notes beside the text (hunk `--agent-context`): v2.
- Editing another authors comment from the TUI.

## Acceptance

- [ ] Todays json loads and renders exactly as before once moved to the new path.
- [ ] `add --line` from a second terminal shows inline in an open TUI within a second, with a badge.
- [ ] `watch` prints a TUI comment as markdown within a second and never echoes the watchers own author.
- [ ] `r` on a thread, then `list --json`: the reply has `re` = parent id and the parents anchor.
- [ ] `mark` then `list --since last` prints nothing; a new `c` comment prints.
- [ ] `read` output minus `<c …>` lines is byte-identical to the source file.
- [ ] `{`/`}` stop only on agent comments; `[`/`]` unchanged.
- [ ] Both inline toggles off renders byte-identical to the current build on the tour file.
- [ ] Scroll margin stays smooth with inline rows (trace test like `settle`).
- [ ] Editing the markdown in `$EDITOR` while the TUI is open keeps the cursor on its heading.

## Phases (for the plan)

1. Store move, per-file json with `marks`, new ids; `status`, `print`, `list --json/--since/--archive`, `mark`, `read`.
2. `author`/`agent`/`re`; `add`/`edit`/`archive`/`restore` verbs; threaded report and copy.
3. TUI follows both files, badge.
4. Inline rendering settings, `{ }`, `r`.
5. `watch`, `skill`.

## Decided in review (kept here so the why survives)

- Flag over enum; flat threads with a parent pointer; `r` = reply; `you` label from `$USER`.
- No stored seen-ness: marks are manual checkpoints and archive is a separate, per-comment hide.
- XDG honoured only when set; default is one `~/.mdtation` dir.
- Skill stays short and descriptive.
