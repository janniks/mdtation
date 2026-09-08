# Line numbers and movement counts

## Why

Show source line numbers beside the text.
Use a digit count to move several source lines with one command.

## Decided

- Use `off` as the default.
- Replace the boolean and key proposal in section 3 of `friends-round-DRAFT.md` with a View menu cycler.
- Use the reserved digit prefixes from section 2 for `j`, `k`, Down, and Up only.
- Keep count plus `shift+g` and count plus `gg` planned for later.
- Keep the existing actions for `g` and `shift+g` after the count clears.
- Keep new identifiers to single words, except the required command id `viewNumbers`.

## Behaviour

- `View > Line numbers` cycles through `off`, `absolute`, and `relative` in that order.
- Show the current value in the View menu and the Settings row.
- Place the number column to the left of the existing two-column caret and comment gutter.
- Absolute mode shows the source line number, starting at 1.
- Relative mode shows the absolute number on the cursor line and the source-line distance on other lines.
- For example, cursor line 4 gives labels `3`, `2`, `1`, `4`, `1` on source lines 1 through 5.
- Use the same source numbers as the CLI, comments, and `:`.
- Hidden frontmatter keeps its source numbers.
- Show a number only on the first rendered row of a source line.
- Keep the number column blank on wrapped continuation rows and inline comment rows, including the caret row.
- Do not repeat a number when the first row has scrolled out of view.
- Hidden lines have no row and do not cause later lines to change their numbers.
- Set the number column width to the digits in the last source line number plus one space.
- Align numbers to the right before the final space and use the existing dim color.
- Keep this width in relative mode, regardless of the cursor position.
- With numbers off, add no width and keep the existing output.
- In VIEW mode, accept unmodified digits `0` through `9` as a pending decimal count.
- Leading zeros are allowed; a zero count makes no move.
- Cap the count at `9999` after each digit.
- Show the pending value in the configured status corner until it clears.
- A count before `j` or Down moves down that many source lines; `k` or Up moves up.
- Thus, `3j` from source line 1 reaches source line 4, and `5j` reaches source line 6.
- Wrapped rows and inline comment rows do not consume a count.
- Clamp the target to the first reachable source line and the last source line.
- For a hidden target, use the existing caret rule: next visible line, else previous.
- For a nonzero counted move, reset the cursor segment to 0 and scroll the target into view.
- Without a count, keep the existing movement by screen row.
- Escape clears the count without a move.
- Every other non-digit key clears the count and runs normally, including an unbound key.
- Digits remain text inside inputs; counts apply only when no overlay is open.
- Opening an overlay clears the count, including when opened with the mouse.

## Design

- Add `viewNumbers`, title `Line numbers`, category `View`, and `keys: []` to `src/core/commands.ts`.
- Add its empty core handler and its cycle case in the shell's `run()`.
- In `src/ui/tui.ts`, extend `CYCLES`, initialize `pick` to index 0, and pass `numbers` through `style()`.
- Reuse `menus()`, `cyclers()`, `step()`, and `remember()` to display and save the value in `picks`, with the existing startup restore.
- Add optional `numbers` to `RenderOptions` in `src/core/renderer.ts`, with default `off`.
- Keep `GUTTER_WIDTH = 2`, `gutterFor()`, and `caret()` for the existing marks.
- Export one pure `gutter(doc, opts)` helper for the total offset before text.
- Derive it only there: `GUTTER_WIDTH` plus zero when off, else `String(Math.max(1, doc.lines.length)).length + 1`.
- Obtain the number column width from this offset minus `GUTTER_WIDTH`; do not repeat the digit calculation.
- Use this offset in renderer `render()` and `span()` when calculating the available text width.
- Prefix table rows and first text rows with numbers; prefix continuation and comment rows with equal spaces.
- Keep number styling outside the text highlight and preserve the existing caret and comment marks.
- In the shell, replace fixed offsets in `click()`, the selection listener, `lay()`, and `slice()` with this helper.
- `click()` subtracts the shared offset from `e.x - this.text.x` before checkbox, frontmatter, and table tests.
- Keep click-to-line mapping through `place()` and `spans()` with the same reduced text width.
- In drag selection, order the endpoints by screen position and remove only selected gutter columns on each row.
- On the first selected row, remove up to `Math.max(0, gutter(doc, opts) - col)` columns, where `col` is relative to the text pane.
- On later selected rows, remove up to the full shared offset; preserve selected text and leave overlay selection unchanged.
- Use the reduced width for inline comment layout and wrapped quotes; recalculate from current options after resize or a cycle change.
- Add one shell field `count: number | null = null`; `null` means no pending count.
- In `onKey`, use `toChord()` to accept only single digit chords in VIEW mode before `matchKey()`.
- Consume digit events, append arithmetically, cap the value, and redraw the count badge without a fade timer.
- For every non-digit key, save the count locally and clear the field before overlay dispatch or the F10 branch can return.
- Redraw on cancellation even for an unbound key, so the count badge clears.
- Pass the saved count to `run(id, n)` only for matched `cursorDown` and `cursorUp` commands.
- In that branch, use `moveCursor()` with the signed source-line count, reset `seg`, and use `draw()` for caret adjustment and scrolling.
- Keep the existing `walk()` path when no count is supplied; return without movement for zero.
- Keep `toChord()`, `matchKey()`, and `reduceCommand()` pure; add no shared count state or general command repeater.

## Tests

- Add renderer unit tests in `test/renderer.test.ts` for absolute labels and relative labels above, on, and below the cursor.
- Check blank number columns on wrapped and inline comment rows, including when the caret is on those rows.
- Check widths at 9, 10, and 100 source lines, right alignment, dim color, hidden frontmatter, and unchanged output when off.
- Check that `render()` and `span()` agree on wrapping with the number column enabled.
- If a pure count helper is extracted, test digit accumulation, leading zeros, zero, and the `9999` cap at that helper.
- Add one headless PTY test in `test/tui.test.ts` with `test/pty.ts`, its `usable` guard, and timed input pattern.
- Use an isolated store and a temporary document with distinct text on source line 4 and no hidden or wrapped lines.
- Type `3j`, then `c`, a comment, Enter, and `q`; assert one saved comment with the expected text.
- Resolve its anchor against the document and assert `startLine === 3` for source line 4.
- During review, check Up and Down counts, cancellation, input digits, persistence, and mouse selection in all three number states.
- Check counted source-line movement across wrapped and comment rows, plus checkbox and table clicks with the added offset.

## Touches

- `src/core/renderer.ts`, `src/core/commands.ts`, and `src/ui/tui.ts`.
- `test/renderer.test.ts` and `test/tui.test.ts`; a count helper and its unit test only if extracted.
