# Palette items say what they do

## Why

A palette row like `Line numbers` or `Color` does not tell the user what enter will do.
A row must read as an action: `Show relative line numbers`, `Hide menu bar`.

## Decided

- Every palette row is an action with a verb.
- A toggle shows the action that flips it: `Show …` when off, `Hide …` when on.
- A cycler is split into one row per value, the current value is not listed.
- The menu bar keeps its neutral titles with `[x]` marks and `[value]` hints.
- The Settings popup keeps its rows with `[value]` and enter cycles, it is a value list by design.
- Value lists with many steps (margin, crumb depth, inline width) stay in Settings only.

## Behaviour

- `viewNumbers` off: rows `Show absolute line numbers`, `Show relative line numbers`.
- `viewNumbers` relative: rows `Show absolute line numbers`, `Hide line numbers`.
- A toggle that is on reads with its off verb, so `Show menu bar` becomes `Hide menu bar`.
- Enter on a split row sets that value directly, it does not cycle.
- Help lists each command once with its neutral title, as today.

## Wording for the existing toggles

Left is the row when the toggle is off, right when it is on.
Rows already in `Show … / Hide …` form stay as they are.

| Command | Off | On |
| --- | --- | --- |
| viewColor | Enable color | Disable color |
| viewMouse | Capture mouse | Release mouse |
| viewEmphasis | Color text decoration | Gray text decoration |
| viewSyntax | Highlight code syntax | Plain code |
| viewFlow | Flow paragraphs | Unflow paragraphs |
| viewIndent | Indent paragraphs | Unindent paragraphs |
| viewArchive | Archive on copy | Keep on copy |
| viewSelect | Select to comment | Select to copy |

Open: `Flow` and `Unflow` are the weakest pair, a better verb is welcome.

## Wording for the existing cyclers

One row per value, verb first, the value in plain words.

| Command | Values | Rows |
| --- | --- | --- |
| viewNumbers | off, absolute, relative | Hide line numbers, Show absolute line numbers, Show relative line numbers |
| viewFences | ticks, fence, hide | Show code fences as ticks, Show code fences as lines, Hide code fences |
| viewQuote | bar, >, hide | Show blockquotes with a bar, Show blockquotes with >, Hide blockquote marks |
| viewCaret | >, +, ● | Use > caret, Use + caret, Use ● caret |
| viewCheck | per style | Use [x] checkboxes, Use ☑ checkboxes, and so on from `CHECKS` |
| viewCopy | simple, detailed | Copy in simple format, Copy in detailed format |

## Settings rows that could join the palette later

Enum settings with few values read well as actions; listed for a second step, not now.

- front: Enable frontmatter editing, Disable frontmatter editing.
- agent, own: Show agent comments on the left, Show your comments on the right, and so on.
- time: Show relative times, Show absolute times, Hide times.
- line: Highlight the cursor line, Stop highlighting the cursor line.
- corners: Use round popup corners, Use pointy popup corners.
- status: Show the badge at the top, Show the badge at the bottom.
- purge: Remove archived comments after 7 days, and so on.

## Design

- Move `CYCLES` from `src/ui/tui.ts` to `src/core/commands.ts` next to `COMMANDS`, values unchanged.
- Add one table `LABELS` in `commands.ts`: per cycler id, the row title for each value, in value order.
- Add an optional `off` title on toggle commands; when absent, `Show …` derives `Hide …` as today.
- Extend the pure `verbs(commands, on, pick)` in `commands.ts`:
  toggles pick `off` or `title` by state; cyclers expand to one row per value except the current one.
- A split row id is `<cycler>=<index>`, category the cycler's category, keys empty.
- In the shell, `run()` recognises `<cycler>=<index>`, sets `pick` to that index, persists, redraws.
- `step()` stays for the menu bar and the Settings popup.
- The menu bar and help keep using `title`; only the palette uses `verbs()`.
- Single-word identifiers for anything new: `off`, `LABELS`, `pick`, `at`.

## Tests

- `test/commands.test.ts`: `verbs()` on a toggle off and on, a cycler at each value, the split row ids.
- `test/menu.test.ts`: the menu bar still shows neutral titles and `[value]` hints.
- A PTY test is not needed; the palette path is already covered.

## Touches

- `src/core/commands.ts`, `src/ui/tui.ts`, `src/ui/palette.ts` if the hint column needs care.
- `test/commands.test.ts`, `test/menu.test.ts`.
