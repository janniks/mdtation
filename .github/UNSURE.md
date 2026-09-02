# UNSURE.md

Decisions made while unsure. Humans: write a `verdict:` sub-bullet and check the box.
Unchecked entries are swept on occasional cleanup passes.

## 2026-08-19 — mdtation phase seams + subagent run + 429 hardening

- [ ] Runtime target for the fullscreen TUI.
    - choice: keep Node 22 as the install/runtime target; the OpenTUI native FFI only
      loads under Bun, so ship `mdtation --no-tui` to stdout on Node and document that
      the fullscreen TUI runs via `bun src/bin.ts <file>`.
    - alternative: go full-Bun (bin shebang `#!/usr/bin/env bun`) and drop Node.
    - why: respects the "Node 22" stack constraint while still shipping a working TUI.
    - verdict: ?

- [ ] Subagent model policy for the seams.
    - choice: free-tier subagents on `cohere/north-mini` (fast); fall back to
      `poolside/laguna` for any seam that 429s/times out; keep
      `nemotron-550B:free` for read-only review only.
    - alternative: run every seam on `laguna` (reliable, no 429) and skip free models.
    - why: the user wants to "try" both free models, but shipping must beat experiment.
    - verdict: ?

- [ ] `pi` 429 retry patch is a `node_modules` edit (non-durable; `npm ci` reverts).
    - choice: local dev hardening for this session; upstream the slower backoff
      (`provider-retry.js` `getRetryDelayMs`: `8·2ⁿ` capped 60s; `retry.js`: base ≥ 8000ms)
      to `@earendil-works/pi-ai`.
    - alternative: configure via settings `retry.baseDelayMs` + `maxRetries` instead of
      patching dist.
    - why: settings knob is cleaner but needs a `settings.json` write + pi restart;
      the dist patch is instant for the running session.
    - verdict: ?

- [ ] `mdtation config` CLI command placement.
    - choice: put it in the citty CLI (`src/bin.ts`) as a subcommand, NOT in the TUI
      `COMMANDS`/`HANDLERS` table (which is viewport-effects only — a config printer
      breaks the `HANDLERS` parity + `menuBar()` test).
    - alternative: add a degenerate `config` no-op to COMMANDS (breaks menuBar parity test).
    - why: keeps the typed HANDLERS parity intact; matches spec Phase 6.
    - verdict: ?

- [ ] Comment persistence wiring.
    - choice: defer `bin.ts`/`ui` wiring that calls `CommentStore.load` on startup and
      `save` on add, until the comment modal (OpenTUI) exists — otherwise `save` is
      never called (no writer) and the seam is only unit-tested.
    - alternative: wire load-on-startup now (harmless no-op until modal lands).
    - why: avoid wiring integration against a deferred UI; the load/save seam is tested.
    - verdict: ?

## 2026-08-19 — mdtation overnight polish

- [ ] Tables: narrow-collapse vs overflow on panes narrower than the table.
    - choice: let the row overflow as a single unwrapped frame line (current
      behavior) rather than truncate or drop columns.
    - alternative: collapse by abbreviating the widest columns on narrow panes (true
      "narrow-collapse" from the spec).
    - why: overflow is lossless and trivial; collapsing discards data and needs a
      column-priority policy (which columns matter?) — defer until a real need.
    - verdict: ?

- [ ] Mouse handler unit test coverage.
    - choice: no pure seam — `onMouseScroll`/`onMouseDown` live in `src/ui/tui.ts` and
      translate `MouseEvent` -> `Viewport.moveCursor` inline, bound to the OpenTUI
      `TextBufferRenderable`.
    - alternative: extract `scrollLines(delta): number` (sign x 3) + `rowFromClick(y)`
      into `src/core/nav.ts` and unit-test the math.
    - why: the extract is ~3 lines; the wiring costs more than the logic is worth
      (P02/P03). Mouse is tsc-verified + validated live in `w2:pC`.
    - verdict: ?

- [ ] Renderer `tableLayout` export.
    - choice: `tableLayout` is `export`ed so `renderer-tables.test.ts` can unit-test column
      packing without a `Document`/`Viewport` fixture.
    - alternative: keep it module-private and only test through `render`.
    - why: table packing is the interesting pure logic; testing it directly keeps the
      render-golden assertions focused on guttering/gutter color.
    - verdict: ?

## 2026-08-20 — Phase 8c comments

- [ ] Anchor kind for a commented line.
    - choice: `anchorFor` yields a heading anchor only when the cursor line IS a
      heading row; every other line anchors by line number.
    - alternative: anchor body lines to their enclosing heading (path + offset).
    - why: the spec names heading-path as primary and line as fallback; "under a
      heading" needs an offset scheme `resolveAnchor` does not model yet. Line anchors
      are exact today; revisit when edits start drifting them.
    - verdict: ?

- [ ] Comment store location.
    - choice: `<dir>/.mdtation/<basename>.comments.json` — one sidecar per markdown file.
    - alternative: one `.mdtation/comments.json` per directory keyed by file name.
    - why: per-file sidecars need no keying or merge logic and delete cleanly with the
      file. The spec's `comments.json` name is kept as a suffix.
    - verdict: ?

- [ ] Modal key routing.
    - choice: `Modal.key` consumes esc/enter itself and returns `true` for every key
      (shell skips its own dispatch) while the focused `InputRenderable` receives typing
      through OpenTUI's focus path. The shell must `e.preventDefault()` only on the key
      that opens the modal, else the `c` lands in the input.
    - alternative: the modal re-implements editing from raw keys and never uses focus.
    - why: reuses OpenTUI's editing (cursor, backspace, paste) for free.
    - verdict: ?

## 2026-08-20 — Phase 8d checkboxes

- [ ] Checkbox toggling writes the document directly.
    - choice: `x`/space/click flips `- [ ]` in the text, marks the file dirty (`●` + `UNSAVED`), `ctrl+s` writes it, `q` guards once.
    - alternative: a preview/edit mode toggle, or an "edit recommendation" comment instead of touching the file.
    - why: simplest UX, and the same dirty/save path serves future structured edits.
    - verdict: ?

## 2026-08-20 — Phase 8f store

- [ ] Comments live in one `comments.json` keyed by absolute path in the XDG data dir.
    - choice: `$MDTATION_HOME` / `$XDG_DATA_HOME/mdtation` / `~/.local/share/mdtation`, `{ [file]: Comment[] }`, read-modify-write on save.
    - alternative: sqlite (`bun:sqlite` is Bun-only, Node 22 has none without a native dep) or per-session files like hunk.
    - why: zero deps, one file to inspect or `--clear`, cwd-independent, no `.mdtation/` folder next to every markdown file.
    - verdict: ?

## 2026-08-20 — Phase 8g archive

- [ ] Archiving is a JSON `archived` flag on the comment record.
    - choice: `Comment.archived?: boolean` in the same `comments.json`; `live()` filters it out of markers, nav, copy and the default report; `--archived` / `--restore <id,id>` reach the rest.
    - alternative: sqlite, but `bun:sqlite` vs `node:sqlite` need two adapters and Node 22 lacks a stable one.
    - why: one file, zero deps, and the `CommentStore` API stays the same if the backend is swapped later.
    - verdict: ?

## 2026-08-20 — Phase 8e view menu

- [ ] View toggles are session-only; `mdtation.json` `view: { color, emphasis, syntax }` seeds them but is never written.
    - choice: `loadConfig` gains `view` (lenient, each flag defaults true); flipping a View entry only changes shell state.
    - alternative: `saveConfig(cwd, cfg)` writing the toggles back on every flip.
    - why: read-only config stays one function; persisting per-cwd UI state is a decision for later.
    - verdict: ?
- [ ] View toggles have no key chords (menu bar, palette, help only).
    - choice: `keys: []` is legal everywhere; hint renders `""`.
    - alternative: bind e.g. `alt+c` / `alt+e` / `alt+s`.
    - why: keeps the key surface small; toggles are rare.
    - verdict: ?

## 2026-08-20 — Phase 8h–8l gutter/settings/frontmatter

- [ ] Settings palette vs View menu split.
    - choice: booleans that change rendering live in `View` (checkable, sectioned); value-cycling prefs (`margin`, `crumb depth`, beta flags) live in `Tools › Settings` (palette in `stay` mode).
    - alternative: one settings palette for everything.
    - why: View stays one click away; the palette holds the rare knobs. Both are session-only, nothing is written to `mdtation.json`.
    - verdict: ?
- [ ] Hidden frontmatter is implemented as `Viewport.first` (lines before it are unreachable), not by removing lines.
    - choice: keeps frame rows 1:1 with doc lines (click mapping, comments, edits untouched).
    - alternative: render a trimmed document and remap line numbers.
    - why: smallest change; the cost is a blank first row when the line after the fence is empty.
    - verdict: ?
- [ ] Table alignment cycles only from the header or separator row click.
    - choice: body-cell clicks just move the cursor.
    - alternative: any cell click cycles its column.
    - why: clicking a body cell to focus a row must not edit the file.
    - verdict: ?
- [ ] `shift+enter` newline in the comment modal needs a terminal that reports shift on enter (kitty protocol); legacy terminals save instead.
    - verdict: ?
- [ ] Default comment glyph `✦`, default caret `>`, default checkbox `[x]`; all cycle from the View menu until the user picks.
    - verdict: ?

## 2026-08-21 — plans/mdtation-RUNNING.md (8q/8r)

- [ ] Flow paragraphs hide continuation lines, so a comment anchored on one of them loses its gutter marker while flow is on.
  - alternative: show a combined count on the paragraph's first row
  - why: keeps `hidden()` the single mechanism; flow is off by default
- [ ] Drag-select maps the selection's first screen row to a document line like click does (`offset + row`), ignoring wrapped/hidden rows above it.
  - alternative: a row→line table built during render
  - why: same approximation the click handler already makes; fix both together later
- [x] Blockquote text is painted gray as "less contrast"; inline bold/italic resets inside it fall back to the normal color.
  - alternative: re-apply gray after every reset
  - why: simple; rarely visible
  - verdict: it was visible; gray is re-armed after each reset now (2026-08-22)

## 2026-08-22 — archive retention
- [ ] Default `Archive > Remove after` is `30d`.
  - alternative: `never` (safest) or `7d`.
  - why: user wants archive as an undo buffer, not a graveyard; 30d feels like the usual "trash" window.
- [ ] Sweep runs only on TUI start, not on `--list`/`--archived`.
  - alternative: sweep in `store.load` for every path.
  - why: the setting lives in prefs, which the store module does not read; keeps `store.ts` dumb.
- [ ] Comments archived before this change carry no `archivedAt`; their `createdAt` counts instead.
  - alternative: treat them as archived now.
  - why: no migration code while users are few (P02b).

## 2026-08-22 — specs/dialogue-DRAFT.md
- [ ] `marks[]` (manual checkpoints) live in the same json as the comments.
  - alternative: a separate `marks.json`, or a mark per author file.
  - why: one file per document keeps `watch` to one `fs.watch` and `status` to one read.
- [ ] Archive stays per comment (`archivedAt`) next to marks instead of being derived from the human's latest mark.
  - alternative: archived ⇔ created before the last human mark.
  - why: `archive <id>` from the CLI and retention sweeps need a per-comment fact; deriving it would make single-comment archive impossible.
- [ ] `agent: true` flag, no `source: cli|tui`.
  - alternative: store both.
  - why: the TUI only needs "is this an agent"; a source field is free but unused.
- [ ] No `Identity > Name` setting; the human label is `$USER` (CLI `read`/`json`), comments by the TUI carry no author.
  - alternative: a free-text setting in `settings.json`.
  - why: settings rows are enums; a text field needs its own editor. Add when someone needs a different name.

## 2026-08-20 — terminal palette
- [ ] Replaced the VS Code-like SGR palette in `src/core/ansi.ts` and the chrome THEME with a pastel set (openindex-style) as the one and only TUI palette.
  - alternative: keep the old palette default and gate pastel behind an env flag for recordings only.
  - why: user asked for pastel terminals on the site; a second palette just for videos would misrepresent the product.
- [ ] Inline agent/own toggles live in the Comments menu (Options) and align/time only in the settings popup; the spec said all four in both.
  - alternative: four cyclers in the View menu.
  - why: menu toggles and settings rows are different mechanisms; two toggles plus two settings is the least new surface.

## 2026-08-23 — site header prompt
- [ ] The header's "Copy prompt" tells the agent to run `mdtation skill`, which only exists in `specs/cli-DRAFT.md` so far.
  - alternative: point at `--list` and the README until the verb ships.
  - why: the user asked for "which command to use to discover skill"; shipping the verb is the planned next step and the copy should not be rewritten twice.

## 2026-08-23 — site OG image
- [ ] `metadataBase` set to `https://mdtation.dev` so the OG image URL is absolute.
  - alternative: leave `metadataBase` unset and accept a relative `og:image`, which most crawlers reject.
  - why: the domain is not decided anywhere in the repo; change the one line in `site/app/layout.tsx` once it is.

## 2026-09-01 — cursor line highlight
- [ ] `Cursor > Highlight line` slabs every row of the cursor line's block (wrap rows included), not just the caret's row.
  - alternative: highlight the one row the caret sits on, which pinpoints it inside a long wrapped paragraph.
  - why: "current line" reads as the whole line, and the caret glyph already marks the exact row; a long paragraph does turn into a large block though.
- [ ] Its slab is `#2b2d2b`, a new background-only entry in the `ansi.ts` palette rather than one of the 16 SGR colors reused.
  - alternative: reuse `bgGray` (`#3a3d3a`), the comment slab's tone.
  - why: the user asked for the comment slabs to stay the more visible of the two, so the line highlight has to sit under them.

## 2026-09-02 — comment slab tone

- [ ] The comment slab is now `#303330` and the cursor-line slab `#252725`, both as background-only palette entries in `ansi.ts`.
  - alternative: only darken the comment slab and leave the cursor line at `#2b2d2b`.
  - why: the ask was less contrast against the page; the cursor line had to stay a step darker than the notes on it, so both moved.
