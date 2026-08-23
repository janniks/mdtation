# mdtation copy

Every string for the landing page and the README, in page order.
Paste as-is.
Keys are in backticks, kickers are lowercase, headings are sentence case.
No middle dots anywhere.

---

## 1. Header

- Product name: `mdtation`
- Nav tagline: `feedback your agent can use`
- Nav links: `the problem`, `the loop`, `features`
- Buttons:
  - `GitHub`
  - `npm`
  - `Install` (copies `npm i -g mdtation`)

---

## 2. Hero

Kicker: `terminal markdown viewer for agent workflows`

### H1 (final pick)

**Feedback your agent can actually use**

Rejected candidates, for the founder:

1. The smoothest feedback loop for your agents
2. Comment on the plan, not the chat
3. Review what your agent wrote, where it wrote it
4. Stop answering your agent by letter and number

Why the pick: it names the outcome (usable feedback), implies the contrast (what you give it today is not usable), and fits in six words.
Candidate 4 is the sharpest hook and could work as a section title in "the problem".

### Subhead

Your agent writes the spec. You open it full screen, comment on the exact line, press one key. The agent gets a block it understands. Nothing scrolls away.

### Install line

```
npm i -g mdtation && mdtation plan.md
```

### Proof bullets (under the install line)

- Comments stick to lines and selections, and persist between sessions
- `C` copies a plain-text block any agent reads verbatim
- One markdown file in, one markdown file out, no plugin, no MCP

---

## 3. The problem

Kicker: `the problem`

Title: **Agents ask for feedback in the worst possible places**

Intro: Every coding agent needs your review. Each one collects it through a channel built for answers, not critique.

### Card 1

Title: **Option pickers**

Body: A, B or C, pick one. Your real answer is "B, but only if the second half of C", and there is no box for that.

### Card 2

Title: **Itemized lists in a chat thread**

Body: Twelve numbered bullets, answer by letter and number. By the time you type "3b, no, 5 is wrong" the list has scrolled off screen and you are answering from memory.

### Card 3

Title: **Plans as scrollback**

Body: The agent wrote a 300-line spec and printed it into the terminal. You read it by scrolling a buffer, and what you think about line 140 goes nowhere.

---

## 4. The loop

Kicker: `the loop`

Title: **Review the plan, not the diff**

Intro: hunk does this for code diffs. mdtation does it for the prose around them: specs, plans, drafts, reviews.

### Step 1

Title: **The agent writes a file**

Body: Ask for the plan as markdown, not as a message. `plans/auth.md` is a thing you can open again tomorrow. A chat bubble is not.

Key: `mdtation plans/auth.md`

### Step 2

Title: **You read and comment**

Body: Full screen, mouse friendly, calm. Press `c` on a line or drag-select a sentence and write what is wrong with it. The note is pinned where it belongs and persists.

Key: `c`

### Step 3

Title: **One key copies a block**

Body: Press `C`. The comment becomes a reference block: line number, section path, the quoted passage, your note. Paste it, or let the agent pull all of them with `--list`.

Key: `C`

### Step 4

Title: **The agent revises, you loop**

Body: Open the new version. Your comments are still anchored. Archive the ones that landed, jump through the rest with `]`, and go again.

Key: `]`

### The copied block (detailed format, verbatim)

Shown exactly as `copyFormat(comment, doc, "detailed")` writes it to the clipboard.
Realistic excerpt from a spec on session handling: the reviewer drag-selected two lines under `## Auth` > `### Session refresh`.

```
Line 41  Auth / Session refresh
    Refresh tokens are rotated on every request and the old token is
    revoked immediately.
> Immediate revoke breaks parallel requests from the same tab. Keep a 30 s grace window, then revoke.
```

Without a selection, the detailed format quotes the line itself (clipped at 80 characters):

```
Line 58  Auth / Logout
    Logout clears the cookie and does nothing server-side.
> Also revoke the refresh token, otherwise the cookie is the only thing keeping the session out.
```

Caption under the block: `Line, section path, quote, note. Plain text, no schema to learn.`

---

## 5. Built for agents

Kicker: `built for agents`

Title: **The block is the protocol**

Paragraph 1: There is nothing to install on the agent side. The copied block is markdown an LLM already reads well: a line number it can jump to, the heading path it can search for, the passage it should change, and your note as a blockquote. Paste it into any chat.

Paragraph 2: For more than one comment, skip the clipboard. `mdtation file.md --list` prints every live comment as one markdown report. Tell the agent to run it, and the review arrives exactly as you wrote it, in order, with nothing lost to the scrollback.

### Sample prompt

Label: `paste this into your agent`

```
Read the comments I left on plans/auth.md by running `mdtation plans/auth.md --list`.
Address each one in order, then rewrite the file in place.
Keep the headings so my remaining comments stay anchored.
```

### Agents strip

Label: `works with`

Items: Claude Code, Codex CLI, Gemini CLI, OpenCode, Cursor CLI, anything that reads text

---

## 6. Features

Kicker: `features`

Title: **Everything a viewer should have had**

Intro: A real menu bar, a command palette, a settings popup, and a View menu that remembers what you picked. The CLI keeps growing.

Tabs: `Navigate`, `Comments`, `Text`, `Blocks`, `Settings and CLI`

### Navigate

| gif | caption |
|---|---|
| scroll | `j` and `k` move the caret, the page follows |
| wheel | Mouse wheel scrolls, the caret keeps up |
| click | Click any row to place the caret |
| page | `^d` and `^u` page, `g` and `G` jump |
| menu | A real menu bar, click or arrow across |
| palette | `/` filters every command by title |
| help | `?` lists every key |
| narrow | Still readable at phone width |

### Comments

| gif | caption |
|---|---|
| comment | `c` opens a comment on the caret line |
| select | Drag-select a sentence, it lands in the quote |
| edit | `e` edits the comment under the caret |
| jump | `[` and `]` hop between comments |
| all | `a` lists every comment with its line |
| copy | `C` copies the block, the badge fades |
| format | Detailed format adds section path and quote |
| archive | Archive on copy clears markers, keeps the note |
| unsaved | `^c` guards unsaved edits, `^s` saves |

### Text

| gif | caption |
|---|---|
| color | Color off, layout stays |
| decoration | Bold, italic, strike, underline as real attributes |
| emphasis | Colored emphasis or plain |
| marks | Hide `**` and `_`, keep the styling |
| links | Show or hide link targets |
| hashes | Heading marks on or off |
| syntax | Syntax highlighting inside fences |
| fences | Fences as ticks, a rule, or hidden |

### Blocks

| gif | caption |
|---|---|
| pipes | Table pipes or thin separators |
| align | Click a separator cell to cycle alignment |
| quote | Blockquote as a bar, a `>`, or bare |
| check | Four checkbox styles |
| caret | Pick the caret glyph |
| frontmatter | Frontmatter hidden or shown |
| flow | Flow one sentence per line into paragraphs |
| indent | Indent paragraphs |
| badge | Status badge at the bottom or the top |

### Settings and CLI

| gif | caption |
|---|---|
| settings | Settings popup, arrows change a value |
| margin | Scroll margin, like vim's scrolloff |
| crumb | Section crumb follows the caret, depth is yours |
| hidebar | `m` hides the menu bar |
| wide | Wide tables stay aligned, cut with an ellipsis |
| list | `--list` prints comments as markdown |
| print | `--no-tui` renders to stdout |
| overview | Everything at once |

---

## 7. Footer

Line: `mdtation  MIT  2026 janniks`

Links: `GitHub`, `npm`, `Issues`

---

## 8. README.md

```markdown
# 🧘 mdtation

**Feedback your agent can actually use.**

A full-screen terminal markdown viewer with comments that stick to lines, persist between sessions, and copy as a block any agent understands.

## The problem

- Agents ask for review through option pickers: A, B or C, and your real answer fits none of them.
- Long itemized lists in a chat thread scroll away while you type, so you answer from memory.
- A 300-line plan printed into the terminal is read by scrolling a buffer, and your thoughts about line 140 go nowhere.

## The loop

- The agent writes the plan as a markdown file, not a message.
- You open it in mdtation, read it full screen, and press `c` on the line (or drag-select the sentence) you disagree with.
- `C` copies a block with the line number, section path, quote, and your note. Paste it, or let the agent run `--list`.
- The agent revises the file. You open it again, your comments are still anchored, and you go round once more.

Review the plan, not the diff. hunk does this for code diffs, mdtation does it for the prose around them.

## Install

```sh
npm i -g mdtation
mdtation README.md
```

The full-screen TUI runs under Bun. Under Node, mdtation renders to stdout instead.

## Keys

| key | action |
|---|---|
| `j` `k` | move the caret (wheel and click work too) |
| `c` | new comment on the caret line or selection |
| `e` | edit the comment under the caret |
| `C` | copy the comment as a block |
| `[` `]` | previous, next comment |
| `a` | show all comments |
| `/` | command palette |
| `m` | hide or show the menu bar |
| `?` | help |
| `q` | quit (`^s` saves checkbox and frontmatter edits first) |

View options (color, marks, fences, tables, checkboxes, flow, scroll margin) live in the menu bar and the settings popup, and are remembered.

## CLI

```sh
mdtation plan.md --list          # print live comments as markdown
mdtation plan.md --archived      # include archived ones, each with an id
mdtation plan.md --restore a1,b2 # un-archive by id
mdtation plan.md --clear         # forget every comment for this file
mdtation plan.md --no-tui        # render to stdout and exit
mdtation plan.md --where         # print the data dir
```

Comments live in `comments.json` under `$MDTATION_HOME`, `$XDG_DATA_HOME/mdtation`, or `~/.mdtation`, keyed by absolute path.

## The copied block

```
Line 41  Auth / Session refresh
    Refresh tokens are rotated on every request and the old token is
    revoked immediately.
> Immediate revoke breaks parallel requests from the same tab. Keep a 30 s grace window, then revoke.
```

Tell your agent: "Read the comments I left on plans/auth.md with `mdtation plans/auth.md --list`, address each, then rewrite the file."

## Works with

Claude Code, Codex CLI, Gemini CLI, OpenCode, Cursor CLI, and anything else that reads text. No plugin, no MCP.

## Why not a chat thread

A chat thread is a good place to ask and a bad place to review. The thing you are reacting to scrolls away while you answer, the answer is not tied to the line it is about, and tomorrow it is gone. A comment on a file stays where you put it, survives the agent's rewrite, and reads the same to a person and a model.

## License

MIT
```

---

## 9. Feature descriptions

Format: `- name — Title — description`. Titles 2 to 5 words, descriptions 45 words or fewer.

### Navigate

- scroll — Caret-driven scrolling — `j` and `k` move a caret line by line, and the page only moves once the caret hits the scroll margin. It reads like a pager, but you always know which line you are on, which is what comments need.
- wheel — Mouse wheel — Scroll with the wheel like any desktop app. The caret follows so `c` always lands near what you are looking at. Turn mouse capture off with `M` when you want the terminal's own selection back.
- click — Click to place the caret — Click any row and the caret goes there. Handy when you spot a problem mid-page and want to comment on it without counting lines.
- page — Page and jump keys — `^d` and `^u` move a page at a time, `g` and `G` jump to the top and bottom. Page Up and Page Down work too.
- menu — A real menu bar — File, View, Navigate, Edit, Comments, Help. Click a menu or arrow across it. Every View toggle lives here, so nothing needs a memorised chord.
- palette — Command palette — `/` opens a palette that filters every command by title as you type. Toggles that are already on read as Hide instead of Show, so you can see the current state.
- help — Help dialog — `?` lists every key and what it does. Close it and go on. The same catalog powers the menu bar and the palette, so the three never disagree.
- narrow — Narrow terminals — Prose reflows and the menu bar collapses at phone width, so a tmux split or an SSH session on a small screen is still readable.

### Comments

- comment — Comment on a line — Press `c` on the caret line and type. The note is stored with the line number, or with the heading path when the line is a heading. It is there the next time you open the file.
- select — Comment on a selection — Drag-select a sentence with the mouse and press `c`. The selected text becomes the quote in the copied block, so the agent sees exactly which words you mean. Toggle under Comments, Select to comment.
- edit — Edit a comment — `e` reopens the comment under the caret for changes. Save with `^s` or discard. Multi-line notes are fine and each line becomes its own `>` in the copy.
- jump — Jump between comments — `[` and `]` move the caret to the previous and next comment. Useful on a second pass, or to walk through what is still open after the agent's rewrite.
- all — Show all comments — `a` opens an overlay with every live comment and its line, the same report `--list` prints. Comments, Show in editor opens that report in `$EDITOR` for bulk editing.
- copy — Copy the block — `C` copies the comment under the caret to the clipboard via OSC 52, so it works over SSH. The badge fades once it is sent. The last copy is mirrored to `last-copy.md` in the data dir.
- format — Detailed copy format — Comments, Copy format switches between simple and detailed. Simple is line, quote, note. Detailed adds the section path and, without a selection, a preview of the line itself.
- archive — Archive on copy — With Comments, Archive on copy enabled, a copied comment leaves the gutter but stays on disk. `--archived` lists them with ids, `--restore` brings one back. Archived notes are removed after a retention period you set.
- unsaved — Unsaved guard — `^c` or `q` on a document with unsaved edits is refused once. Press again within two seconds to leave anyway, or `^s` to write checkbox and frontmatter changes to the file.

### Text

- color — Color toggle — View, Color turns syntax and emphasis color off while leaving layout, caret and comment markers intact. For terminals with odd palettes, or for a quieter read.
- decoration — Real text attributes — Bold, italic, strikethrough and underline render as terminal attributes instead of visible marks. View, Show text decoration toggles it.
- emphasis — Colored emphasis — Emphasised text can carry a color as well as an attribute. View, Color text decoration picks which. Useful when your terminal font has no italic.
- marks — Hide inline marks — View, Show inline marks hides the `**`, `_` and backticks but keeps the styling they produce. Turn it on when you need to see the raw source.
- links — Link targets — View, Show links shows or hides the URL after each link. Off for reading, on when you need to check where a reference points.
- hashes — Heading marks — View, Show heading marks keeps or drops the `#` signs. Level is still visible through size and color either way.
- syntax — Syntax highlighting — Fenced code is highlighted by language tag. View, Syntax highlight toggles it when you want plain text or a faster render.
- fences — Fence styles — View, Code fences cycles the fence lines between backticks, a thin rule, and hidden. Hidden fences make code read as part of the document.

### Blocks

- pipes — Table separators — View, Show table pipes draws tables with their pipes or with thin separators. Wide and CJK cells stay aligned in both.
- align — Click to align — Click a cell in a table's separator row to cycle its column alignment between left, center and right. The markdown is updated and saved with `^s`.
- quote — Blockquote styles — View, Blockquote renders quotes with a bar, with the `>` sign, or bare. Pick what matches your editor.
- check — Checkbox styles — View, Checkbox cycles four glyph sets for task lists. Click a box or use Edit to flip it. Saved to the file with `^s`.
- caret — Caret glyph — View, Line caret picks the glyph that marks the current line, or hides it. The caret is where `c` comments and `C` copies.
- frontmatter — Frontmatter — View, Show frontmatter hides or shows the YAML block at the top. When shown, fields can be edited in place and saved with `^s`.
- flow — Flow paragraphs — View, Flow paragraphs joins one-sentence-per-line source into wrapped paragraphs for reading. Comments still land on the source line, so references stay exact.
- indent — Indent paragraphs — View, Indent paragraphs adds a first-line indent, which helps long prose read as prose instead of a list of lines.
- badge — Status badge — View, Status badge puts the file name, position and copy status at the bottom or the top of the screen, or hides it.

### Settings and CLI

- settings — Settings popup — File, Settings opens a popup with scroll margin, crumb depth, frontmatter default and archive retention. Arrow keys change a value. Everything is remembered in `settings.json`.
- margin — Scroll margin — The number of rows kept between the caret and the screen edge, like vim's scrolloff. Set it in Settings. Higher keeps more context around the line you are reading.
- crumb — Section crumb — A breadcrumb of the headings above the caret sits in the bar and goes into the copied block. Crumb depth in Settings limits how many levels show.
- hidebar — Hide the menu bar — `m` hides the menu bar for a clean full-screen read. Everything stays reachable through `/` and `?`.
- wide — Wide tables — Tables wider than the terminal are laid out across the whole document and cut with an ellipsis instead of wrapping, so columns stay aligned.
- list — Print comments — `mdtation file.md --list` prints every live comment as markdown and exits. This is the line to put in an agent's prompt.
- print — Render to stdout — `mdtation file.md --no-tui` writes the rendered document to stdout and exits. Use it in pipes, or under Node where the fullscreen TUI is not available.
- overview — Everything at once — A full pass: open, scroll, comment, copy, archive, and the `--list` report. Thirty seconds of the whole loop.

---

## 10. FAQ

Kicker: `faq`

Title: **Questions**

**Does it need Bun?**
The fullscreen TUI runs under Bun. Under Node, mdtation prints a warning and renders the document to stdout instead, and `--list`, `--archived`, `--restore`, `--clear` and `--where` all work. Install with npm either way.

**Where are comments stored?**
In `comments.json` under `$MDTATION_HOME`, else `$XDG_DATA_HOME/mdtation`, else `~/.mdtation`. Comments are keyed by the file's absolute path, so moving or renaming a file starts it fresh. `mdtation file.md --where` prints the directory.

**Does it work with agents other than Claude Code?**
Yes. The copied block and the `--list` report are plain markdown. Codex CLI, Gemini CLI, OpenCode, Cursor CLI, or a chat window in a browser all read it the same way. There is no plugin, daemon or MCP server involved.

**What happens to my comments when the agent rewrites the file?**
A comment on a heading is stored by heading path and finds that heading again wherever it moved. A comment on any other line is stored by line number and stays on that number. Ask the agent to keep headings, and reuse `]` to walk the rest.

**Can I pipe into it?**
Not yet. mdtation takes one file path. Write the agent's output to a file first, then open it. Stdin support is on the list.

**How is this different from hunk?**
hunk reviews code diffs with a live session the agent talks to. mdtation reviews prose, specs, plans and notes, and hands results back as a copied block or a `--list` report. They sit next to each other. Review the plan in mdtation, the diff in hunk.

**Can I script it?**
`--list` prints live comments as markdown, `--archived` adds archived ones with ids, `--restore a1,b2` un-archives by id, `--clear` forgets a file's comments, `--no-tui` renders to stdout. Pipe `--list` into `pbcopy` or straight into an agent's prompt.

**Does it modify my markdown?**
Only when you ask. Flipping a checkbox, editing a frontmatter field or cycling a table alignment marks the document dirty, and `^s` writes it back. Comments never touch the file. They live in the data dir.

---

## 11. The loop, per-step media

| step | gif | caption (6 words) |
|---|---|---|
| 1. The agent writes a file | `print` | Markdown on disk, opened full screen |
| 2. You read and comment | `select` | Select the sentence, press `c`, type |
| 3. One key copies a block | `copy` | `C` sends line, path, quote, note |
| 4. The agent revises, you loop | `jump` | `]` walks what is still open |

Alternates: step 1 can use the hero terminal frame if `print` reads as too static; step 4 can use `archive` with the caption "Archive what landed, keep the rest".

---

## 12. Inspiration and friends

Kicker: `inspiration and friends`

Title: **Built on the shoulders of a few good tools**

Intro: mdtation is a small idea borrowed from a few bigger ones, and it is better for saying so.

### hunk

The diff viewer with a comment flow built for agents. hunk showed that reviewing an agent's work should happen in a real viewer, not a chat thread. mdtation is hunk for prose: same loop, pointed at the plan instead of the patch.

Link: https://github.com/modem-dev/hunk

### herdr

The terminal multiplexer mdtation was built for and tested in. Its desktop-style menus, mouse support and calm layout set the bar for what a TUI can feel like, and mdtation follows that style closely.

Link: https://github.com/herdrdev/herdr (verify link, found in the herdr reference docs in `_learn`)

### agentation

The web annotation overlay for agent feedback. agentation's idea of clicking an element and copying a structured reference for the agent is where mdtation's copy block comes from.

Link: https://github.com/benjitaylor/agentation (verify link), npm `agentation`

### OpenTUI

The renderer underneath. OpenTUI does the hard part: a fullscreen terminal surface with mouse events, selection and attributes, so mdtation can spend its lines on the reading and the comments.

Link: https://github.com/sst/opentui (the package readme also points at github.com/anomalyco/opentui, verify which is canonical)
