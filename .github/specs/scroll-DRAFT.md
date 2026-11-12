# Scroll the page, keep the cursor

Research only (from memory, not checked against current docs). Not built.

## Two meanings

- A: the cursor stays on its text line; the page moves under it, and the cursor is pushed only at the window edge.
- B: the cursor stays on its screen row; the page moves and the cursor takes the line that arrives there.

## Precedent

- Vim, less, tmux copy mode, man: `ctrl+e` down, `ctrl+y` up, one line. Meaning A.
- Vim `zt`, `zz`, `zb`: put the cursor line at the top, centre, bottom. Meaning A, in one jump.
- Helix: `z j`, `z k`. Kakoune: `v j`, `v k`. Meaning A, behind a view prefix.
- VS Code and Sublime Text: `ctrl+up`, `ctrl+down` (Sublime on macOS: `ctrl+alt+up`, `ctrl+alt+down`). Meaning A.
- Emacs: `scroll-up-line`, `scroll-down-line`, no default key; `scroll-lock-mode` is meaning B.
- Vim `ctrl+d`, `ctrl+u` and the Scroll Lock key: meaning B.
- The mouse wheel in most editors: meaning A.

## For mdtation

- Free today: `ctrl+e`, `ctrl+y`, `shift+j`, `shift+k`, `shift+up`, `shift+down`.
- Not usable: `ctrl+up`, `ctrl+down` (macOS Mission Control takes them), `Cmd` chords.
- Recommended: `ctrl+e` and `ctrl+y` (the vim and less habit), with `shift+j` and `shift+k` as a second pair for one-hand use.
- Meaning A fits the caret model: move the top row by one, then `fit` pushes the cursor only when it leaves the window.
- Counts work as for `j` and `k`: `5 ctrl+e`.
- Open: should the scroll margin push the cursor (vim does), or only the window edge?
