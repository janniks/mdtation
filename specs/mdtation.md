# mdtation — terminal markdown viewer with comments to CLI

## Problem Statement

Agents and readers land on a markdown file (a spec, an AGENTS.md, a design doc) and want
to **leave a comment on a specific spot and get a structured reference they can paste
into a coding agent** — but terminal markdown viewers are either pagers (no comments) or
heavy web tools (no terminal). We want a **desktop-style terminal viewer** (hunk's polish)
where commenting on any heading/line produces a copyable, agent-consumable reference that
ships to the clipboard and to the running CLI agent (agentation's flow, terminal-native).

## Solution

`mdtation <file>` renders a markdown file fullscreen in the terminal (OpenTUI, Node 22),
with a hunk-style **menu bar** and a herdr-style **command palette** popup. You place the
cursor on any line, press `c`, type a comment in a centered modal, and `mdtation` anchors
it to the heading path (with a line fallback). A `copy` command serializes the comment to a
structured markdown snippet (heading path + quoted line + your note) onto the clipboard,
and a `send` command emits the same snippet to the CLI agent channel (stdout by default,
configurable socket later). Mouse works for scrolling, clicking to place the cursor, and
hovering an annotated line. Navigation reuses hunk's keys (`j/k`, `Ctrl-f/b`, `G/g`,
`[ ]`).

## User Stories

1. As a reader, I want to open a markdown file and read it styled in the terminal, so that
   I don't leave my dev environment.
2. As a reader, I want a top menu bar (File/View/Navigate/Notes/Tools/Help), so I can
   discover features without memorizing keys.
3. As a keyboard user, I want a command palette on `/`, so I can run any command by name.
4. As a keyboard user, I want hunk-style navigation (`j/k`, page up/down, `[`/]` between
   annotated lines, `G`/`g` to jump), so I can move fast.
5. As an annotator, I press `c` to open a centered modal with a text input (`↵` save,
   `esc` cancel), so I can comment on the current line.
6. As an annotator, my comment is anchored to the heading path (with a line fallback), so
   it survives edits above it.
7. As an annotator, I want annotated lines marked in the gutter, so I can see where notes
   live at a glance.
8. As a reader, I press `?` to open a help dialog whose key column is **live** from the
   command table, so help never drifts after a remap.
9. As a user, I want to copy a comment's structured reference to the clipboard (`y`), so
   I can paste it into my agent conversation.
10. As a user, I want to `send` a comment to the CLI agent channel, so the agent receives
    a precise, anchorable reference without copy/paste.
11. As a mouse user, I want to scroll with the wheel and click to place the cursor, so I
    can use the mouse without losing keyboard control.
12. As a user, I want my keybindings configurable (with exclusivity like hunk), so I can
    rebind without colliding.
13. As a developer, I want to `pip install`/`npm install` mdtation from npm with no build
    step on the user's machine, so distribution is simple.

## Implementation Decisions

- **TUI framework:** OpenTUI + React (`@opentui/core`, `@opentui/react`), Node 22. Chosen
  because mouse + precise positioning are hard requirements; hunk proves the desktop-style
  menu bar and modal shell are easy in these libs. Distributes via npm with prebuilt
  per-platform native binaries (optionalDependencies); CI builds common arches. Not pi-tui
  (ruled out), not ink (weak mouse/abs-position), not blessed (abandoned).
- **CLI:** `citty` (house convention; matches agent-lock/codeexplore). `mdtation <file>`
  opens the TUI; `--no-tui` prints a TOC/markdown summary for piping; `--version`.
- **Markdown parse → render:** use `marked` (already a dep of `@opentui/core`) to tokenize,
  then render tokens through OpenTUI `Text`/`Box` with pi's markdown color tokens
  (`mdHeading`, `mdLink`, `mdCode`, `mdCodeBlock`, `mdQuote`, `mdListBullet`, `mdHr`) as
  the theme vocabulary. No full HTML pipeline — tokens straight to styled terminal spans.
- **Module boundaries (deep modules, testable seams):**
  - `Document` — `fromMarkdown(text): Document` exposing `lines`, `headings` (each with
    `slugPath`, `startLine`, `endLine`), `codeBlocks` (lang + line range). Pure.
  - `Comment` / `Anchor` — `anchor`: `{ kind: "heading", slug: string[] }` | `{ kind: "line", n: number }`.
  - `CommentStore` — `add(comment)`, `byAnchor(anchor)`, `remove(id)`, and
    `resolve(anchor, doc): Location | null` (heading path → line range; line → exact).
    The persistence seam (serialize/deserialize the store to `.mdtation/comments.json`).
  - `Viewport` — `{ offset, cursor, width, height }`; pure transition functions
    `scroll(delta)`, `moveCursor(delta)`, `pageDown()`, `jumpToLine(n)`.
  - `CommandCatalog` — a single table `{ id, title, category, defaultKeys, effect? }`.
    The menu bar, the help dialog, the key dispatcher, and the command palette all derive
    from it (hunk's parity guarantee: a handler-map keyed by `id` covers every cataloged
    id, else typecheck fails).
  - `Renderer` — `render(doc, store, viewport, theme): string[]` (the OpenTUI frame).
    Golden-tested on fixtures, not widgets.
  - `Export` — `copyFormat(c, doc): string` and `sendFormat(c, doc): string` produce the
    agent-consumable markdown block. Pure.
  - `Ansi` — `spans(text): Span[]` / `strip(text)` turn the Renderer's SGR strings into
    styled spans for the TUI (OpenTUI does not parse escape bytes). Pure.
- **Anchor scheme (key decision):** heading-path is the **primary** anchor (stable across
  edits), slugified the GitHub-anchor way (`path#section/subsection`). Line number is the
  **fallback** for inline/text spans without a heading. A comment's anchor is resolved
  against the current `Document` at render time so a moved heading re-anchors correctly.
- **Structured reference format (copy/send output), example:**
  ```md
  <!-- mdtation comment on `## Architecture / The model` (line 12) -->
  > "the one diff file"

  > fix the heading level here
  ```
  — a markdown blockquote with a comment, prefixed by an HTML comment that names the
  target heading path + line. Pasteable into Claude Code / Codex; parseable back into an
  anchor by re-scanning headings.
- **Send-to-CLI channel:** v1 = `mdtation send` prints the reference to **stdout** (pipe to
  any agent); later phase = optional local socket (`/tmp/mdtation.sock`) that streams
  references (agentation's MCP idea, minus the MCP server for now).
- **Config:** a single `.mdtation/config.json` (keybindings, theme token overrides, send
  target). Layer order: defaults → user config → CLI flags.
- **One sentence per line** in all source docs (agent-lock house convention) so refs stay
  meaningful.

## Testing Decisions

- **Good test = external behavior, not widgets.** Follow hunk: test the planning/reducer
  layers and the rendered frame **string**, not OpenTUI cells.
- **Seams tested (highest points):**
  1. `Document.fromMarkdown` — fixtures → headings/codeblocks/lines. Pure.
  2. `CommentStore` + `resolve` — add at an anchor, resolve against a doc, re-anchor after
     the doc changes. Pure.
  3. `Renderer.render` — fixture doc + store + viewport + theme → expected string[]
     (golden). One seam covers all visual output.
  4. `CommandCatalog` — dispatch a key → id; derive menu+help from the same table;
     type-level parity (handler map covers every id) — hunk's `dispatchAppCommand` shape.
  5. `Export.copyFormat/sendFormat` — comment → exact markdown string. Pure.
  6. `Viewport` transitions — key → offset/cursor invariants. Pure.
- **Prior art:** mirror hunk's `test/` (keybindings dispatch, render planning) and
  agent-lock's `test/*.test.ts` (manifest round-trip). Run via `node --import tsx --test`.

## Out of Scope

- Multiple files / workspace view (single file v1).
- VCS / git integration (no stashes, no diffs — this is a markdown viewer, not hunk).
- Session broker / daemon / MCP server (agentation sync deferred).
- Browser / editor extensions.
- Syntax highlighting inside fenced code blocks (render as plain monospace; add a
  highlighter lib later).
- Vim mode / multiple cursors.
- Web distribution (npm binary only; Homebrew formula is a later phase).

## Further Notes

- The menu bar is the **primary discovery surface** (per user); the command palette (`/`)
  is the secondary, keyboard-first path. Both read from the same `CommandCatalog`.
- "No surprises" wins: dependencies are OpenTUI (prebuilt native, npm), `marked`
  (already pulled), `citty`+`zod`+`consola` (house convention), `picocolors`. No Bun,
  no Rust, no hand-rolled terminal parser.
- Dogfooding: `mdtation` reads its own `AGENTS.md` for dev rules (assembled by agent-lock).
