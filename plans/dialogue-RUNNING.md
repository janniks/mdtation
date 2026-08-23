# Dialogue plan

Spec: `specs/dialogue.md`.
Tracer bullets: each phase leaves the golden path working and tests green.

## Phases

1. Store: `~/.mdtation` root (XDG when set), `comments/<encoded>.json` holding `{comments, marks}`, `archivedAt` only, ids `time36+2`.
   CLI subcommands `list [--json|--since|--archive|--archived]`, `mark`, `read [--json]`, `print`, `status`, `restore`, `clear`; old flags go.
2. Model: `author`, `agent`, `re`; `add`, `edit`, `archive` verbs; threaded report and copy; `$USER` identity + `Identity > Name` setting.
3. TUI follows both files; badge on new comments.
4. Inline rendering (`Inline > …` settings), `{ }`, `r` reply.
5. `watch`, `skill`.

## Log

| phase | commit | note |
|---|---|---|
| 1 | store+verbs | `~/.mdtation` root (XDG when set), `comments/<path>.json` `{comments,marks}`, `archivedAt` only, ids `time36+2`; verbs list/mark/read/print/status/archive/restore/clear; old flags gone; user data moved by hand. |
