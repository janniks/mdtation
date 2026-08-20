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
