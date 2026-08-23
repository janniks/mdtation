/** Feature data: [clip name or names, title, description]. Backticks render as <code>. */
export const GIFS = [
  {
    title: "Navigate",
    items: [
      [
        ["scroll", "click"],
        "Caret, wheel, click",
        "`j` and `k` move a caret, the wheel scrolls like a desktop app and the caret keeps up, and a click puts it on any row. You always know which line you are on.",
      ],
      [
        ["menu", "palette"],
        "Menu bar and command palette",
        "File, View, Navigate, Edit, Comments, Help in a real menu bar. `/` filters the same commands by title. Toggles that are already on read as Hide.",
      ],
      [
        "narrow",
        "Narrow terminals",
        "Prose reflows and the menu bar collapses at phone width, so a tmux split or a small SSH session is still readable.",
      ],
    ],
  },
  {
    title: "Comments",
    items: [
      [
        "comment",
        "Comment on a line",
        "`c` opens a comment on the caret line. The note is stored with the line number, or the heading path, and is there the next time you open the file.",
      ],
      [
        "select",
        "Comment on a selection",
        "Drag-select a sentence and press `c`. The selection becomes the quote in the copied block, so the agent sees exactly which words you mean.",
      ],
      [
        "edit",
        "Edit a comment",
        "`e` reopens the comment under the caret. Save with `^s` or discard. Each line of a multi-line note becomes its own `>` in the copy.",
      ],
      [
        "jump",
        "Jump between comments",
        "`[` and `]` hop to the previous and next comment. Useful on a second pass, or to walk through what is still open after the agent's rewrite.",
      ],
      [
        "all",
        "Show all comments",
        "`a` lists every live comment with its line, the same report `list` prints. Comments, Show in editor opens it in `$EDITOR` for bulk edits.",
      ],
      [
        "copy",
        "Copy the block",
        "`C` copies the comment under the caret via OSC 52, so it works over SSH. The badge fades once sent. The last copy is mirrored to `last-copy.md`.",
      ],
      [
        "format",
        "Detailed copy format",
        "Comments, Copy format switches between simple and detailed. Simple is line, quote, note. Detailed adds the section path and a preview of the line.",
      ],
      [
        "archive",
        "Archive on copy",
        "A copied comment leaves the gutter but stays on disk. `list --archived` lists them with ids, `restore` brings one back. Retention is yours to set.",
      ],
      [
        "unsaved",
        "Unsaved guard",
        "`^c` or `q` with unsaved edits is refused once. Press again within two seconds to leave anyway, or `^s` to write checkbox and frontmatter changes.",
      ],
    ],
  },
  {
    title: "Text",
    items: [
      [
        "color",
        "Color toggle",
        "View, Color turns syntax and emphasis color off while layout, caret and comment markers stay. For odd palettes, or a quieter read.",
      ],
      [
        "decoration",
        "Real text attributes",
        "Bold, italic, strikethrough and underline render as terminal attributes instead of visible marks. View, Show text decoration toggles it.",
      ],
      [
        "emphasis",
        "Colored emphasis",
        "Emphasised text can carry a color as well as an attribute. View, Color text decoration picks which. Useful when your font has no italic.",
      ],
      [
        "marks",
        "Hide inline marks",
        "View, Show inline marks hides the `**`, `_` and backticks but keeps the styling. Turn it on when you need the raw source.",
      ],
      [
        "links",
        "Link targets",
        "View, Show links shows or hides the URL after each link. Off for reading, on when you need to check where a reference points.",
      ],
      [
        "hashes",
        "Heading marks",
        "View, Show heading marks keeps or drops the `#` signs. Level is still visible through size and color either way.",
      ],
      [
        "syntax",
        "Syntax highlighting",
        "Fenced code is highlighted by language tag. View, Syntax highlight toggles it when you want plain text or a faster render.",
      ],
      [
        "fences",
        "Fence styles",
        "View, Code fences cycles fence lines between backticks, a thin rule, and hidden. Hidden fences make code read as part of the document.",
      ],
    ],
  },
  {
    title: "Blocks",
    items: [
      [
        "pipes",
        "Table separators",
        "View, Show table pipes draws tables with their pipes or with thin separators. Wide and CJK cells stay aligned in both.",
      ],
      [
        "align",
        "Click to align",
        "Click a cell in a table's separator row to cycle its column between left, center and right. The markdown is updated and saved with `^s`.",
      ],
      [
        "quote",
        "Blockquote styles",
        "View, Blockquote renders quotes with a bar, with the `>` sign, or bare. Pick what matches your editor.",
      ],
      [
        "check",
        "Checkbox styles",
        "View, Checkbox cycles four glyph sets for task lists. Click a box or use Edit to flip it, then save with `^s`.",
      ],
      [
        "caret",
        "Caret glyph",
        "View, Line caret picks the glyph that marks the current line, or hides it. The caret is where `c` comments and `C` copies.",
      ],
      [
        "frontmatter",
        "Frontmatter",
        "View, Show frontmatter hides or shows the YAML block at the top. When shown, fields can be edited in place and saved with `^s`.",
      ],
      [
        "flow",
        "Flow paragraphs",
        "View, Flow paragraphs joins one-sentence-per-line source into wrapped paragraphs. Comments still land on the source line, so references stay exact.",
      ],
      [
        "indent",
        "Indent paragraphs",
        "View, Indent paragraphs adds a first-line indent, so long prose reads as prose instead of a list of lines.",
      ],
      [
        "badge",
        "Status badge",
        "View, Status badge puts the file name, position and copy status at the bottom or the top of the screen, or hides it.",
      ],
    ],
  },
  {
    title: "Settings and CLI",
    items: [
      [
        "settings",
        "Settings popup",
        "File, Settings opens a popup with scroll margin, crumb depth, frontmatter default and archive retention. Arrows change a value, `settings.json` remembers it.",
      ],
      [
        "margin",
        "Scroll margin",
        "Rows kept between the caret and the screen edge, like vim's scrolloff. Set it in Settings. Higher keeps more context around the line you are reading.",
      ],
      [
        "crumb",
        "Section crumb",
        "A breadcrumb of the headings above the caret sits in the bar and goes into the copied block. Crumb depth in Settings limits how many levels show.",
      ],
      [
        "hidebar",
        "Hide the menu bar",
        "`m` hides the menu bar for a clean full-screen read. Everything stays reachable through `/` and `?`.",
      ],
      [
        "wide",
        "Wide tables",
        "Tables wider than the terminal are laid out across the whole document and cut with an ellipsis instead of wrapping, so columns stay aligned.",
      ],
      [
        "list",
        "Print comments",
        "`mdtation file.md list` prints every live comment as markdown and exits. This is the line to put in an agent's prompt.",
      ],
      [
        "print",
        "Render to stdout",
        "`mdtation file.md print` writes the rendered document to stdout and exits. Use it in pipes, or under Node where the TUI is not available.",
      ],
      [
        "overview",
        "Everything at once",
        "A full pass: open, scroll, comment, copy, archive, and the `list` report. Thirty seconds of the whole loop.",
      ],
    ],
  },
] as const;
