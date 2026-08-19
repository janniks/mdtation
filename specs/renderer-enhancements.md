# Renderer Enhancements

Phase after the core seams (`specs/mdtation.md`). Richer terminal rendering for the
fullscreen TUI. Goal: a desktop-style, mouse-friendly, small-screen-tolerent markdown
viewer with inline comments.

## Acceptance
- Color + emphasis: ANSI colors per heading level; bold/italic/strikethrough rendered
  (SGR); the gutter (`> `/`● `/`  `) colored per line state (cursor / annotated).
- Code syntax highlighting: fenced blocks tokenized and colored. v1 minimal tokenizer
  for ts/js/sh/json; plain-monospace fallback when nothing matches.
- List indentation: ordered/unordered/nested lists indent the text by level (2-space
  step) to show hierarchy; tight vs loose distinction respected.
- Columns/tables: markdown tables render as aligned ASCII tables when width allows;
  narrow columns collapse on small screens.
- Small-screen friendly: detect pane width (stdout.columns / OpenTUI frame size);
  wrap long lines; truncate overflow with `…`; keep menu bar + gutter readable.
- Feedback tools: a status line (cursor position, comment count, mode) + transient
  toasts/hints on keypress (e.g. on save, on comment add).

## Non-goals (v1)
- HTML / web distribution (TTY + stdout only).
- Full shiki language set (start minimal).
