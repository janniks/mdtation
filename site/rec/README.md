# Feature recordings

`python3 site/rec/record.py site/rec/tapes/<name>.json` → `site/public/gifs/<name>.gif`.
Tape format and key/mouse tokens: see the docstring in `record.py`.
Each recording runs the real TUI (`bun src/bin.ts`) in an isolated `MDTATION_HOME` under `site/rec/home/` (git-ignored).

Check a gif without a viewer:

```sh
python3 -c "from PIL import Image; im=Image.open('site/public/gifs/NAME.gif'); print(im.n_frames); im.seek(im.n_frames//2); im.convert('RGB').save('/tmp/mid.png'); im.seek(im.n_frames-1); im.convert('RGB').save('/tmp/last.png')"
```

Then Read `/tmp/mid.png` / `/tmp/last.png`.

## Driving the TUI

- Keys (from `src/core/commands.ts`): `j`/`k` cursor, `ctrl+d`/`ctrl+u` page, `g`/`G` top/bottom, `c` new comment, `e` edit comment on the cursor line, `[`/`]` prev/next comment, `a` show all comments, `C` (shift+c) copy comments to clipboard, `m` toggle menu bar, `M` capture mouse, `/` command palette, `?` help, `q` quit (do not send `q` yourself; the driver does).
- View toggles have no keys: open the palette with `/`, type part of the title (e.g. `color`, `decoration`, `fences`, `pipes`, `flow`, `caret`, `blockquote`, `checkbox`, `frontmatter`, `heading marks`, `syntax`, `links`, `inline marks`, `indent`, `status badge`, `crumb`), then `<enter>`. Titles of toggles that are on read `Hide …`.
- Settings popup: `/` → `settings` → `<enter>`; rows are `Scroll > Margin lines`, `Section > Crumb depth`, `Beta > Frontmatter editing`, `Archive > Remove after`, plus the cyclers (`View > Code fences`, `View > Line caret`, `View > Checkbox`, `View > Blockquote`, `View > Status badge`, `Comments > Copy format`). `<left>`/`<right>` change the highlighted row's value, `<up>`/`<down>` move, `<esc>` closes.
- Menu bar: row 1 (`File  View  Comments  Help`), clickable via `<click X,1>`; body rows start at row 3 (row 2 is the section crumb). Gutter is 2 cells wide. `<click X,Y>` on a body row moves the cursor there; clicking a table cell's separator cycles alignment.
- Comment box: type text, `<enter>` saves, `<esc>` cancels. Drag-select (`<drag X1,Y1 X2,Y2>` across ≥2 rows) opens a comment with the selection quoted.
- `seed` pre-creates comments on given 0-based line numbers of the file so demos start with data.
- CLI demos: `"cmd": "bun src/bin.ts examples/tour.md --list; sleep 3"` (no TUI; the driver doesn't press `q`).
