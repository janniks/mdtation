# Outline: jump to a section

## Why

A long plan or spec has many sections.
Today the reader moves by line (`j`, `k`, pages, `:` line number) or by comment (`[`, `]`).
There is no way to say "take me to Open questions".

## What

- A popup lists every heading of the file, in file order, indented by level.
- The popup takes typing at once: no extra key to start a search.
- With nothing typed it shows the whole outline; up and down walk it.
- Typing filters it the way Sublime Text's Goto Symbol does (fuzzy, see "Match").
- Enter jumps. Escape goes back to where you were.
- It is the command palette with other rows, so it looks and behaves the same.

```
┌──────────────── Outline ────────────────┐
│ > que                                   │
│   Stable position                     1 │
│     Why                               6 │
│ ▌   Open questions                  128 │
│     Tests                           141 │
└─────────────────────────────────────────┘
```

## Research

Prior art (from memory, not checked against current docs):

- Sublime Text: Goto Symbol (`Ctrl+R` / `Cmd+R`). Typing is live at once, the match is fuzzy, matched letters are marked, and the page moves to the selected symbol as you go.
- VS Code and Zed: "Go to Symbol in Editor", `Cmd+Shift+O`; in the palette a `@` prefix switches to symbols.
- Vim help and man pages: `gO` opens an outline. `]]` and `[[` step by section.
- Helix: a symbol picker with live preview of the target behind the picker.
- Obsidian, Notion, GitHub: an outline panel at the side, click to jump.
- Terminal markdown readers mostly have a table-of-contents toggle on one letter.

What the good ones share:

- One key, no chord.
- The list keeps file order while the filter is empty, with the current section selected.
- The page moves behind the popup as the selection moves, and escape restores the place.

In this repo:

- `doc.headings` has level, text, slug path and `startLine`. Headings inside code fences are already left out.
  Only `#` headings are found; underlined (setext) headings are not.
- `Palette` (`src/ui/palette.ts`) takes any item list, as settings do with `set:` ids. It has no hook for "selection moved" yet.
- `filter` (`src/core/palette.ts`) ranks title prefix, then substring.
- The viewport has the two landing modes already: a strict jump (`setCursor`) and `hold`, which puts a line on a given screen row.
- `Cmd+K` cannot be bound: the terminal keeps `Cmd` for itself (iTerm and Terminal clear the screen with it).

## Match

Fuzzy, in the Sublime way:

- The typed letters must appear in the heading in order, not next to each other: `opq` finds `Open questions`.
- Case is ignored.
- Score, best first:
  - letters in a row beat letters apart
  - a letter at the start of a word beats one in the middle
  - a match near the start of the heading beats one near its end
  - a shorter heading wins a tie
- The matched letters are shown bold in the row.
- The parent path counts too, at a lower score, so `api auth` finds `Auth` under `API`.
- Empty query: the whole outline in file order, the current section selected.
- With a query: best match first (the Sublime way). File order breaks ties.
- Size: one pure function of about 25 lines, no dependency. The command palette can use it too, later.

## Key

Free single keys today: `o`, `s`, `t`, `f`, `n`, `p`, `h`, `l`, `w`, `u`, `i`, `tab`, `space`.

- Recommended: `o` for Outline.
  - Same letter as `gO` and `Cmd+Shift+O`.
  - One hand, home row neighbour of `/` (palette) and `:` (go to line) in use.
- Also possible:
  - `s` (section): reads well, but `s` is the usual "save" or "search" key in other tools.
  - `t` (table of contents): fine; no strong pull.
  - `tab`: easy to hit, but hard to guess.
- Second way in, at no key cost: in the `/` palette a query that starts with `#` lists headings instead of commands (the `@` idea from VS Code).
- A click on the crumb row opens the outline too: it already shows the section path.

## Landing

Setting `View > Section jump` (`land`):

- `top` (default): the heading goes to the top of the window, under the scroll margin. Same as every other jump today.
- `cursor`: the heading lands on the screen row the cursor is on now. The eye does not move; the text does.
  - Near the ends of the file the page fills as usual; a jump never leaves empty rows.
- Later, if asked: `center`.

## Decided in the first cut

- Key: `o`. A click on the crumb row opens the outline too.
- Preview: on. The page moves as the selection moves; escape restores cursor, top line and row.
- A row shows the line number at the right. No comment count yet.
- Not built: the `#` prefix in the `/` palette, step keys for next and previous heading, a "back" key, `center` landing.
- The popup is centred, so it can cover the heading it previews. Open: move it to the top of the window.

## Edge cases

- No headings: badge `NO HEADINGS`, no popup.
- Hidden frontmatter: its lines are not headings; nothing to do.
- Two headings with the same text: the indent and the line number tell them apart; the filter on the path does too.
- Hundreds of headings: the list scrolls, as the palette does.
- Flow, hidden fences and other row-less lines: a heading always has a row.
- The file is rewritten while the popup is open: the reload waits, as for every overlay; the list is from before. Enter then jumps by line number, which may be stale. Rebuild the rows from `doc.headings` on each key instead (the palette already calls `items()` each time).

## Shape

- `src/core/fuzzy.ts`, pure: `score(query, text)` gives a number and the matched positions, or null.
- `src/core/outline.ts`, pure: `rows(doc)` gives one pseudo-command per heading (`id: "at:<line>"`, indented title, line number as the hint) and `near(doc, line)` gives the index of the section the cursor is in.
- `Palette`: an optional `move(id)` callback, an initial selection index, an optional ranker, and bold for matched letters.
- `TuiShell`: command `outline` on `o`; `run("at:N")` lands by the `land` setting.
- `SETTINGS`: `land` with `top`, `cursor`.
- Size guess: 90 to 110 lines in `src`, 60 in tests.

## Tests

- `rows`: order, indent by level, fenced `#` left out, line hints.
- `near`: cursor before the first heading, inside a nested section, on a heading.
- `score`: order kept, letters in a row and word starts rank higher, no match gives null, positions are right.
- Filter on the path.
- Landing: `top` puts the heading under the margin; `cursor` keeps the screen row; at the end of the file no empty rows.
- Escape after a preview restores cursor, top line and row.
