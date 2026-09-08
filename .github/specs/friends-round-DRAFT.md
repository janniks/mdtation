# Friends round: keyboard jumps, line numbers, wheel speed, archive key

Proposal only.
Nothing here ships before each item is approved.
Input: a friends' feedback round (2026-09-07) plus the comment-box wrap bug.

## 0. Comment box: cursor past the field, space on the next row

Status: bug, confirmed, not fixed.

- Repro (probe, textarea width 10, `wrapMode: "word"`):
  type `aaaa bbbb` then a space: cursor sits at column 10, one past the field.
  Type `c`: the row breaks before the space, row 2 shows ` c` with a leading space.
- Same on `@opentui/core` 0.5.11 (newest), same with `wrapMode: "char"`.
  The wrap lives in OpenTUI's native layer, so an upgrade alone does not help.
- Class: OpenTUI breaks a row before trailing whitespace instead of after it.
  A word processor hangs the space in the margin and starts the next row with the word.
- Proposed fix, two parts:
  - Now: give the input one column of slack.
    Wrap and measure at `inner - 1`, draw the field background `inner` wide (a box behind the input).
    The hanging space and the cursor then sit inside the field.
    Cost: one column less text per row.
  - Upstream: report to OpenTUI with the probe as repro (break after whitespace, hang it).
    The leading space on the wrapped row only goes away with that fix.
- Rejected: replace the space by a newline at the row edge (changes the saved text);
  wrap the buffer ourselves with `wrapMode: "none"` (cursor bookkeeping, too complex).

## 1. Archive comment on `d`

- Shipped 2026-09-08, see `delete-comment.md`: `d` archives the thread on the cursor row, `prune` verb.
  Open questions closed: chooser picks one thread; no restore overlay in the TUI; `prune` with no flag uses retention.

## 2. Jumps, one key at a time

Decided 2026-09-08: keep it simple, ship one binding per step, vim style where vim has one.

### Step 1. Go to heading, with a UI

- Key `@`, free today, Sublime's "goto symbol" muscle memory.
- Opens the existing palette listing every heading, indented by level, cursor heading marked.
  Type to filter, enter jumps, esc closes.
- Later, maybe: typing `@` inside the command palette switches to the same list, like Sublime's goto anything.

### Step 2. Go to line, vim style

- Needs the line number gutter first (section 3), else there is nothing to read the number from.
- Count then key: `42` then `shift+g`, the same key that goes to the bottom without a count.
  `g` with a count does the same, vim's `42gg`.
- A pending count shows in the status corner and esc clears it.
- `:42` as an ex-style prompt only if the count feels wrong in use.

### Later, only if asked

- `ctrl+f` / `ctrl+b` full page, `ctrl+e` / `ctrl+y` scroll one row.
- `shift+j` / `shift+k` next and previous heading, superseded by step 1 for most uses.

## 3. Line numbers

- New gutter column, default off.
- Boolean that changes rendering, so per the rule it lives in `View > Line numbers`, key `[]`.
  The config file seeds it like the other view toggles (session-only otherwise).
- Numbers count source lines (what a comment anchors to), wrapped rows show blank.
- Hidden frontmatter keeps its numbers, so `:` and comments agree with the file.
- Open: width fixed to the digit count of the last line; gutter grows by that plus one space.

## 4. Mouse wheel speed

- Setting `Scroll > Wheel lines`, values `1 2 3 5 10`, default `1`.
  Settings popup only, not in the menu bar.
- Applies to `wheel()` only; keyboard moves stay one line.
- Moves the cursor n lines per wheel event, same walk as today.

## 5. Not planned

- Multi-line selection by keyboard: iceboxed (`status: deferred`), reopen if a real use shows up.
- "`e` should show multi-line comments without horizontal scrolling":
  the edit modal word-wraps and grows; inline notes wrap too.
  The `a` popup (all comments) uses `wrapMode: "none"` and clips long lines, that may be what they saw.
  Or they ran a build before the wrap work: 24 commits since 2026-09-02 are not pushed.
  Ask which build they used before we treat it as a bug.

## Order, if approved

1. Wrap slack (0), small and isolated.
2. Archive on `d` (1), spec exists.
3. Wheel setting (4), one setting and one line.
4. Line numbers (3), touches renderer and gutter.
5. Jumps (2), one commit per step: heading palette on `@`, then count + `shift+g` once the gutter exists.
