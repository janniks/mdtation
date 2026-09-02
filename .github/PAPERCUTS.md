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

- 2026-08-23 — recording gifs of the TUI: `asciinema rec` in a python pty + `agg` works, but three traps cost retries.
  - writing keys char-by-char with a typing delay splits escape sequences, so mouse/arrow tokens arrive as plain keys (`M` toggled mouse capture, `m` the menu bar); write each `\x1b[...X` sequence in one `os.write` (`site/rec/record.py`).
  - the cast's first frame is the blank alt screen and the last is teardown after `q`; trim both by timestamp and coalesce events <40 ms apart or the gif flashes half-drawn frames on loop.
  - tapes that `^s` save write to `test/tour.md`; `git checkout test/tour.md` after a batch.
- 2026-08-23 — `npm run build` in `site/` while `npm run dev` is running clobbers `.next`, and the dev server then 404s its own CSS/JS; restart dev after a build (`rm -rf .next`).
- 2026-08-23 — Bun `fs.watch` on a directory reported only the `rename` for the `.tmp` of an atomic write, never the final name. Match on the target's name as a prefix.
- 2026-08-23 recorder seeds silently ignored after the per-file store landed
  - `record.py` still wrote `comments.json`; the store reads `comments/<abs path, "/" -> "-">.json` with `{comments, marks}`. Every seeded tape rendered with "0 comments" and no error.
  - a tape that leaves a modal open swallows `q` and `waitpid` hangs the whole batch; `record.py` now kills the app after 5 s.
- 2026-08-23 `record.py` must be run from the repo root with `site/rec/tapes/<name>.json`
  - the child `chdir`s to the root before `asciinema`, so a tape path relative to `site/` points nowhere: the cast keeps its old header, the app never starts, and `agg` fails on an empty cast with no hint why.
- 2026-09-01 — `TextareaRenderable` never fires an `input` event; that listener was dead and the comment box had never resized while typing. `onContentChange` is the hook (`EditBufferRenderable`). `virtualLineCount` also stayed 1 with `wrapMode: "word"`, so count rendered rows yourself (`wrapWords`).
- 2026-09-01 — a Renderable resized this tick still reports its old `height`, so re-centering right after `node.height = n` uses the stale one and the box grows off the bottom. Pass the height you just set (`center(node, renderer, h)`).
- 2026-09-01 — driving the TUI headlessly: `{ sleep 1.5; printf '<keys>'; sleep 3; } | script -qec "stty rows N cols M; bun src/bin.ts <file>" /dev/null`. Piping keys with no trailing sleep races the app's startup and it exits before drawing. Mouse clicks are SGR 1006: `\x1b[<0;COL;ROWM` press, `...m` release. Reconstruct the screen by replaying `\x1b[R;CH` moves — and let the CSI regex accept `?`, or `\x1b[?2026l` corrupts every position after it.
- 2026-09-02: a full-width styled row bleeds its attribute into the next row under OpenTUI.
  - Its ANSI emitter skips the reset when a run ends on the last column and only ever adds attributes (no `22`/`23`/`24`), so a dim `────` rule made the H1 under it bold+dim after scrolling.
  - Seen on `@opentui/core` 0.5.3 and 0.5.4. Keep full-width rows attribute-free (color only), or one column short.
- 2026-09-02: `store.save` used one tmp name per process, so two saves in flight (copy-all with archive-on-copy saved once per comment) renamed each other's file away: `ENOENT rename ….tmp`.
  - tmp names now carry a counter; the loop saves once. Any per-item `persist()` loop is the smell to watch for.
  - Sibling class: a `void promise` in the TUI. OpenTUI registers `unhandledRejection` and pops its log console over the page (`openConsoleOnError`), which is what the "console focused" screen was. Every background promise now goes through `safe()`, which badges the error instead.
  - One `atomic(to, text)` in `store.ts` is the only async tmp + rename writer; `prefs.ts` stays sync, which cannot interleave.
