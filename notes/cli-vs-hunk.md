# CLI surface: mdtation vs hunk

Snapshot of what each tool exposes at the shell and how results flow back to an agent.
Sources: `src/bin.ts`, `src/core/store.ts`, `src/core/prefs.ts`, `src/ui/tui.ts`, `src/ui/clipboard.ts`, `src/core/comment.ts`, `plans/mdtation-RUNNING.md`; hunk from `_learn/hunk-modem` (README, `docs/agent-workflows.md`, `src/app/cli.ts`).
Note: `_learn/hunk` is an unrelated npm package (multipart file splitter); the diff viewer is `_learn/hunk-modem`.
Opinions are marked *(opinion)*; guesses are marked *(inferred)*.

## mdtation today

### Invocation

```sh
mdtation file.md            # fullscreen TUI (Bun); Node falls back to stdout render
mdtation file.md --no-tui   # render to stdout and exit
mdtation file.md --list     # print live comments as markdown and exit
mdtation file.md --archived # --list plus archived ones, each with an `id` line
mdtation file.md --restore a1,b2   # un-archive by id
mdtation file.md --clear    # forget all comments for this file
mdtation file.md --where    # print the data dir
```

- `file` is a required positional, resolved to an absolute path (the store key).
- No stdin support: `-` or a pipe is not handled; the file is read with `readFile`.
  The plan mentions piping only as a goal; nothing in `bin.ts` implements it.
- Flag precedence: `--where` > `--clear` > `--restore` > read file > `--list`/`--archived` > `--no-tui` > TUI.
- TUI launch: `import("./ui/tui.ts")` lazily; if it throws (Node, no native OpenTUI) a warning goes to stderr and the stdout render runs instead.

### Exit codes and streams

| Path | stdout | stderr | exit |
|---|---|---|---|
| `--where` | data dir | – | 0 |
| `--clear`, `--restore` | – | `mdtation: cleared N …` | 0 |
| unreadable file | – | `mdtation: cannot read …` | 1 |
| `--list`, `--archived` | report markdown | – | 0 |
| `--no-tui` / fallback | rendered frame | fallback warning | 0 |
| TUI quit (`q`, `^c`) | nothing | – | 0 via `process.exit(0)` |

- Quit on a dirty doc is refused once; a second quit within 2 s exits without saving.
- `^s` writes the edited markdown back to the file (frontmatter/checkbox edits).

### State on disk

- Data dir: `$MDTATION_HOME`, else `$XDG_DATA_HOME/mdtation`, else `~/.local/share/mdtation`.
- `comments.json`: one object keyed by absolute file path, read-modify-write on every save.
- `settings.json`: View toggles, settings values, cycle picks; written atomically (tmp + rename).
- `last-copy.md`: mirror of the last clipboard copy.
- Comments persist on add/edit; no explicit save needed.

### Ways out of the TUI

- `Comments > Copy comments to clipboard` (`C`): `copyFormat` of the comment under the cursor via OSC-52, mirrored to `last-copy.md`.
  With `View > Archive comments on copy` the comment is archived after copying.
  On a remote terminal the status hints `a to show comments` since OSC-52 is fire-and-forget.
- Drag-select with `View > Select` off: copies the raw selection, same channel.
- `Show all` (`a`): overlay with the full `report()` (title + one block per comment).
- `Show in editor`: writes the report to `$TMPDIR/mdtation-comments.md` and opens `$EDITOR` (default `vi`), TUI suspended.
- Copy format (`View > Copy format`, persisted):
  - `simple`: `Line N`, the quoted selection indented, note as `> ` blockquote.
  - `detailed`: adds the heading crumb (segments clipped to 24 chars) and, without a selection, an 80-char line preview.
- `src/core/sendformat.ts` (JSON line + quote) exists but nothing imports it.

## hunk's flow (from `_learn/hunk-modem`)

### Golden path

```sh
hunk diff                          # working tree, untracked included
hunk show HEAD~1                   # a commit
git diff --no-color | hunk patch - # patch from stdin
git config --global core.pager "hunk pager"   # git diff opens hunk
```

- Subcommands: `diff`, `show`, `stash show`, `patch [file|-]`, `pager`, `difftool`, `session`, `markup`, `skill path`, `extension`, `update`, `daemon serve`.
- Review options: `--mode`, `--watch`, `--agent-context <json>`, `--pager`, `--line-numbers`, `--wrap`, `--sidebar`, `--agent-notes`, `--theme`, `--tab-width`, `--extension`, `--no-extensions`, `--experimental`, `--fast`.
- Config: `~/.config/hunk/config.toml` and repo `.hunk/config.toml`; quit prompts to save changed view prefs.
- When stdout is not a TTY the startup plan picks `static-diff-pager` and prints colored diff text instead of a TUI *(inferred from `startup.ts`)*.

### Handing results back

- Primary channel is a live session, not the clipboard: the TUI registers with a loopback daemon; the agent runs `hunk session review --json`, `navigate`, `reload`, `comment add|apply|list|rm|clear`.
- `hunk skill path` prints a bundled SKILL.md the agent loads; the TUI can copy that prompt via OSC-52 (`App.tsx`), with a status notice when OSC-52 is unsupported.
- Human `c` notes are read by the agent through `hunk session comment list` *(inferred: `clear --all` says it "also clears human `c` notes")*.
- Alternative: `--agent-context notes.json` renders prewritten agent notes beside the diff.
- No print-on-exit, `--output`, or `--print` flag was found in `cli.ts` help; OSC-52 copy of user notes as a whole was not found either.

## Comparison

| Aspect | mdtation | hunk |
|---|---|---|
| Input | one file path | git/jj/sl refs, two files, patch file, stdin `-`, git pager |
| Stdin | no | yes (`patch -`, `pager`) |
| Non-TTY stdout | `--no-tui` flag / Node fallback | auto static pager *(inferred)* |
| Return channel | OSC-52 copy + `last-copy.md`, `--list` | daemon + `hunk session …` JSON |
| Agent bootstrap | paste copied block | `hunk skill path` + skill file |
| Batch out | `--list`, `--archived`, `Show in editor` | `session comment list` |
| Batch in | none | `--agent-context`, `comment apply --stdin` |
| Settings | `settings.json` in data dir | TOML, user + repo |
| State location | global `comments.json` keyed by path | in-process session |
| Watch/reload | no | `--watch`, `session reload` |

### mdtation golden path

```sh
mdtation spec.md      # read, `c` to comment, `C` to copy
# paste into the agent chat; or later:
mdtation spec.md --list | pbcopy
```

- Escape hatches: `--list` for scripting, `last-copy.md` when OSC-52 is swallowed, `Show in editor` for bulk edits, `--no-tui` for plain output.

### What hunk has that mdtation lacks

- Stdin/pipe input and a non-TTY auto mode.
- A machine channel for comments (JSON, live session).
- Print-on-exit / send-on-quit: listed open in the plan (`sendFormat` + `mdtation send`), unused code exists.
- Loading agent notes into the viewer.

## Recommendations (ranked, *opinion*)

1. Add `--json` to `--list`: emit `sendFormat`-style records, one per line.
   Small, uses existing pure code, gives agents a stable surface without a daemon.
2. Accept `-` / piped stdin: read stdin when `file` is `-` or stdin is not a TTY.
   Comments for stdin input need a key; use a hash of the text or skip persistence.
3. Print-on-quit: `--print` flag (or `View` toggle) that writes the report to stdout after the TUI exits.
   Closes the plan's open `send` item with no new transport.
4. Auto `--no-tui` when stdout is not a TTY, mirroring hunk's static pager; keeps `mdtation x.md | head` sane.
5. Route `--clear`/`--restore` confirmations to stdout only when `--json`; keep stderr otherwise.
   Low value, skip unless scripting needs it.
6. Defer a daemon/session API: hunk needs it for diffs that live in process; mdtation's file-keyed store already makes `--list` re-entrant.
