import { ArrowRight, ArrowUp, ListChecks, MessagesSquare, Package, ScrollText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Agents } from "./agents";
import { Copy } from "./copy";
import { Clip, code } from "./clip";
import { Gallery } from "./gallery";
import { GITHUB, Header, INSTALL, NPM } from "./header";
import { Agentation, GitHub, Herdr, Hunk, OpenTUI } from "./icons";
import { Prompt } from "./prompt";
import { Protos } from "./proto/groups";

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
    'A, B or C, pick one. Your real answer is "B, but only if the second half of C", and there is no box for that.',
  ],
  [
    MessagesSquare,
    "Itemized lists in a chat thread",
    'Twelve numbered bullets, answer by letter and number. By the time you type "3b, no, 5 is wrong" the list has scrolled off screen and you are answering from memory.',
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
    "Ask for the plan as markdown, not as a message. `plans/auth.md` is a thing you can open again tomorrow. A chat bubble is not.",
    "mdtation plans/auth.md",
    "print",
  ],
  [
    "You read, comment, and copy",
    "Full screen, mouse friendly, calm. Press `c` on a line or drag-select a sentence and write what is wrong with it. The note is pinned where it belongs. `C` copies it as a reference: line number, section path, the quoted passage, your note. Or let the agent pull all of them with `list`.",
    "c, then C",
    "select",
  ],
  [
    "The agent revises, you loop",
    "The agent reads the report, edits the file, and you open it again. Your comments are still anchored. Archive the ones that landed, jump through the rest with `]`, and go again.",
    "mdtation plans/auth.md list",
    "agent",
  ],
] as const;

const friends = [
  [Hunk, "hunk", "Diff review with a comment flow built for agents. mdtation is hunk for prose.", "https://github.com/modem-dev/hunk"],
  [Herdr, "herdr", "The multiplexer mdtation lives in. Its menus, mouse and calm layout set the bar.", "https://github.com/herdrdev/herdr"],
  [Agentation, "agentation", "Click an element, copy a structured reference. That idea became mdtation's copy.", "https://github.com/benjitaylor/agentation"],
  [OpenTUI, "OpenTUI", "The terminal renderer underneath, the same one OpenCode and hunk are built on.", "https://github.com/sst/opentui"],
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
    "Yes. The copied block and the `list` report are plain markdown. Codex CLI, Gemini CLI, OpenCode, Cursor CLI, or a chat window in a browser all read it the same way. There is no plugin, daemon or MCP server involved.",
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
    "hunk reviews code diffs with a live session the agent talks to. mdtation reviews prose, specs, plans and notes, and hands results back as a copied block or a `list` report. They sit next to each other. Review the plan in mdtation, the diff in hunk.",
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
    <span className="relative inline-block">
      <Icon className={`absolute rounded-sm border bg-card p-[0.08em] text-primary shadow-xs ${at}`} />
      {children}
    </span>
  );
}

/** Section label above the title. One place to swap once the prototype round picks its replacement. */
function Kicker({ children }: { children: string }) {
  return <p className="mb-3 font-mono text-xs text-primary">{children}</p>;
}

function Section({
  id,
  kicker,
  title,
  intro,
  children,
}: {
  id: string;
  kicker: string;
  title?: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t py-16 sm:py-24">
      <Kicker>{kicker}</Kicker>
      {title && <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>}
      {intro && (
        <p className="mt-3 mb-10 max-w-[640px] leading-relaxed text-muted-foreground">{code(intro)}</p>
      )}
      {children}
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
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
            terminal markdown viewer for agent workflows
          </Badge>
          <h1 className="mx-auto mt-5 max-w-[760px] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Feedback your agent can actually use
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-lg leading-relaxed text-muted-foreground">
            Your agent writes the spec. You open it full screen, comment on the exact line, press
            one key. The agent gets a reference it understands. Nothing scrolls away.
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
            <Button asChild variant="outline">
              <a href={NPM} target="_blank" rel="noreferrer">
                <Package />
                npm
              </a>
            </Button>
          </div>

          <Agents className="mt-5 justify-center" />


          <Clip
            name="comment"
            frame="rounded-2xl"
            className="mt-12 text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] sm:mt-16"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            <ArrowUp className="mr-1 inline size-3.5 align-[-2px] text-primary" />
            You just left a comment. The agent can read it now.
          </p>
        </section>

        <Section
          id="friends"
          kicker="inspiration and friends"
        >
          <blockquote className="text-center text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            <span className="text-primary">“</span>If{" "}
            <Float icon={Herdr} at="-rotate-12 -bottom-[0.5em] left-[18%] size-[0.8em]">herdr</Float>,{" "}
            <Float icon={Hunk} at="rotate-6 -top-[0.3em] -right-[0.45em] size-[0.6em]">hunk</Float>, and{" "}
            <Float icon={Agentation} at="-rotate-6 -top-[0.35em] -right-[0.5em] h-[0.6em] w-auto">agentation</Float> had a
            baby.<span className="text-primary">”</span>
          </blockquote>
          <p className="mx-auto mt-6 mb-12 max-w-[560px] text-center leading-relaxed text-muted-foreground">
            mdtation is a small idea borrowed from a few bigger ones.
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
                      className="ml-auto inline-flex items-center gap-1 font-sans text-xs font-normal text-muted-foreground hover:text-foreground"
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
          kicker="the problem"
          title="Agents ask for feedback in the worst possible places"
          intro="Every coding agent needs your review. Each one collects it through a channel built for answers, not critique."
        >
          <div className="grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
            {pains.map(([Icon, title, body]) => (
              <Card key={title}>
                <CardHeader>
                  <span className="mb-2 inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <CardTitle className="text-base leading-snug">{title}</CardTitle>
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
          title="Review the plan, not the diff"
          intro="hunk does this for code diffs. mdtation does it for the prose around them: specs, plans, drafts, reviews."
        >
          <ol className="space-y-14 md:space-y-20">
            {steps.map(([title, body, key, clip], i) => (
              <li
                key={title}
                className="grid items-center gap-6 md:grid-cols-2 md:gap-12 [&>*]:min-w-0"
              >
                <div className={`flex gap-4 ${i % 2 ? "md:order-2" : ""}`}>
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {code(body)}
                    </p>
                    <code className="mt-2 inline-block rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {key}
                    </code>
                  </div>
                </div>
                <Clip name={clip} wide still={i === 0} />
              </li>
            ))}
          </ol>
          <div className="mt-16 grid items-start gap-10 md:grid-cols-[1fr_1.1fr] [&>*]:min-w-0">
            <div>
              <h3 className="font-semibold">What lands on the clipboard</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Line, section path, quote, note. Plain text, no schema to learn.
              </p>
            </div>
            <Prompt title="clipboard, after C">
              <pre className="whitespace-pre">{block}</pre>
              <pre className="whitespace-pre border-t pt-3 text-muted-foreground">{line}</pre>
            </Prompt>
          </div>
        </Section>

        <Section
          id="agents"
          kicker="built for agents"
          title="Paste it into any agent"
          intro="Plain markdown with a line number, a heading path, the passage and your note. For a whole review, `mdtation file.md list` prints every comment as one report."
        >
          <div className="grid items-start gap-10 md:grid-cols-[1fr_1.1fr] [&>*]:min-w-0">
            <Agents className="pt-2" />
            <div>
              <Prompt title="claude">
                <pre className="whitespace-pre-wrap">{prompt}</pre>
              </Prompt>
            </div>
          </div>
        </Section>

        <Section
          id="features"
          kicker="features"
          title="Everything a viewer should have had"
          intro="A real menu bar, a command palette, a settings popup, and a View menu that remembers what you picked. The CLI keeps growing."
        >
          <Gallery />
        </Section>

        <Section
          id="faq"
          kicker="faq"
          title="Questions"
          intro="Short answers. The README has the long ones."
        >
          <Accordion type="single" collapsible className="max-w-[760px]">
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

        <Section
          id="proto"
          kicker="prototypes"
          title="Pick one of each"
          intro="Alternatives for the pieces that still feel bland. Temporary, removed once chosen."
        >
          <Protos />
        </Section>
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
