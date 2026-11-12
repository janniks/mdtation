// The homepage's shared pieces: the pitch, the install row and the FAQ.

import { Command } from "./command";
import { Copy } from "./copy";
import { Questions } from "./faq";
import { PROMPT } from "./header";

const faq = [
  [
    "Does it need Bun?",
    "The fullscreen TUI runs under Bun. Under Node, mdtation prints a warning and renders the document to stdout instead, and `list`, `list --archived`, `restore`, `clear` and `status` all work. Install with npm either way.",
  ],
  [
    "Where are comments stored?",
    "In `comments.json` under `$MDTATION_HOME`, else `$XDG_DATA_HOME/mdtation`, else `~/.mdtation`. Comments are keyed by the file's absolute path, so moving or renaming a file starts it fresh. `mdtation file.md status` prints the directory.",
  ],
  [
    "Does it work with agents other than Claude Code?",
    "Yes. The copied reference and the `list` report are plain markdown. Codex CLI, Gemini CLI, OpenCode, Cursor CLI, or a chat window in a browser all read it the same way. There is no plugin, daemon or MCP server involved.",
  ],
  [
    "What happens to my comments when the agent rewrites the file?",
    "A comment on a heading is stored by heading path and finds that heading again wherever it moved. A comment on any other line is stored by line number and stays on that number. Ask the agent to keep headings, and reuse `]` to walk the rest.",
  ],
  [
    "Can I pipe into it?",
    "Not yet. mdtation takes one file path. Write the agent's output to a file first, then open it. Stdin support is on the list.",
  ],
  [
    "How is this different from hunk?",
    "hunk reviews code diffs with a live session the agent talks to. mdtation reviews prose, specs, plans and notes, and hands results back as a copied reference or a `list` report. They sit next to each other. Review the plan in mdtation, the diff in hunk.",
  ],
  [
    "Can I script it?",
    "`list` prints live comments as markdown, `list --archived` adds archived ones with ids, `restore a1,b2` un-archives by id, `clear` forgets a file's comments, `print` renders to stdout. Pipe `list` into `pbcopy` or straight into an agent's prompt.",
  ],
  [
    "Does it modify my markdown?",
    "Only when you ask. Flipping a checkbox, editing a frontmatter field or cycling a table alignment marks the document dirty, and `^s` writes it back. Comments never touch the file. They live in the data dir.",
  ],
] as const;

/** A friend's name with its mark hovering above, tilted, like a sticker. */

export function Pitch() {
  return (
    <>
      <h1 className="mx-auto max-w-[760px] text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
        Comment on the plan, not the chat
      </h1>
      <p className="mx-auto mt-4 max-w-[560px] text-lg text-balance text-muted-foreground">
        Read agent-written markdown in your terminal, annotate inline, and ship the notes straight
        back.
      </p>
    </>
  );
}

/** The install command in a copyable pill. */
export function Install({ className = "mt-12 sm:mt-16" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 px-5 text-center ${className}`}>
      <p className="max-w-[520px] leading-relaxed text-balance text-muted-foreground">
        A small CLI for the terminal you already use. Open any markdown file, leave comments where they belong, and your agent reads them straight from the file.
      </p>
      <div className="flex max-w-full flex-wrap items-center justify-center gap-3">
        <Command id="install" />
        <span className="flex items-center rounded-xl border border-black/[0.06] bg-black/[0.025] px-4 py-3 text-sm text-neutral-600">
          <Copy text={PROMPT} label="Copy prompt" quiet />
        </span>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t pt-[calc(4rem*var(--space,1))] pb-[calc(4rem*var(--space,1))] sm:pt-[calc(6rem*var(--space,1))] sm:pb-[calc(6rem*var(--space,1))]"
    >
      <div className="mx-auto max-w-[760px]">
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-balance">FAQ</h2>
        <Questions items={faq} />
      </div>
    </section>
  );
}
