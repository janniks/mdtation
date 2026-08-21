# mdtation — implementation plan

> Spec: `specs/mdtation.md`. Stack: TS ESM, Node 22, OpenTUI + React, citty CLI.
> Convention: one commit per slice; tick acceptance criteria; append a phase-log row after each commit.

## Phases

### Phase 0 — Scaffold (done)
- git, agent-lock dogfood (AGENTS.md/CLAUDE.md/skills), OptMem, package.json, research.
- `- [x]` Repo initialized; `- [x]` AGENTS.md assembled by agent-lock; `- [x]` OptMem wired.

### Phase 1 — Document model (core seam)
Vertical slice: `Document.fromMarkdown(text)` parses a fixture into headings (with
slug paths + line ranges), code blocks, and lines. Pure; golden-tested.
(API named `parseDocument` per Phase 1 request, same seam.)
- `- [x]` `Document` module: `parseDocument`, `headings`, `codeBlocks`, `lines`.
- `- [x]` Tests: fixtures → parsed structure (nested headings, fenced blocks, tilde fences).
- `- [x]` Slug path = GitHub-anchor grammar (`#section/subsection`); `findHeading`.

### Phase 2 — Render + scroll (first vertical slice)
End-to-end: `mdtation <fixture.md>` opens fullscreen and renders, wheel/cursor/page
scroll. No comments yet. OpenTUI shell + `Renderer` (pure viewport → string[]).
- `- [x]` `Viewport` transitions (moveCursor/pageDown/pageUp/jumpToLine/scroll); cursor invariant.
- `- [x]` `Renderer.render(doc, viewport, opts)` pure frame (gutter cursor + comment markers).
- `- [x]` Golden render test on a fixture doc.
- `[x]` `mdtation --no-tui <file>` renders to stdout on this machine.
- ✅ OpenTUI app shell mounts under **Bun** (`bun src/bin.ts <file>` opens the alt-screen
  and renders the doc frame via `Renderer`). On Node the native FFI is unavailable,
  so `mdtation <file>` falls back to stdout + a stderr notice (`--no-tui` always
  renders to stdout). Keyboard scroll (`j/k`, Ctrl-f/b, Space, `G`/`g`, `q`, Ctrl-c)
  routed + verified: `printf 'jq' | bun src/bin.ts <file>` exits 0.
- ⚠️ Deferral: mouse (wheel/click) and the menu bar are Phase 3.

### Phase 3 — Command catalog + menu bar + help
Single `CommandCatalog` table powers the menu bar (File/View/Navigate/Notes/Tools/Help),
the key dispatcher, and the `?` help dialog (keys read live from the table).
- `- [x]` `CommandCatalog` + dispatch (first-match-wins; typed `HANDLERS` map enforces
  parity — every `CommandId` must have a handler, else typecheck fails).
- `- [x]` MenuBar derives from the catalog (File/Navigate/Notes/Tools/Help) and renders
  in the TUI.
- ⚠️ Help dialog (`?`, keys read live from chords) deferred to the palette/modal slice;
  the `help` command is cataloged but a no-op effect for now.

### Phase 4 — Command palette + comments modal
`/ ` opens a herdr-style search-filtered palette over the catalog; `c` opens a centered
modal (herdr shell) with text input (`↵`/`esc`), anchored to the current heading/line.
- `- [x]` `CommentStore` + `resolve` against `Document` (heading path re-anchors by
  slug; line-number fallback; re-anchors after the doc changes). `Comment`/`Anchor`/`Location`.
- `- [x]` `CommentStore.load`/`save` (persist to `.mdtation/comments.json`; missing/malformed
  -> empty store; round-trips heading + line anchors). `test/persist.test.ts`.
- ⚠️ Comment modal (centered shell, IME-correct caret), annotated-line gutter markers,
  and the `/` command palette — deferred (OpenTUI UI surface; the pure seams above are covered).

### Phase 5 — Copy + navigate comments
Next/prev annotated (`[`/`]`), `y` copies the structured reference to the clipboard;
`Export.copyFormat` produces the agent-consumable markdown block.
- `- [x]` `Export.copyFormat` → markdown reference (tested); clipboard write deferred
  (OSC-52 via OpenTUI under Bun; stdout-only for `--no-tui`).
- `- [ ]` Annotated-line navigation (`[`/`]`) + gutter markers. (depends on CommentStore,
  which is in place; nav dispatch + gutter marking deferred to the modal slice.)

### Phase 6 — Send to CLI + config
`send` serializes to stdout (pipe to agent); `.mdtation/config.json` for keybindings +
theme token overrides + send target.
- `- [ ]` `Export.sendFormat` + `mdtation send` (deferred; clipboard/send channel is OpenTUI/OSC-52).
- `- [x]` Config load + layer (`loadConfig` reads `<cwd>/mdtation.json`, merges over defaults,
  missing/malformed -> defaults; `src/core/config.ts` + `test/config.test.ts`).
  `mdtation config` CLI command deferred (TUI `HANDLERS` map is viewport-effects only).

### Phase 7 — Polish + ship
Themes (pi md tokens wired to a JSON theme), multi-file future-proofing seams,
Homebrew formula + npm publish checklist.

## Phase log

| Phase | Commit | Status | Notes |
|-------|--------|--------|-------|
| 0 | scaffold | done | git + agent-lock + optmem + research |
| 1 | phase1-document-model | done | parseDocument + slugify + findHeading; oxfmt pinned ^0.63.0 (0.1.0 corrupts TS `readonly`), oxlint + .oxfmtrc.json; 9/9 tests, tsc clean |
| 2 | phase2-viewport-renderer | done | Viewport + Renderer pure seams + golden tests (37 total green); citty CLI (`mdtation --no-tui`, `bun src/bin.ts`). OpenTUI fullscreen verified under Bun 1.3.14 (alt-screen renders doc frame; jq/q key routing exits 0). Node falls back to stdout. |
| 3 | phase3-command-catalog | done | CommandCatalog + first-match key dispatcher; typed HANDLERS parity (typecheck); menu bar (File/Navigate/Notes/Tools/Help) renders in TUI under Bun; j/q verified exit 0. Help dialog deferred to palette/modal slice. 41 tests green. |
| 4 | phase4-comments-persist | partial | CommentStore + resolve + load/save (persist, tested) + copyFormat. Subagent-assisted: nemotron added load/save + persist.test.ts; cohere added config.ts + config.test.ts (review-fixed: missing node:test imports, `as any`). 61 tests green. Hardened pi 429 retry (slower backoff). Modal/palette/gutter/clipboard/send deferred. |
| 5 | — | partial | `Export.copyFormat` (tested); `[`/`]` nav + gutter markers + OSC-52 clipboard deferred (OpenTUI). |
| 6 | config-seam | partial | `loadConfig` (`<cwd>/mdtation.json` merge+defaults, tested); `mdtation send`/sendFormat deferred. |
| 7 | — | partial | Themes (pi md tokens -> inline SGR in `renderer.ts`) mostly done: ANSI color/bold/italic ✓, ts/js syntax highlighting ✓ (`syntax.ts`), width-aware hard-wrap ✓ (narrow/mobile), list markers ✓ cyan, status line ✓ (`statusBar`, TUI wired). List re-indent + pi-md theme tokens pending; tables done (narrow-collapse deferred). `mdtation config` CLI + publish checklist pending. Testing TUI: `bun src/bin.ts <file>` (pane w2:pB, all above active). |
| 4+ | renderer-statusbar | done | `statusBar()` pure fn (Ln X/Y · N comments · mode; color-aware: dim label, green numbers, gray mode); wired into TUI (bottom row, frame shrinks 1). Plain output unchanged (golden-safe). (fd30fcf) |
| 4+ | renderer-lists | done | List bullet/number markers colored cyan in color mode; non-list lines fall through to inline styling; plain output unchanged (golden-safe). (bf297f0) |
| 4+ | renderer-color | done | ANSI theme (inline SGR in `renderer.ts`, heading-level colors); `RenderOptions.color` opt-in (default off preserves golden tests); color golden tests. (3f3e1fc) |
| 4+ | renderer-syntax | done | ts/js highlighting (Keyword/Function/Comment/String/Number/Type); inline + fenced, color-aware. (bec2a48) |
| 4+ | renderer-wrap | done | width-aware hard-wrap (continuation gutters) for narrow/mobile panes; golden tests. (bc06667) |
| 4+ | renderer-emoji-fix | done | `hardWrap` sliced UTF-16 code units -> lone surrogates -> UTF-8 panic on emoji/CJK lines (the "broken render on error keys" bug). Replaced with code-point-safe `wrapLine` (`src/core/unicode.ts`); `hardWrap` deleted from the public surface. `renderer-unicode.test.ts` covers BMP, ZWJ families, CJK, narrow wrap, color on/off, `g`/`Esc` no-throw. (fbaac23) |
| 4+ | renderer-tables | done | GFM tables aligned at render time via `tableLayout`/`markTables` (col widths from `displayWidth`); rows inside fenced code blocks left raw; emoji/CJK cells sized correctly. `renderer-tables.test.ts` (7 render + 3 `tableLayout` unit + ZWJ-family guard). (e057034) |
| 4+ | tui-mouse | done | `onMouseScroll` -> `moveCursor` (3x lines, sign of `scroll.delta`); `onMouseDown` -> cursor to clicked row (skips menu bar); hit-area tracks the pane via `width`/`height` setters; `selectable: false` stops text-selection eating clicks. Wired in TUI; tsc + lint clean; verified live in `w2:pC`. (917245e) |
| 4+ | core-coverage | done | 122 tests green (was 112; +10 table tests); `src/core` = 100% lines / 96.8% branch / 98.0% funcs (all functions hit; >=90% goal met). |
| 4+ | tui-styledtext | done | TUI was unusable: raw SGR bytes fed to OpenTUI `TextRenderable` occupied cells (truncated styled lines, garbled status bar, garbage after navigation). Added pure `src/core/ansi.ts` (`spans`/`strip`, 6 tests) + `styled()` bridge to `StyledText` in `tui.ts`; dropped `padEnd/slice` on escaped strings. Verified live in herdr `w4:p1`: clean frame before/after `j`/`G`/`g`. |

## Phase 8 — hunk-style shell (2026-08-20)

Goal: a human can open `bun src/bin.ts <file>` and it feels like hunk: menu bar with dropdowns, sticky heading breadcrumb, status bar, `?` help, `/` palette, `c` comment modal, gutter markers, `y` copy, mouse everywhere.
Architecture: `@opentui/core` imperative (no React).
Root = column flex: menu bar box (1 row) → breadcrumb (1 row) → body `TextRenderable` (flexGrow, `wrapMode: "none"`) → status bar box (1 row).
Overlays are absolutely positioned and follow `src/ui/overlay.ts`; the shell holds at most one and routes keys to it first.
Pure models live in `src/core` with node tests; `src/ui` only wires OpenTUI.

- Slice 8a — chrome (owner: `src/ui/tui.ts`, `src/ui/chrome.ts`, `src/core/menu.ts`, `src/core/crumb.ts`): layout above; menu model derived from `COMMANDS` (category → entries with live key hints); dropdown overlay (mouse hover/click, F10/←/→/↑/↓/↵/esc); breadcrumb = heading path of the cursor line; status bar left `Ln x/y · n comments`, right mode badge + file name; body `wrapMode: "none"`; resize-safe.
- Slice 8b — help + palette (owner: `src/ui/help.ts`, `src/ui/palette.ts`, `src/core/palette.ts`): `?` centered help grouped by category, key column live from `COMMANDS`; `/` palette = input + filtered list, ↵ runs the command id.
- Slice 8c — comments end-to-end (owner: `src/ui/modal.ts`, `src/ui/clipboard.ts`, `src/core/comments.ts` glue): `c` modal (input, ↵ save, esc cancel) → `CommentStore` anchored to heading path / line; persist `.mdtation/comments.json` keyed by file; gutter `●` markers; `[`/`]` nav; `y` copies `copyFormat` via OSC-52 (+ stdout fallback); `send` writes `sendFormat` to stdout on quit.
- Deferred (v2): Comments › Detail [simple/detailed] provenance level for copy/report.
- Integration (orchestrator): wire overlay openers into the shell's command switch; one live pass in herdr; commit.
| 8a | chrome | done | hunk-style shell: root column flex MenuBar/Crumb/body(`wrapMode: "none"`)/StatusBar; `src/core/menu.ts` (`menus`/`specs`/`hint`/`width`/`step`) + `src/core/crumb.ts` (heading path) pure + tested; `src/ui/chrome.ts` MenuBar (hover/click), Dropdown overlay (F10/←/→/↑/↓/↵/esc, mouse), Crumb, StatusBar (`Ln x/y · n comments` + `VIEW` badge); shell exposes `open`/`close`/`vp`/`setCursor`/`draw`/`renderer`/`doc` and routes keys overlay-first; `run(id)` switch leaves help/palette/comment/copy to the orchestrator. Verified live in `w4:p1`: sticky bar, crumb follows `G`/`g`, status is last row at 45 and 19 cols, dropdown keys + click, wheel, body click offset. |
| 8b | help-palette | done | `src/core/palette.ts` (`filter`/`hint`/`rows`, 5 tests) + `src/ui/help.ts` (`Help`: centered box, sections per category, key column live from `COMMANDS`; esc/?/q/click close) + `src/ui/palette.ts` (`Palette`: focused `InputRenderable` + filtered list, ↑/↓/↵/esc, click runs row; input focus deferred a microtask so the opening `/` is not typed). Verified live in `w4:p2` via throwaway harness. |
| 8c | comments | done | `src/core/comments.ts` (`anchorFor`/`create`/`markers`/`storePath`, 4 tests), `src/ui/modal.ts` (centered box: quote + `InputRenderable`, ↵ save / esc cancel), `src/ui/clipboard.ts` (OSC-52 + `.mdtation/last-copy.md` mirror); `[`/`]` added to `COMMANDS`. Verified live in `w4:p3`: modal, `●` gutter, heading + line anchors persisted to `specs/.mdtation/mdtation.md.comments.json`, `y` wrote `copyFormat`, persisted markers on relaunch. Shell wiring: `preventDefault()` the opening key; `root.remove(node)` takes the child. |
| 8 | integrate | done | Shell wires `help`/`palette`/`comment`/`copy`/`[`/`]`; store loads from `<dir>/.mdtation/<file>.comments.json` at start, saves on add; markers flow into `render`/`statusBar`; mode badge shows SAVED/COPIED. `bin.ts` passes the file. Live pass in herdr `w4:p1`: modal→●→persist→`[`→`y` (last-copy.md exact)→`?`→`/bott↵`→F10. 148 tests green. Open: `send` on quit (sendFormat→stdout), OSC-52 unverifiable headless. |
| 8d | checkboxes | done | `src/core/edit.ts` (`box`/`toggle`, 4 tests): `- [ ]`/`* `/`+ `/`1. ` boxes, indent, `x`/`X`. Commands `toggle` (`x`, `space`; new `Edit` menu) + `save` (`ctrl+s`, File). Shell: `doc` re-parsed after each flip, `dirty` → menu bar `file ●` + `UNSAVED` badge, `q` on dirty shows guard badge once then quits, click on `[ ]` (column via `displayWidth`) toggles. Verified live in `w4:p1`: keys, clicks, guard, save, F10 menus. Limitation: click rows are frame rows, so wrapped lines above a box shift the hit row. |
| 8e | view-menu | done | `View` category (Color / Color bold/italic / Syntax highlight, no chords) after `File`; `Entry.checked?` + `menus(commands, state?)` + `prefix()` render `[x] `/`[ ] ` hunk-style, shell rebuilds the menu on open so marks are live; `draw()` passes `{...flags, markers}` to `render` (statusBar stays plain); `Config.view` seeds flags from `mdtation.json`, toggles session-only (UNSURE). Key remap: `C` copies (`y` dropped), `ctrl+d`/`pagedown` + `ctrl+u`/`pageup` page (herdr prefix is `ctrl+b`). Verified live in `w4:p1` via a scratchpad copy of `src` (store rewrite broke `storePath` import): bar `File  View  …`, dropdown `[x]` → `[ ]` on reopen with `**bold**` asterisks shown, `C` → `NO COMMENT HERE`, `y` no-op, palette `col` lists View entries with empty hint, help lists them keyless, `^D`/`^U` page. 166 tests. |
| 8f | store | done | `src/core/store.ts` (`home`/`load`/`save`/`clear`, 5 tests): one `comments.json` in `$MDTATION_HOME` / `$XDG_DATA_HOME/mdtation` / `~/.local/share/mdtation`, keyed by absolute path; `CommentStore.load/save` + `storePath` removed; `clipboard.copy(text)` mirrors to `<data dir>/last-copy.md`; `bin.ts` `--clear` (stderr count, no TUI) + `--where` (prints dir); `.mdtation/` dropped from `.gitignore`. tui.ts call sites left for the orchestrator. |
| 8g | archive-report | done | `Comment.archived?` + `CommentStore.live/archive/restore` (`byAnchor`, `commentLines`, `markers` use `live()`); `src/core/report.ts` `report(store, doc, file, { archived? })` = `# Comments — <basename>` + per comment `copyFormat` block + `<!-- id · ISO · file:line · archived -->` (`line ?` when unresolved); `store.archive/restore(file, ids)`; `bin.ts` `--list` / `--archived` (stdout report) / `--restore <id,id>` (stderr count). 166 tests. tui.ts call sites left for the orchestrator. |
| 8h | gutter | done | Single 2-col gutter cell: caret (`View › Next caret glyph`: `> + ▶ › ●`) on the cursor row, else comment mark (`View › Next comment glyph`: `✦ ● ◆ ▌ ■ •`) for one comment or the count (2–9) with a yellow bg; a commented row keeps its bg under the caret. `ansi.ts` parses bg SGR (40–47/100–107), `styled.ts` maps `bg`. `markers()` returns one line per live comment. Hints lowercase unless shift (`^s`, `^d`); `palette.hint` delegates to `menu.hint`. |
| 8i | shell-wiring | done | Store call sites on `load/save`; wheel = `moveCursor(±3)` with scrolloff from the settings palette; `View › Archive comments on copy` archives + persists after `C`; `Comments › Show in editor` writes `report()` to `$TMPDIR/mdtation-comments.md`, `renderer.suspend()` → `$EDITOR` → `resume()`; `Notes` → `Comments`; `Tools › Settings` = palette in `stay` mode over `src/core/settings.ts` (`margin`, `crumb depth`, `Beta › Frontmatter editing`), ↵ cycles. View dropdown has section separators (`Command.group` → `Entry.gap`). |
| 8j | frontmatter | done | `src/core/front.ts` (`front`/`field`/`set`/`end`, 7 tests). Beta: click a value (or `x`/space on the line) opens the modal prefilled, ↵ writes `key: value`, doc dirty. Hidden by default via `Viewport.first` (`View › Show frontmatter` shows it: blank opener, full-width closer rule). |
| 8k | hide-markup | done | `RenderOptions.hashes/marks/fences/pipes` (default true) behind `View › Show heading marks / inline marks / code fences / table pipes`; fence rows → plain rule, table separator → rule as wide as the content, edge pipes dropped, inner `│`; `---` is always a rule; ragged source tables are re-laid from cells; `examples/tour.md` showcase. |
| 8l | edit-extras | done | Comment modal is a `TextareaRenderable`: ↵ saves, ⇧↵ inserts a newline (verified live in herdr). `src/core/table.ts` (`cell`/`align`): clicking a header or separator cell cycles that column `--- :--- :---: ---:`. Checkbox styles (`View › Next checkbox style`: `[x] ☑ ● ◉ ✓`). `View › Capture mouse` (`M`) releases the mouse so herdr's select-to-copy works. 195 tests. |
| 8m | mouse-polish | done | Status/badge separators are two spaces. Comment modal footer `esc cancel  ↵ save` is clickable; a click outside cancels only while the box is empty, otherwise it is swallowed (body, menu bar, status bar) so typed text never gets lost and the cursor row stays put. `Overlay.away()/place()`: help, palette, modal re-center and Show-all refits on terminal resize. Quit hint clears when the 2 s window closes. |
| 8n | comment-edit | done | `e` (Comments › Edit comment) reopens the comment box prefilled; several comments on the row go through a palette chooser first. Status bar adds `N here  (e to edit)` while the cursor sits on a commented row. `here()` shared with copy. |
