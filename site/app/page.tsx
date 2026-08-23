import {
  ArrowRight,
  ArrowUp,
  ListChecks,
  MessagesSquare,
  Package,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Agents } from "./agents";
import { Copy } from "./copy";
import { Clip } from "./clip";
import { code } from "./code";
import { Gallery } from "./gallery";
import { GITHUB, Header, INSTALL, NPM } from "./header";
import { Agentation, AgentationWord, GitHub, Herdr, Hunk, OpenTUI } from "./icons";
import { Mantra } from "./mantra";
import { Prompt } from "./prompt";

/** Exactly what `copyFormat(comment, doc, "detailed")` puts on the clipboard. */
const block = `Line 41  Auth / Session refresh
    Refresh tokens are rotated on every request and the old token is
    revoked immediately.
> Immediate revoke breaks parallel requests from the same tab. Keep a 30 s grace window, then revoke.`;

/** Same format without a selection: the line itself is quoted. */
const line = `Line 58  Auth / Logout
    Logout clears the cookie and does nothing server-side.
> Also revoke the refresh token, otherwise the cookie is the only thing keeping the session out.`;

const prompt = `Read the comments I left on plans/auth.md by running \`mdtation plans/auth.md list\`.
Address each one in order, then rewrite the file in place.
Keep the headings so my remaining comments stay anchored.`;

const pains = [
  [
    ListChecks,
    "Option pickers",
    'A, B or C, pick one. Your real answer is "B, but only if the second half of C", there is no box for that, and no way to ask where B came from. Clunky on a phone, too.',
  ],
  [
    MessagesSquare,
    "Itemized lists in a chat thread",
    'Finding F7, section 2.1, Critical 6, recommended (b). You answer by label, and by the time you type "F7 no, 2.1 yes, (b) is wrong" the list has scrolled away and you are replying from memory.',
  ],
  [
    ScrollText,
    "Plans as scrollback",
    "The agent wrote a 300-line spec and printed it into the terminal. You read it by scrolling a buffer, and what you think about line 140 goes nowhere.",
  ],
] as const;

const steps = [
  [
    "The agent writes a file",
    "Ask for the plan as a markdown file, not an ephemeral conversation. A file is something you can open again tomorrow. A conversation gets messier.",
    "mdtation plans/auth.md",
    "print",
  ],
  [
    "You read, comment, and copy",
    "Press `c` on a line, or drag-select a sentence, and write what is wrong. `C` copies it as a reference: line, section, quote, note.",
    "",
    "select",
  ],
  [
    "The agent revises, you loop",
    "The agent reads the report and edits the file. Open it again: your comments are still anchored. Archive what landed, go again.",
    "mdtation plans/auth.md list",
    "agent",
  ],
] as const;

const friends = [
  [
    Herdr,
    "herdr",
    "The multiplexer mdtation lives in. Its menus, mouse and calm layout set the bar.",
    "https://github.com/herdrdev/herdr",
  ],
  [
    Hunk,
    "hunk",
    "Diff review with a comment flow built for agents. mdtation is hunk for prose.",
    "https://github.com/modem-dev/hunk",
  ],
  [
    Agentation,
    "agentation",
    "Click an element, copy a structured reference. That idea became mdtation's copy.",
    "https://github.com/benjitaylor/agentation",
  ],
  [
    OpenTUI,
    "OpenTUI",
    "The terminal renderer underneath, the same one OpenCode and hunk are built on.",
    "https://github.com/sst/opentui",
  ],
] as const;

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
function Float({ icon: Icon, at, children }: { icon: typeof Hunk; at: string; children: string }) {
  return (
    <span className="group relative inline-block">
      <Icon
        className={`absolute rounded-sm border bg-card p-[0.08em] text-primary shadow-xs transition-transform duration-300 ease-out group-hover:-translate-y-1.5 ${at}`}
      />
      {children}
    </span>
  );
}

/** Centered label between two hairlines, the hero's eyebrow. */
function Eyebrow({ children, wide }: { children: string; wide?: boolean }) {
  const rule = wide ? "h-px flex-1 bg-border" : "h-px w-12 shrink-0 bg-border";
  return (
    <p
      className={`flex items-center justify-center gap-3 text-xs text-muted-foreground ${wide ? "mx-auto w-[60%]" : ""}`}
    >
      <span className={rule} aria-hidden />
      <span className="text-center text-balance">{children}</span>
      <span className={rule} aria-hidden />
    </p>
  );
}

/** Label in a corner-tick box between two hairlines, centered (prototype 6B). */
function Tag({ children }: { children: string }) {
  return (
    <div className="mx-auto mb-4 flex w-[60%] items-center gap-3">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <div className="relative px-3 py-1">
        <span
          className="absolute top-0 left-0 size-2 border-t border-l border-border"
          aria-hidden
        />
        <span
          className="absolute top-0 right-0 size-2 border-t border-r border-border"
          aria-hidden
        />
        <span
          className="absolute bottom-0 left-0 size-2 border-b border-l border-border"
          aria-hidden
        />
        <span
          className="absolute right-0 bottom-0 size-2 border-r border-b border-border"
          aria-hidden
        />
        <span className="font-mono text-xs text-muted-foreground">{children}</span>
      </div>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

/** Red kicker with a warning icon (prototype 5A), paired with a red left rule. */
function Alert({ children }: { children: string }) {
  return (
    <p className="mb-3 inline-flex items-center gap-1.5 font-mono text-xs text-red-700">
      <TriangleAlert className="size-3.5" />
      {children}
    </p>
  );
}

/** Registration marks in the corners of the header block (prototype 4E). */
function Cross({ children }: { children: React.ReactNode }) {
  const mark = "absolute text-[10px] leading-none text-muted-foreground/60";
  return (
    <div className="relative px-4 py-3">
      <span className={`${mark} top-0 left-0`} aria-hidden>
        +
      </span>
      <span className={`${mark} top-0 right-0`} aria-hidden>
        +
      </span>
      <span className={`${mark} bottom-0 left-0`} aria-hidden>
        +
      </span>
      <span className={`${mark} right-0 bottom-0`} aria-hidden>
        +
      </span>
      {children}
    </div>
  );
}

function Section({
  id,
  kicker,
  kind = "tag",
  title,
  intro,
  tail,
  narrow,
  children,
}: {
  id: string;
  kicker: string;
  /** Header treatment: centered corner-tick tag (default), centered eyebrow, red rule with a warning kicker, crosshair marks, or plain left-aligned title with no kicker. */
  kind?: "tag" | "line" | "alert" | "cross" | "plain";
  title?: string;
  intro?: string;
  /** Extra content inside the header block, under the intro. */
  tail?: React.ReactNode;
  /** Center the whole section in a 760px column. */
  narrow?: boolean;
  children: React.ReactNode;
}) {
  const mid = kind === "tag" || kind === "line";
  const head = (
    <>
      {kind === "tag" && <Tag>{kicker}</Tag>}
      {kind === "line" && (
        <div className="mb-6">
          <Eyebrow wide>{kicker}</Eyebrow>
        </div>
      )}
      {kind === "alert" && <Alert>{kicker}</Alert>}
      {kind === "cross" && <p className="mb-3 font-mono text-xs text-muted-foreground">{kicker}</p>}
      {title && (
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
      )}
      {intro && (
        <p
          className={`mt-3 max-w-[640px] leading-relaxed text-balance text-muted-foreground ${mid ? "mx-auto" : ""}`}
        >
          {code(intro)}
        </p>
      )}
      {tail}
    </>
  );
  return (
    <section
      id={id}
      className={`scroll-mt-20 pb-16 sm:pb-24 ${mid ? "pt-8 sm:pt-12" : "border-t pt-16 sm:pt-24"}`}
    >
      <div className={narrow ? "mx-auto max-w-[760px]" : ""}>
        <div
          className={`${kind === "cross" ? "mb-6" : "mb-10"} ${mid ? "text-center" : ""} ${kind === "alert" ? "border-l-2 border-red-300 pl-4" : ""}`}
        >
          {kind === "cross" ? <Cross>{head}</Cross> : head}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="relative">
      <Header />
      <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[560px]" aria-hidden />

      <main className="mx-auto max-w-[1040px] px-5 sm:px-8">
        <section className="pt-14 pb-16 text-center sm:pt-24 sm:pb-24">
          <Eyebrow>terminal markdown viewer for agent workflows</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-[760px] text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            A better agentic feedback flow.
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-lg leading-7 text-balance text-muted-foreground">
            Your agent writes a spec. You comment on the exact section, inline. The agent reads it
            instead of long conversation chunks.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <div className="flex max-w-full items-center gap-1 rounded-lg border bg-card py-1 pr-1 pl-4 font-mono text-sm">
              <span className="min-w-0 overflow-x-auto whitespace-nowrap">
                <span className="text-muted-foreground">$</span> {INSTALL}
              </span>
              <Copy text={INSTALL} />
            </div>
            <Button asChild>
              <a href={GITHUB} target="_blank" rel="noreferrer">
                <GitHub />
                GitHub
              </a>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <a href={NPM} target="_blank" rel="noreferrer">
                <Package />
                npm
              </a>
            </Button>
          </div>

          <Agents className="mt-5 justify-center" />

          <Clip
            name="hero"
            frame="rounded-lg [corner-shape:squircle] sm:rounded-xl"
            className="mx-auto mt-12 max-w-3xl text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] sm:mt-16"
          />
          <p className="mt-4 text-sm text-balance text-muted-foreground">
            <ArrowUp className="mr-1 inline size-3.5 align-[-2px] text-primary" />
            You just left a comment. Now the agent can read it.
          </p>
        </section>

        <Section id="friends" kicker="inspiration and friends" kind="line">
          <blockquote className="text-center text-3xl font-semibold leading-snug tracking-tight text-balance sm:text-4xl">
            <span className="text-primary">“</span>If{" "}
            <Float icon={Herdr} at="-rotate-12 -bottom-[calc(0.5em-4px)] left-[22%] size-[0.8em]">
              herdr
            </Float>
            ,{" "}
            <Float icon={Hunk} at="rotate-6 -top-[0.2em] -right-[0.35em] size-[0.6em]">
              hunk
            </Float>
            , and{" "}
            <Float
              icon={AgentationWord}
              at="-rotate-3 -bottom-[calc(0.8em-6px)] left-[10%] h-[0.85em] w-auto px-[0.15em] pt-[0.1em] pb-[calc(0.1em-2px)]"
            >
              agentation
            </Float>{" "}
            had a baby.<span className="text-primary">”</span>
          </blockquote>
          <p className="mx-auto mt-14 mb-8 max-w-[560px] text-center leading-relaxed text-muted-foreground">
            mdtation combines ideas and flows from a few great tools.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
            {friends.map(([Icon, name, body, href]) => (
              <Card key={name} className="gap-3 py-4 [--card-spacing:1rem]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    <Icon className="h-5 w-auto shrink-0" />
                    {name}
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 font-sans text-xs font-normal text-muted-foreground/70 hover:text-foreground"
                    >
                      <GitHub className="size-3.5" />
                      GitHub
                    </a>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          id="problem"
          kicker="feedback, the problem today"
          kind="alert"
          title="Agents ask for feedback in the worst possible ways"
          intro="To get the best agentic results, we give our agents feedback: on their plans, their findings, their drafts. But the conversational flow and picker tools are slow and clunky. The `mdtation` flow is more natural, and still terminal friendly."
        >
          <div className="grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
            {pains.map(([Icon, title, body]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base leading-snug">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700">
                      <Icon className="size-4" />
                    </span>
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          id="loop"
          kicker="the loop"
          title="Review the plan, not the chat."
          intro="Specs, plans, drafts, reviews: the prose your agent writes deserves a real review flow, not a chat reply."
        >
          <ol className="space-y-14 md:space-y-20">
            {steps.map(([title, body, key, clip], i) => (
              <li key={title} className="mx-auto w-full max-w-[720px]">
                <div className="flex gap-4">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {code(body)}
                      {key && (
                        <>
                          {" "}
                          <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                            {key}
                          </code>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Clip name={clip} wide still={i === 0} className="mt-4 ml-11" />
              </li>
            ))}
          </ol>
          <div className="mx-auto mt-16 max-w-[720px] space-y-4 [&>*]:min-w-0">
            <p className="text-sm leading-relaxed">
              <span className="mr-2 font-semibold text-foreground">
                What lands on the clipboard
              </span>{" "}
              <span className="text-muted-foreground">
                Line, section path, quote, note. Plain text, no schema to learn.
              </span>
            </p>
            <Prompt title="clipboard">
              <pre className="whitespace-pre">{block}</pre>
              <pre className="whitespace-pre border-t pt-3 text-muted-foreground">{line}</pre>
            </Prompt>
          </div>
        </Section>

        <Section
          id="agents"
          kicker="built for agents"
          kind="cross"
          narrow
          title="Meditate on the plan, then send comments back"
          intro="Plain markdown with a line number, a heading path, the passage and your note. For a whole review, `mdtation file.md list` prints every comment as one report."
          tail={<Agents className="mt-5" />}
        >
          <div>
            <Prompt title="claude">
              <pre className="whitespace-pre-wrap">{prompt}</pre>
            </Prompt>
          </div>
        </Section>

        <Section
          id="features"
          kicker="features"
          title="Everything a TUI should have"
          intro="Menu bar, command palette, settings, all mouse ready. View toggles are remembered."
        >
          <Gallery />
        </Section>

        <Section id="faq" kicker="faq" kind="plain" narrow title="Frequently asked questions">
          <Accordion type="single" collapsible>
            {faq.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left">{q}</AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {code(a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
        <div className="py-14 sm:py-20">
          <Mantra />
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-[1040px] px-5 py-12 sm:px-8">
          {/* Open-source card, ported from openindex oss-card. */}
          <Card className="sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <CardHeader className="flex-1">
              <CardTitle>Open source, MIT licensed.</CardTitle>
              <p className="text-sm text-muted-foreground">
                Read the source, open issues, ship PRs.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={GITHUB} target="_blank" rel="noreferrer">
                  <GitHub />
                  janniks/mdtation
                  <ArrowRight />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={NPM} target="_blank" rel="noreferrer">
                  <Package />
                  npm
                </a>
              </Button>
            </CardContent>
          </Card>
          <Separator className="my-8" />
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
            <span className="whitespace-pre">mdtation MIT 2026 janniks</span>
            <nav className="flex gap-5">
              <a href={GITHUB} className="hover:text-foreground">
                GitHub
              </a>
              <a href={NPM} className="hover:text-foreground">
                npm
              </a>
              <a href={`${GITHUB}/issues`} className="hover:text-foreground">
                Issues
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
