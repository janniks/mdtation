# Jump audit: what moves when the doc or the comments change

- Audit only, no design.
- Measured with a headless shell: 174 scenarios, 80x30 terminal, body pane 27 rows.
- Files (same folder):
  - `harness.ts`: all scenarios, reloads driven by hand. Run: `/home/jannik/.bun/bin/bun harness.ts [filter]`.
  - `results.md` / `results.json`: full matrix, every scenario at margin 0, 8, 10.
  - `live.ts`: real fs watchers, nothing driven by hand.
- "Row" = cursor row inside the body pane, 0 = first body row.
- "Start" unless noted: cursor on line 65, row 12, window top on line 53, 120-line doc.
- Marks: **M** = measured, **R** = only read in the code.
- Frame cross-check (does the cursor text really sit on that screen row): ok in 167 of 174.
  - The 7 misses are the harness's text search hitting the crumb or a duplicate line, not a wrong row.

## a) Scenarios

Rows moved shown as margin 0 / 8 / 10 where they differ.
Margin 8 is the shipped default (`src/core/settings.ts:54`).

### Doc reload (all M)

| scenario | verdict | rows moved (m 0 / 8 / 10) | root cause |
|---|---|---|---|
| file touched, same content | stable | 0 | early return, `src/ui/tui.ts:555` |
| one char changed far below, off screen | JUMP | -12 / -4 / -2 | A, `tui.ts:569` |
| 3 lines inserted above the window | JUMP | -12 / -4 / -2 | A |
| 3 lines inserted above cursor, in window | JUMP | -12 / -4 / -2 | A |
| 3 lines deleted above (window or not) | JUMP | -12 / -4 / -2 | A |
| 3 lines inserted BELOW the cursor | JUMP | -12 / -4 / -2 | A |
| cursor line reworded | JUMP | -12 / -4 / -2, right line | A |
| cursor line reworded + 3 inserted above | JUMP | same, and lands on "Line 062" (3 lines off) | A + B, `tui.ts:568` |
| cursor line deleted | JUMP | same, lands on next line (066) | A + B |
| section above rewritten 18 -> 7 lines | JUMP | -12 / -4 / -2, right line | A |
| all below cursor removed, cursor near top | stable | 0 (21 blank rows appear) | - |
| all below cursor removed, cursor mid, scrolled | JUMP | +14 (all margins) | D, `src/core/caret.ts:107` |
| whole-file paraphrase, same line count | JUMP | -12 / -4 / -2, same number | A + B |
| whole-file paraphrase, 120 -> 90 lines | JUMP | -10 / -4 / -2, same number | A + B |
| file cut to 10 lines | JUMP | -3, cursor on last line (9) | B clamp, `src/core/viewport.ts:77` |
| cursor already at the top margin row | stable | 0 | A lands where it was |
| cursor at the bottom margin row | JUMP | -26 / -10 / -6 | A, worst case |
| cursor on last line, 5 lines appended | JUMP | -5 | A + D |
| cursor on last line, 1 char changed at top | stable | 0 | A and D cancel |
| cursor near top (row 5), 3 inserted above | JUMP | +3 | D (window cannot go above line 0) |
| cursor on a blank line, 3 inserted above | JUMP | -4, now on "Line 076" | B, `src/core/comments.ts:14` |
| cursor on a duplicated text, 6 inserted above | JUMP | -4, lands on L61, right one is L71 | B, `src/core/comment.ts:147` |
| cursor on heading, heading renamed | JUMP | -4, right line by luck | A + B, `comment.ts:133` |
| cursor on heading, renamed + 3 inserted above | JUMP | -4, lands on "Line 057" | A + B |
| cursor on heading, parent heading renamed | JUMP | -4, right line by luck (slug path broke) | A + B |
| caret on 2nd row of a wrapped line | JUMP | -4 (lands on row 11, not 8) | A, margin counted in lines |
| window starts mid-block (`skip`=1), m=0 | JUMP | -13, `skip` 1 -> 0 | A, `viewport.ts:126` |
| caret on a note row | JUMP | -4, caret stays on its note | A |
| reload while comment box is open | deferred | 0 while open, then -4 on close | A via `tui.ts:296` |
| two reloads in a row | 1st JUMP, 2nd stable | -4 then 0 | A |
| half-written file seen (empty, then full) | JUMP | cursor on line 0 for good | H |
| half-written file (30 lines, then full) | JUMP | cursor on line 29 for good | H |
| checkbox toggled in the TUI | stable | 0 | uses `edit()`, `tui.ts:456`, no re-anchor |

### Comments (all M)

| scenario | verdict | rows moved (m 0 / 8 / 10) | root cause |
|---|---|---|---|
| add on the cursor line (TUI or CLI) | stable | 0 | - |
| add below the cursor | stable | 0 | - |
| add above the window | stable | 0 | window top is a line index |
| add above cursor, inside window | JUMP | +1 | C, `caret.ts:94` via `tui.ts:731` |
| add on the window's top line | JUMP | +1 | C |
| archive on the cursor line (TUI `d` or CLI) | stable | 0 | - |
| archive above cursor, inside window | JUMP | -1 | C |
| archive above the window | stable | 0 | - |
| CLI reply to a thread above cursor | JUMP | +1 | C |
| long wrapped comment above cursor (8 rows) | JUMP | +8 / +6 / +4 | C, capped by bottom margin |
| CLI edit makes a comment above 5 rows longer | JUMP | +5 | C |
| 10 comments at once, 5 above cursor | JUMP | +5 / +5 / +4 | C |
| those 10 archived at once | JUMP | -5 | C |
| toggle inline agent notes, 5 above cursor | JUMP | -5 | C, `tui.ts:1100` |
| cursor at bottom margin, add above | stable | 0 (text above scrolls up 1) | `caret.ts:104` |
| cursor at bottom margin, add on cursor line | stable | 0, but see surprises | - |
| cursor at top margin, add on line above | stable / JUMP +1 / +1 | C |
| cursor on last line, add or archive above | stable | 0 (window slides 8 lines) | D holds the bottom |
| cursor 5 above end, archive above (8 rows) | JUMP / stable / stable | -2 / 0 / 0 | D |
| caret on 1st note row, that note archived | stable row | caret now on a different comment | E, `tui.ts:729` |
| caret on last note row, all notes archived | JUMP | -2, caret back on the text row | E |
| window top inside a note block, thread archived | JUMP | -5, `skip` 3 -> 0 | C |
| comment on heading, heading renamed | JUMP | comment vanishes, -5 | I, `comment.ts:133` |
| commented line reworded + 3 inserted above | JUMP | comment now under a blank line | I, `comment.ts:157` |
| `]` to a comment 3 lines below, on screen | JUMP | -4 (user moved, window re-anchored) | A, `src/core/nav.ts:63` |

### Resize and toggles (all M, wrapped doc, window top mid-block)

| scenario | verdict | rows moved (m 0 / 8) | root cause |
|---|---|---|---|
| height 30 -> 40 | stable | 0 | - |
| height 30 -> 20 | stable / JUMP | 0 / -4 | F, margin, `caret.ts:104` |
| height 30 -> 12 | JUMP | -4 / -8 | F |
| height 30 -> 40 near the end | JUMP | +16 / +10 | D |
| width 80 -> 50 | JUMP | +2 | C (2 more wrap rows above) |
| width 80 -> 140 | JUMP | -2 | C |
| toggle menu bar or crumb | stable in pane | 0, but -1 on the screen | header row goes, `tui.ts:246` |
| toggle indent, heading marks, line numbers | stable | 0 | - |
| scroll margin setting changed | stable | 0 | - |
| code fences -> hide (2 fence rows above) | JUMP | -2 | C |
| frontmatter on, cursor mid | stable | 0 | - |
| frontmatter on, cursor near top | JUMP | +3 | D, `tui.ts:257` |
| flow on | JUMP | cursor line 65 -> 79 (a blank line), +11 / +6 | G, `caret.ts:77` |
| flow on, then off again | JUMP | cursor stays on 79 | G |

### Live watcher run (M, `live.ts`)

- Unrelated file written in the doc's directory: `reloadDoc` runs, no change.
- Plain overwrite with 3 lines inserted: one reload, row 12 -> 8.
- 3 CLI adds above the cursor, 400 ms apart: three reloads, row 12 -> 13 -> 14 -> 15.
- 3 CLI adds back to back: one reload, +3 in one step.
- Agent rewrites the file, then comments: two reloads, two moves (row 12 -> 13 -> 14 in that run).
- Truncate, 300 ms pause, then content: two reloads, cursor ends on line 0.

## b) Root cause classes

- **A. Reload re-anchors the window on the cursor.**
  - `reloadDoc` ends in `jumpToLine` (`tui.ts:569`).
  - `jumpToLine` sets `offset = line`, `skip = 0` (`viewport.ts:120-127`), then pulls back by the margin.
  - Result: after any real content change the cursor sits `margin` lines below the top.
  - Jump size = old row minus that. It does not depend on what changed or where.
  - The margin is counted in lines here, in rows in `fit`. So the landing row is 8, 10, 11 or 13 depending on wraps and notes above.
  - Same call in `]` / `[` / `{` / `}` (`nav.ts:63`, `nav.ts:96`) and go-to-line (`tui.ts:274`).
- **B. The cursor's identity is exact trimmed text, else the old line number.**
  - `anchorFor` (`comments.ts:9-16`), `resolveAnchor` + `nearest` (`comment.ts:131-158`), fallback `?? this.view.cursor` (`tui.ts:568`).
  - Holds for: pure inserts and deletes around an unchanged, unique cursor line.
  - Fails for: a reworded line with a shift above, a deleted line, blank lines, duplicate texts, renamed headings, a shorter file.
  - `nearest` measures distance from the OLD index, so a shift bigger than half the gap between duplicates picks the wrong one.
- **C. Every other redraw pins the window's top line, not the cursor.**
  - `draw` calls `fit` with the old `offset` + `skip` (`tui.ts:731`, `caret.ts:94`).
  - Rows added or removed between the top line and the cursor move the cursor by exactly that count.
  - Sources: comments, replies, comment edits, width, fence and inline toggles.
  - Rows above the top line cost nothing, since `offset` is a line index.
- **D. Edge rules.**
  - No blank rows below the last line while the doc can fill the pane (`caret.ts:107-110`).
  - The window cannot start above the first line.
  - Both slide the content when the doc, the pane or the notes change size near an end.
- **E. The caret inside a block is a bare row index (`seg`).**
  - It is clamped, never re-identified (`tui.ts:729-730`).
  - Notes removed above it in the same block: it now points at another comment.
- **F. Margin on shrink.**
  - A shorter pane forces the cursor up to the new bottom margin.
- **G. Hidden lines.**
  - A line that renders 0 rows sends the cursor to the next visible line below (`caret.ts:77-80`).
  - With flow on that is the end of the paragraph, 14 lines away here.
- **H. Half-written files.**
  - The watcher waits 150 ms (`src/core/watch.ts:6`), then reads whatever is there.
  - A short or empty read clamps the cursor, and the next reload cannot bring it back.
  - Measured with a slow writer. How often real agents write this way: not measured.
- **I. Comment anchors move the comments.**
  - Same resolver as B, so comments vanish or land on the wrong line, and the rows they take shift with them.

## c) Surprising

- A one-character change anywhere, even off screen, moves the cursor. Nothing above it has to change. (M)
- Lines inserted BELOW the cursor jump just as far as lines inserted above. (M)
- A bigger scroll margin hides the bug: -12 rows at margin 0, -4 at 8, -2 at 10. (M)
- A cursor already on the top margin row never jumps. So the second reload in a row looks stable. (M)
- The cursor's line is found correctly in the common cases. The jump there is the window, not the line. (M)
- The TUI's own checkbox edit replaces the doc with no jump, because it skips `jumpToLine`. (M)
- A reload that arrives while the comment box is open lands the moment the box closes. The user submits a comment and the page jumps. (M)
- Margin 0, cursor on the bottom row: a new comment on the cursor line is fully off screen (8 note rows, 0 visible). (M)
- Turning flow on moves the cursor out of the paragraph it was in, and turning it off does not bring it back. (M)
- Toggling the menu bar or crumb keeps the pane row but shifts all text one screen row. (M)
- CLI adds 400 ms apart give one small move each. Back to back they merge into one. (M)
- An agent that rewrites and then comments causes two separate moves. (M)

### Checks on `.github/specs/anchors-DRAFT.md`

- "`reloadDoc` calls `jumpToLine`, which snaps the window": true. Now at `tui.ts:569`, not 543. (M)
- "Renamed heading: the comment vanishes with no signal": true. (M)
- "Edited line: the comment stays on `n`, maybe a different line": true, it landed under a blank line. (M)
- "A TUI reply anchors on the cursor, not its parent": true, now `tui.ts:792`. Split measured: parent on line 62, reply on line 65 after one rewrite. (M)
- "`sameAnchor` compares line anchors by `n` only": true (`comment.ts:167`). But its only caller, `byAnchor`, is used by tests alone, so nothing on screen depends on it. (R)
- The draft does not mention classes C to H. Fixing the reload alone leaves every comment jump in place.

### Not measured

- Mouse wheel and click paths.
- Relative time labels ("59m ago" -> "1h ago") changing a note's width. (R: `tui.ts:659`)
- Real agents' write patterns (atomic or not).
- Terminals narrower than 50 columns.
