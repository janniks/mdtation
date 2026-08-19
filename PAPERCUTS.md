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
