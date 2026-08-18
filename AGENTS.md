## Simplicity & YAGNI

- [ ] **P01 · Keep solutions simple, and avoid clever, fancy, or over-engineered constructs.** ✅ approved
  `philosophy, simplicity-yagni · global · prefer · L1 · agents-md`

- [ ] **P01b · Lines of code and complexity are metrics we minimize together, and we never game them.** ➕ (new, your add)
  `philosophy, simplicity-yagni, verification · global · prefer · L1 · agents-md`
  _the "no cheating" clause matters, shrinking a number by hiding the work elsewhere does not count._

- [ ] **P02 · Prefer the small, simple solution until real scale demands otherwise, because we do not over-engineer and it saves time.**
  Quote-flavored alternatives, attributed, pick or mix:
  - a) *"Simplicity is prerequisite for reliability."* (Edsger Dijkstra)
  - b) *"Simple made easy."* (Rich Hickey, on separating simple from merely familiar)
  - c) *"Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."* (Antoine de Saint-Exupery)
  - d) *"The cheapest, fastest, and most reliable components are those that aren't there."* (Gordon Bell)
  - e) *"Controlling complexity is the essence of programming."* (Brian Kernighan)
  `simplicity-yagni · global · prefer · L1 · agents-md`

- [ ] **P02b · Add migration or upgrade code only where it genuinely fits, and skip it while users are few.** (split from P02)
  `simplicity-yagni, architecture · global · avoid · L2 · agents-md`

- [ ] **P03 · When a solution starts to feel complex, pause and look for a simpler, more functional shape before continuing.** (reworded, more alts)
  - a) *Treat rising complexity as a signal to search for a simpler design, not a reason to push harder.*
  - b) *If the approach feels convoluted, prefer rethinking it simply over forcing it through.*
  - c) *Complexity is a smell worth pausing on, so reach for the simpler functional path first.*
  - d) *"The competent programmer is fully aware of the limited size of his own skull, so he approaches the task in full humility."* (Edsger Dijkstra), which in practice means keep it small enough to hold in your head.
  `philosophy, simplicity-yagni · global · prefer · L1 · agents-md`

### Agent format

- All work in md files, in-repo. No GitHub issues unless explicitly asked.
- Short bullets, few full sentences. Readable at 1/4 desktop width or on mobile.
- Commit after each meaningful change.

### Workflow

- `/grill-me` → `/create-spec` → `/create-plan` → implement phase-by-phase → commit per phase.
- In-progress artifacts are suffixed: `specs/<feature>-DRAFT.md` while interviewing, `plans/<feature>-RUNNING.md` while implementing. Rename back (drop the suffix) on finalize / completion.
- Tick acceptance criteria and append a phase-log row inside the `-RUNNING.md` plan after each commit.
- Deferred items: front-matter `status: deferred` on whatever file fits. No dedicated dir.

#### Naming

Prefer single word names for variables and functions. Only use multiple words if necessary.

> THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Examples to avoid unless truly required: `inputPID`, `existingClient`, `connectTimeout`, `workerPath`.

```ts
// Good
const foo = 1;
function journal(dir: string) {}

// Bad
const fooBar = 1;
function prepareJournal(dir: string) {}
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const data = await fs.readFile(path.join(dir, "journal.json"), "utf-8");

// Bad
const journalPath = path.join(dir, "journal.json");
const data = await fs.readFile(journalPath, "utf-8");
```

### Papercuts & Unsure

- `PAPERCUTS.md` — read at session start; things that didn't go as planned, logged so the next session skips the detour.
  - Trigger: 2+ failed attempts before something worked, or a surprise. Test: would this have saved future-you a detour?
  - Append-only dated bullets, detail as indented sub-bullets. Add `- spec: <file>` only when the origin matters. Refactor/clean only with good reason.
- `UNSURE.md` — decisions made while unsure but had to pick one. Append liberally — too many beats too few. Never edit or delete existing entries; humans resolve them.
  - Group entries under `## <date> — <spec/note file>`. Each entry is a checkbox with choice, alternative, and why as sub-bullets.
  - Humans review: write a `verdict:` sub-bullet, check the box. Checked entries are swept on occasional cleanup passes.

### Skills

- `/create-spec`, `/create-plan` — local forks, installed via `npx skills add`.
- Other skills (grill-me, tdd, write-pr-description, improve-codebase-architecture, firecrawl-\*) come from upstream.

## Memory

Your memory is OptMem, scoped to this repo only:
- The tool is `./.optmem/run` (a wrapper that pins `MEMORY_DIR` to `./.optmem/memory`; always use it, never bare `memo`).
- Memories live in `./.optmem/memory` (git-ignored).
- At session start, run `./.optmem/run wake` and read its output to the end.
- While working, run `./.optmem/run note "<one line>"` when you learn something worth keeping: a decision, a fact, an event of lasting effect.
- Look things up with `./.optmem/run recall <regex>`, or `./.optmem/run zoom <lo>-<hi>` to open a summary node.
- Never edit or delete anything under `.optmem/memory`; the tool manages it.
- Subagents must never run memo — when spawning one, write: `You are a subagent. Don't run memo.`

## Project Specific Notes

- **Name:** `mdtation`.
- **Purpose:** Desktop-inspired terminal markdown viewer for the agentic era. Render a markdown file (or piped stdin) full-screen, mouse-friendly, with inline comments that copy structured references to the clipboard and ship straight to a CLI agent — a `hunk` diff viewer meets `agentation` annotation flow, built as a `herdr`-inspired TUI.
- **Stack:** TypeScript ESM. CLI via `citty`; TUI framework TBD (OpenTUI/React or Ink are the leading candidates — see `notes/research-pi-tui.md` and `notes/research-hunk.md`). Lint+format with `oxlint`/`oxfmt`; build with `tsdown`; one sentence per line in source docs so refs stay meaningful (per `agent-lock` convention).
- **Isolation:** Reference projects live in `_learn/` (git-ignored) and are read-only learning material, never committed.
- **Dogfooding:** This repo's `AGENTS.md` is assembled by `agent-lock` from pinned refs (this file) plus inline sections; `CLAUDE.md` is symlinked to it. Run `npx agent-lock install` after editing `agents.json`.
