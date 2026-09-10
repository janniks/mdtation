---
"mdtation": patch
---

Reload adopts the comments file every time, so a CLI `clear`, `prune` or `mark` is no longer written back by the next TUI save. Save keeps the unsaved badge for an edit made during the write. Comment events are logged after the save lands. Atomic saves write through symlinks and keep the file mode. A torn events line no longer hides the whole log. `watch` works on a fresh install.
