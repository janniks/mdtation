# mdtation

## 0.2.4

### Patch Changes

- eecbb35: Outline popup on `o`: every heading in file order, fuzzy filter as you type, live preview, enter to jump, escape to go back. The heading lands on the row the cursor was on and the page is not refilled; `View > Section jump` can put it at the top of the window instead.
- 68b105b: Highlight line lights only the caret's screen row by default; `View > Highlight line` switches to the whole source line or off.
- bed9fde: `ctrl+e` and `ctrl+y` scroll the page one row while the cursor keeps its screen row.

## 0.2.3

### Patch Changes

- 81eaa9a: A short page with wrapped lines or comments fills the screen to its end instead of scrolling early and leaving the bottom empty.
- b7a1452: Add real light and dark terminal palettes, selected by the existing theme configuration or MDTATION_THEME.
- c94791e: When comments arrive outside the visible part of the page, a small notice says so: `↑ 2 new comments above` or `↓ 1 new comment below`. It counts down as you scroll to them, and a click jumps to the nearest one. `Comments > New comment notice` in settings picks stay, fade or off.
- 56fb7a9: Text that changed on disk and comments that arrived from elsewhere glow softly for two seconds, easing in and out, so you can see what moved without a flash. `View > Show changes` turns it off.
- 63e1bfd: The page holds still when the file is rewritten, a comment is added or removed, or the window is resized: the cursor line keeps its screen row. Where content went away, empty rows show instead of a jump, and they go as you scroll out of them. A click near the edge no longer scrolls the page. After a rewrite the cursor follows its line by content, also when the line was reworded or moved, and turning flow on keeps it in its paragraph. Comments follow their line the same way, across sessions too: a comment no longer vanishes when its heading is renamed, a reply stays with its parent, and a comment whose line was deleted stays next to where it was and prints as `Line N?`.
- 3889b01: Tint drag selections with the theme instead of a fixed dark highlight.

## 0.2.2

### Patch Changes

- 6d984a2: Scrolling stays fast with many long comments: text is measured once per word, not once per character of the row so far.

## 0.2.1

### Patch Changes

- a4d90bb: `d` archives the thread under the cursor (replies included, chooser when several); `prune [--older <dur>]` removes archived comments for good.
- 0c9987c: New first-run defaults: inline marks and table pipes off, copy format detailed, own comments inline, scroll margin 8 (values up to 64), inline width 70, highlight line on. `View > Blocks` lists the toggles before the cyclers.
- 515999e: The review loop, end to end: `watch` tails an append-only events log per document (`--until quit`, `--since last`, `--json` with an `event` key, `open`/`quit` lines); the viewer reloads on every save, comment, and reply, defers a markdown change while a box is open, and comments follow their line's text after edits above them. `File > Reload`, atomic save, README loop and skill text.
- 1ed50c0: `:` opens a go-to-line prompt: enter jumps to that source line, clamped like vim, esc closes. Digits typed before a key are reserved for future vim-style counts.
- fc53c24: `View > Line numbers` cycles off, absolute, relative (vim style, distance to the cursor line). A digit count before `j`, `k`, up, or down repeats the move: `5j`. The pending count shows in the status corner, esc clears it.
- e9853f1: Palette rows say what they do: toggles read `Show …`/`Hide …` or `Enable color`/`Disable color`, cyclers split into one row per value (`Show relative line numbers`, `Hide code fences`). `View > More view settings…` opens Settings filtered to View; settings rows are grouped by menu, with `Advanced` for the rest.
- 846e93c: Reload adopts the comments file every time, so a CLI `clear`, `prune` or `mark` is no longer written back by the next TUI save. Save keeps the unsaved badge for an edit made during the write. Comment events are logged after the save lands. Atomic saves write through symlinks and keep the file mode. A torn events line no longer hides the whole log. `watch` works on a fresh install.

## 0.2.0

### Minor Changes

- ebcb090: Row-by-row scrolling through wrapped lines, a `Cursor > Highlight line` setting, double-click on a line to comment, a comment box that grows with the text, and inline notes that wrap inside `Inline > Width` and fill their block. Piped output keeps the source table separators. The status badge corner moved into Settings.

## 0.1.0

### Minor Changes

- a92d2e7: Markdown viewer TUI with inline comments, agent dialogue (add/list/read/watch/mark), and a bun-powered npm launcher.
