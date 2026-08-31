# Review findings to decide

From the 0.1.0 → HEAD code review. Trivial fixes are done; these need your call.
Comment inline; I read them next round.

## 1. `C` now archives everything

Copy-all honours `Archive on copy`, so one `C` can archive every comment in the file.
Before, copy was per-comment. Keep, or limit archive-on-copy to explicit per-comment copies?

## 2. Tall blocks pin their top row

A block taller than the window (long thread + wraps) pins its first row on-screen;
the caret can sit on a row below the fold until you step onto it.
Offsets are line-granular, so a real fix means sub-line scrolling. Live with it?

## 3. Layout rebuilt every keystroke

`lay()` re-derives inline rows + ids on each draw.
Fine at current sizes; caching invites staleness bugs. Proposal: leave it.

## 4. `seg = 0` reset is copy-pasted

Every nav case resets the wrap-segment caret by hand; a missed reset = stale caret.
Proposal: fold the reset into one place when nav code is next touched, not now.

## 5. `group: " "` sentinel

Quit sits in an unnamed menu section via a single-space group name.
Works, slightly magic. Name it (e.g. `group: ""` + explicit handling) or leave?

## 6. Sentence-case spill

Menu items were sentence-cased in Comments/File; a few other menus still have
Title Case leftovers. Sweep them all next pass?
