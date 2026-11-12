# New comment notice

## Why

A comment from the agent can land outside the window.
The glow shows only what is on screen, so the reader does not know it is there.

## What

- A one-row toast over the right end of the body.
  - Top row: `↑ 2 new comments above`.
  - Bottom row: `↓ 1 new comment below`.
- It counts comments that arrived from elsewhere (CLI, another session) and were not on screen yet.
  Own comments do not count.
- A comment counts as seen when its line is inside the window.
  The count goes down one by one as the reader scrolls.
- A click on a toast jumps to the nearest unseen comment on that side.
- Setting `Comments > New comment notice` (`toast`):
  - `stay` (default): shown until each comment was on screen.
  - `fade`: gone after 4 seconds.
  - `off`: never shown.

## How

- `src/core/notice.ts`: `away(lines, top, end)` and `label(n, side)`. Pure.
- `src/ui/toast.ts`: an absolute one-row box, below the overlays (`zIndex` 50).
- `TuiShell.unseen`: ids added in `reloadStore` from the `new` changes; `notice` runs in every `draw`.
- An archived or removed comment leaves the count.

## Not built

- A count for edited comments.
- A key for "next unseen"; `nextComment` and `nextAgent` already walk comments.
- The unseen set is not saved; it starts empty in each session.

## Checked

- Headless run: five agent comments around the window give `2 above`, `2 below`; scrolling down takes the lower count to 1, then 0; `fade` clears after 4 s.
- The renderer's hit test at the toast returns the toast, not the body. The click itself was not driven: the mock mouse sends no events in this harness.
