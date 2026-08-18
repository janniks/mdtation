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
- `- [ ]` `CommandCatalog` + dispatch (first-match-wins; parity typecheck).
- `- [ ]` MenuBar component (mouse + keyboard).
- `- [ ]` Help dialog; key column derived from live chords.

### Phase 4 — Command palette + comments modal
`/ ` opens a herdr-style search-filtered palette over the catalog; `c` opens a centered
modal (herdr shell) with text input (`↵`/`esc`), anchored to the current heading/line.
- `- [ ]` Palette popup (search + filter + enter/esc).
- `- [ ]` `CommentStore.add` + `resolve` against `Document`.
- `- [ ]` Comment modal (centered shell, IME-correct caret).
- `- [ ]` Annotated lines marked in the gutter.

### Phase 5 — Copy + navigate comments
Next/prev annotated (`[`/`]`), `y` copies the structured reference to the clipboard;
`Export.copyFormat` produces the agent-consumable markdown block.
- `- [ ]` `Export.copyFormat` → markdown reference; clipboard write.
- `- [ ]` Annotated-line navigation + gutter markers.

### Phase 6 — Send to CLI + config
`send` serializes to stdout (pipe to agent); `.mdtation/config.json` for keybindings +
theme token overrides + send target.
- `- [ ]` `Export.sendFormat` + `mdtation send`.
- `- [ ]` Config load + layer (defaults → user → flags).

### Phase 7 — Polish + ship
Themes (pi md tokens wired to a JSON theme), multi-file future-proofing seams,
Homebrew formula + npm publish checklist.

## Phase log

| Phase | Commit | Status | Notes |
|-------|--------|--------|-------|
| 0 | scaffold | done | git + agent-lock + optmem + research |
| 1 | phase1-document-model | done | parseDocument + slugify + findHeading; oxfmt pinned ^0.63.0 (0.1.0 corrupts TS `readonly`), oxlint + .oxfmtrc.json; 9/9 tests, tsc clean |
| 2 | phase2-viewport-renderer | done | Viewport + Renderer pure seams + golden tests (37 total green); citty CLI (`mdtation --no-tui`, `bun src/bin.ts`). OpenTUI fullscreen verified under Bun 1.3.14 (alt-screen renders doc frame; jq/q key routing exits 0). Node falls back to stdout. |
| 3 | — | pending | — |
| 4 | — | pending | — |
| 5 | — | pending | — |
| 6 | — | pending | — |
| 7 | — | pending | — |
