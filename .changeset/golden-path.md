---
"mdtation": patch
---

The review loop, end to end: `watch` tails an append-only events log per document (`--until quit`, `--since last`, `--json` with an `event` key, `open`/`quit` lines); the viewer reloads on every save, comment, and reply, defers a markdown change while a box is open, and comments follow their line's text after edits above them. `File > Reload`, atomic save, README loop and skill text.
