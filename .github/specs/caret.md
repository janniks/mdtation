# Row caret: wrap-step scrolling, caretable comments, direct e/r

## Why

The caret jumps a whole source line per step, so wrapped lines scroll coarsely and inline comment rows cannot be reached.
`e` and `r` act on the anchor line as a whole, which is ambiguous when several comments sit there, and `r` feels broken on agent comments.

## Model

The caret addresses a visual row: `{line, seg}`.
`seg` indexes the rendered rows of a line: first its wrap segments, then its inline comment rows (agent and own).
The viewport stays line-based; `seg` lives in the TUI and in pure helpers, keeping `viewport.ts` untouched.

## Behavior

- `j`/`k` move one visual row: through wrap segments, then through inline comment rows, then to the next visible line.
- Hidden lines (frontmatter off, archived) are skipped as today.
- The highlight covers exactly the caret row, not the whole line block.
- Scrolling keeps the caret row inside the margin, in row steps, so long wrapped lines no longer jump.
- `c` with the caret on a wrap segment quotes that segment's text; unwrapped lines keep today's no-quote behavior.
- Caret on an inline comment row: `e` edits exactly that comment; `r` replies to exactly that thread; no chooser.
- Caret on a text row: `e`/`r` keep the chooser when several comments anchor there.
- `r` works on agent comments the same as own comments.
- Clicking any row (wrap segment or comment row) places the caret on it; this also fixes the click offset bug from the delete-comment spec, which this supersedes for part 1.
- Status bar shows the comment author and snippet while the caret is on a comment row.

## Pieces

- `src/core/caret.ts` (new, pure): `rows(line)` layout, `step(caret, dir)`, `at(row)` click mapping, `fit(view, caret)` scroll adjust; all on top of `span()`.
- `src/ui/tui.ts`: caret state, key/click wiring, draw highlight, e/r/c targeting.
- Tests: caret stepping across wraps, notes, and hidden lines; click mapping; fit margins.

## Out of scope

- Horizontal caret movement.
- Editing agent comments (reply only, as today).
