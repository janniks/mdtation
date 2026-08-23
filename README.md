# 🧘 mdtation

**Feedback your agent can actually use.**

A full-screen terminal markdown viewer with comments that stick to lines, persist between sessions, and copy as a block any agent understands.

## The problem

- Agents ask for review through option pickers: A, B or C, and your real answer fits none of them.
- Long itemized lists in a chat thread scroll away while you type, so you answer from memory.
- A 300-line plan printed into the terminal is read by scrolling a buffer, and your thoughts about line 140 go nowhere.

## The loop

- The agent writes the plan as a markdown file, not a message.
- You open it in mdtation, read it full screen, and press `c` on the line (or drag-select the sentence) you disagree with.
- `C` copies a block with the line number, section path, quote, and your note. Paste it, or let the agent run `--list`.
- The agent revises the file. You open it again, your comments are still anchored, and you go round once more.

Review the plan, not the diff. hunk does this for code diffs, mdtation does it for the prose around them.

## Install

```sh
npm i -g mdtation
mdtation README.md
```

The full-screen TUI runs under Bun. Under Node, mdtation renders to stdout instead.

## Keys

| key | action |
|---|---|
| `j` `k` | move the caret (wheel and click work too) |
| `c` | new comment on the caret line or selection |
| `e` | edit the comment under the caret |
| `C` | copy the comment as a block |
| `[` `]` | previous, next comment |
| `a` | show all comments |
| `/` | command palette |
| `m` | hide or show the menu bar |
| `?` | help |
| `q` | quit (`^s` saves checkbox and frontmatter edits first) |

View options (color, marks, fences, tables, checkboxes, flow, scroll margin) live in the menu bar and the settings popup, and are remembered.

## CLI

```sh
mdtation plan.md --list          # print live comments as markdown
mdtation plan.md --archived      # include archived ones, each with an id
mdtation plan.md --restore a1,b2 # un-archive by id
mdtation plan.md --clear         # forget every comment for this file
mdtation plan.md --no-tui        # render to stdout and exit
mdtation plan.md --where         # print the data dir
```

Comments live in `comments.json` under `$MDTATION_HOME`, `$XDG_DATA_HOME/mdtation`, or `~/.local/share/mdtation`, keyed by absolute path.

## The copied block

```
Line 41  Auth / Session refresh
    Refresh tokens are rotated on every request and the old token is
    revoked immediately.
> Immediate revoke breaks parallel requests from the same tab. Keep a 30 s grace window, then revoke.
```

Tell your agent: "Read the comments I left on plans/auth.md with `mdtation plans/auth.md --list`, address each, then rewrite the file."

## Works with

Claude Code, Codex CLI, Gemini CLI, OpenCode, Cursor CLI, and anything else that reads text. No plugin, no MCP.

## Why not a chat thread

A chat thread is a good place to ask and a bad place to review. The thing you are reacting to scrolls away while you answer, the answer is not tied to the line it is about, and tomorrow it is gone. A comment on a file stays where you put it, survives the agent's rewrite, and reads the same to a person and a model.

## License

MIT
