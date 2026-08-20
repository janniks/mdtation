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
