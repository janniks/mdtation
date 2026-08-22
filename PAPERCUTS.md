# PAPERCUTS.md

Append-only detours / surprises that cost more than one attempt.

- 2026-08-19 — Cross-platform `node_modules`: copied the repo's `node_modules`
  from macOS, so `esbuild` (used by tsx) was `darwin-arm64` while this host is
  Linux. Every `node --import tsx --test` failed at file:1:1 with a bare
  `'test failed'` (top-level import failure), not an assertion. Fix: `npm ci`
  reinstalls platform-correct native bins (`@esbuild/linux-arm64`). Never copy
  `node_modules` across OSes; run `npm ci` on the destination.
- 2026-08-19 — `pi --print @/path` is NOT a supported `@file` shortcut — it hangs
  (timed out, exit 124) instead of loading the file. Deliver task prompts as an
  inline `--print "<short prompt>"` and have pi `read` the task file itself
  (confirmed by a /tmp control test that created a file + ran a shell command).
- 2026-08-19 — Herdr interactive `pi` panes stall: the task message renders in the
  transcript (the `────` box + context bar) but `agent_status` stays `idle` and
  generation never starts (0%). The message is queued but pi's interactive
  frontend never flushes/sends it. One-shot `pi --print "<prompt>"` works and
  supports multi-step tool use; prefer it. Also `herdr wait` is not a command in
  this herdr build (`herdr pane`/`herdr agent` only).
- 2026-08-19 — Free-tier submodels are flaky for multi-step coding:
  `nvidia/nemotron-3-ultra-550b-a55b:free` timed out (>200s) on a small seam
  (550B reasoning under free quotas is too slow); `cohere/north-mini-code:free`
  hit `Provider finish_reason: error` (429) mid-task. `poolside/laguna-s-2.1:free`
  (the orchestrator) is the only model that stayed reliable end-to-end.
- 2026-08-19 — oxfmt pin: agent-lock's stale `^0.1.0` corrupts TS (`readonly level`
  -> `readonlylevel`); `0.64` blocked by the socket `before:2026-08-15` filter;
  `^0.63.0` is the latest installable and verified-correct.
- 2026-08-19 — Test-runner false-floor: `node --import tsx --test` prints
  `✖ test failed` + `test at <file>:1:1` when a test file fails to LOAD (e.g.
  missing `node:test` imports), NOT when an assertion fails. Read the full runner
  output (`tail`) to distinguish load-errors from assertion failures.
- 2026-08-19 — `hardWrap` emoji panic was a UTF-16 off-by-unit, not by-code-point:
  `text.slice(i, i+width)` over UTF-16 code units split a surrogate pair / wide CJK
  char mid-sequence -> lone surrogate -> `Buffer.from`/OpenTUI UTF-8 encoder throws.
  The fix (`wrapLine` in `src/core/unicode.ts`) breaks only on code-point boundaries
  using per-code-point display widths (CJK=2, emoji pair=2, ZWJ/combining/VS=0); the
  old `hardWrap` was deleted so any stale caller fails to compile. Repro: a line of
  repeated emoji crashed before the fix.
- 2026-08-19 — Table column-width "paradox": `displayWidth(emoji)=6` yet `sig` got 4
  trailing spaces. The 4th space is NOT pad — it is the ` | ` join/close separator
  in `| ${parts.join(" | ")} |`. `pad = widths[c] - displayWidth(cell)`; the join adds
  one leading space per separator. Misread once; count via `JSON.stringify(out)`,
  not by eye over monospace wide chars.
- 2026-08-19 — `herdr pane run <pane> "<fullscreen-tui>" | head` SIGPIPE-kills the
  launched TUI: closing the pipe tears down herdr before bun attaches to the pane's
  PTY. Launch with `timeout N herdr pane run <pane> "bun src/bin.ts <file>"` (no pipe);
  verify with `pgrep -af "bun src/bin.ts"`.
- 2026-08-19 — `herdr pane read` of a wide-char/emoji pane mangles glyphs
  (`\u2705`->`\uFFFD`, CJK cursor drift, ZWJ seqs split across the captured cursor)
  but is NOT a crash — the TUI kept rendering and `Buffer.from(frame,"utf-8")`
  round-trips cleanly. The unit tests assert the real byte-level invariant.
- 2026-08-20 — OpenTUI `TextRenderable.content` does NOT parse ANSI/SGR. Feeding it
  `render(..., {color:true})` strings made every escape byte occupy a cell: styled lines
  lost their tails, the status bar read `Ln 1/1400 comment·`, and redraws after
  navigation left garbage (the terminal interpreted the leaked bytes, so colors
  "appeared" — which hid the bug). Fix: `src/core/ansi.ts` (`spans`) + `styled()` in
  `src/ui/tui.ts` map SGR spans to `StyledText` chunks. Also never `.padEnd/.slice`
  an SGR-laden string.
- 2026-08-20 — `pkill -f "bun src/bin.ts"` kills the calling Claude shell too (the
  pattern matches the `zsh -c` wrapper). Anchor it: `pkill -f "^bun src/bin.ts"`.
- 2026-08-20 — "Mouse doesn't work" was a UX bug, not plumbing: OpenTUI delivers
  `onMouseScroll` to a `TextRenderable` fine (verified with a probe), but
  `ScrollInfo.delta` is always positive — the sign lives in `scroll.direction` —
  and the handler moved the *cursor* 3 lines, so the view only moved once the
  cursor hit an edge. Pan the viewport by direction instead.
- 2026-08-20 — Mouse can be tested headlessly in herdr by injecting SGR sequences:
  `herdr pane send-text <pane> "$(printf '\x1b[<65;10;5M')"` (65 wheel-down, 64
  wheel-up; click = `\x1b[<0;X;YM` + `\x1b[<0;X;Ym`, 1-based). Bun scripts that
  import `@opentui/core` must live inside the repo (module resolution), not in /tmp.
- 2026-08-20 — OpenTUI key routing with a focused `InputRenderable`: global `keypress`
  listeners fire BEFORE the focused renderable, so the key that opens an overlay
  (`c`, `/`) lands in its input unless the shell calls `e.preventDefault()` on the
  dispatched key. While an overlay is open do NOT preventDefault on keys it declines,
  or typing starves. `renderer.root.remove(node)` takes the child, not an id — an id
  throws silently inside OpenTUI and wedges the key loop.
- 2026-08-20: `process.stdout.write` of OSC-52 inside the running OpenTUI shell never reaches the terminal (the renderer owns stdout); use `renderer.copyToClipboardOSC52(text)`. Drag-selection "worked" only because OpenTUI copies natively.
- 2026-08-21: `TextareaRenderable` with `initialValue` leaves the cursor at offset 0; call `gotoBufferEnd()` after focus or typing prepends (showed up as "(edited)inline heading…" during a live test).

- 2026-08-22 — scrolling "jumped": two causes stacked. `jumpToLine` sets `offset = line`, so using it to step over hidden rows re-anchored the window; and the viewport margin was in source lines while wrapped/hidden lines render N/0 rows. Row-aware `settle()` fixed both; reach for `moveCursor` when the window should stay put.
