# Go to line (`:`)

## Why

Move to a source line without repeated cursor keys.
Use the same line numbers as the CLI and comments.

## Decided

- Add the `:` prompt now.
- This replaces the count-first order in section 2 of `friends-round-DRAFT.md`.
- The prompt does not need a line number gutter.
- Reserve digit prefixes (`0`–`9`) for future vim-style counts in VIEW mode.
- No other feature may bind these prefixes.
- Plan count plus `shift+g` (`42G`) and count plus `gg` (`42gg`) for later.
- Do not build counts, a pending count badge, or count cancellation now.
- Keep the current `g` and `shift+g` actions without a count.
- Allow digits as text inside inputs.

## Behaviour

- `:` in VIEW mode opens an empty prompt titled `Go to line`.
- The prompt has one input row.
- Keep the opening `:` out of the input.
- Enter submits the text and closes the prompt.
- Escape closes the prompt without a jump.
- Remove spaces at both ends before checking the input.
- Empty input closes without a jump or an error badge.
- Accept decimal digits only, including leading zeros.
- Reject signs, fractions, exponents, and mixed text.
- Invalid input closes and shows the status badge `INVALID LINE`.
- Invalid input does not move the cursor.
- Numbers start at 1 and count source lines, including hidden frontmatter.
- Clamp `0` to line 1 and numbers above the file length to the last line.
- Thus, `:999` reaches the last line in a file with fewer than 999 lines.
- Large digit strings also clamp to the last line.
- Hidden frontmatter keeps its source numbers.
- A target before `view.first` moves to the first reachable line.
- For other hidden targets, use the existing caret rule: next visible line, else previous.
- Reset the cursor segment to 0.
- Scroll the target into view.
- A wrapped row or an inline comment row does not add a source line.
- An empty document closes the prompt without a jump.

## Design

- Add `Prompt` in `src/ui/prompt.ts` with `title`, `submit`, and `close` options.
- Use one `InputRenderable` in a centered box with the title on its border.
- Keep one input row when the text is long.
- Use the existing `Overlay` contract for keys, resize, focus, and cleanup.
- Escape calls `close`.
- Enter closes before it calls `submit`, including for empty text.
- Keep text keys in the input and block VIEW commands while the prompt is open.
- Close on an outside click only when the input is empty, as `Modal` does.
- Keep parsing and jumps outside `Prompt` so other callers can use it.
- Do not reuse `Modal` directly: it adds a quote, a footer, and a growing textarea.
- The comment `Modal` can share prompt code later; do not refactor it now.
- Add pure `parse(text, total)` in `src/core/line.ts`.
- Return a clamped zero-based index, or `undefined` for invalid input.
- The caller closes on empty text and on an empty document before it calls `parse`.
- Validate all text before number conversion; do not use partial integer parsing.
- In `tui.ts`, pass `doc.lines.length` to `parse` and use the current document on submit.
- Reset `seg`, then use `setCursor` and its `jumpToLine` and `draw` path.
- Keep `view.cursor` zero-based; do not add the frontmatter length to the input number.
- Keep the existing `view.first` clamp and `draw` caret adjustment.
- Use `moveCursor` only for existing relative movement.
- Add command `goto`, title `Go to line`, category `Cursor`, key `:`, and `menu: false`.
- Add its empty core handler and its prompt action in the TUI command switch.
- The command table supplies the palette row and help key without separate entries.

## Tests

- Add unit tests in `test/line.test.ts` for the core parser.
- Cover empty text, spaces, `1`, `3`, `003`, `0`, the last line, and `999`.
- Cover very large digits, invalid text, signs, fractions, and exponents.
- Add a headless PTY test in `test/tui.test.ts` with `test/pty.ts` and its `usable` guard.
- Use a temporary document with distinct text on line 3 and the existing timed input pattern.
- Type `:3`, Enter, then `c`, a comment, Enter, and `q`.
- Read the saved comment from the isolated store and check its text.
- Resolve its anchor against the document and assert `startLine === 2` for source line 3.
- Check palette access, help, cancellation, the error badge, and hidden frontmatter during review.

## Touches

- `src/core/line.ts`, `src/core/commands.ts`, `src/ui/prompt.ts`, and `src/ui/tui.ts`.
- `test/line.test.ts` and `test/tui.test.ts`.
