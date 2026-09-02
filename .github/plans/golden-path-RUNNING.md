# Golden path plan

Spec: `.github/specs/golden-path.md`.
Each phase leaves the loop working and tests green; dogfood as we go.

## Phases

1. Base: `core/watch.ts` `follow()`, `changes(prev, next)` in `comment.ts`; TUI and CLI use both; markdown watched by directory.
2. Verbs out of `bin.ts` into `verbs.ts`; tests for `list`, `add`, `mark`, `watch`.
3. Events log: `append`/`read` in `store.ts`; every writer appends; TUI writes `open`/`quit`.
4. `watch` tails the log; `--until <event>`, `--since`.
5. Reload hardening (`watch-DRAFT.md`): pure `reload()`, badges, deferral, anchor fingerprint.
6. README, skill text, PTY harness as a test helper.

## Acceptance

- [x] One watcher implementation, both callers, a save from vim reloads every time.
- [ ] `watch --until quit` returns when the TUI closes; `--since last` replays first.
- [ ] Agent replies show inline without a keypress; edits and archives badge too.
- [ ] Skill fits one screen.

## Log

| phase | commit | note |
|---|---|---|
| 1 | base | `core/watch.ts` `follow()` watches a directory (survives write-then-rename); `changes(prev, next)` in `comment.ts`; TUI badges `COMMENTS UPDATED` on edits and archives; CLI `watch` re-reads the document per tick. Verified: 3 atomic saves reload, `watch` prints across a rewrite. |
| 2 | verbs | `src/verbs.ts`: `run(file, verb, rest, args)` returns `{out, err}` and throws on misuse; `watching()` takes a write sink. `bin.ts` is citty, printing, exit codes, the TUI fallback. 5 verb tests, no process. |
