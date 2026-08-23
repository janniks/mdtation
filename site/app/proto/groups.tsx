"use client";

import { Bug, Copy as CopyIcon, FileStack, MessageSquareQuote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitHub } from "../icons";

/** Prototype groups, rendered on /proto and inline at the bottom of the landing page. */

function Caret() {
  const [on, set] = useState(true);
  useEffect(() => {
    const id = setInterval(() => set((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <span className={on ? "opacity-100" : "opacity-0"}>▍</span>;
}

function Variant({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-5 flex items-baseline gap-2">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-[11px] text-muted-foreground">
          {label}
        </span>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <div className="flex flex-col items-center py-2 text-center">{children}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-14">
      <h2 className="mb-8 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

const proof = [
  "Comments stick to lines and selections, and persist between sessions",
  "`C` copies a plain-text block any agent reads verbatim",
  "One markdown file in, one markdown file out, no plugin, no MCP",
];

function code(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="rounded border bg-muted px-1 py-0.5 font-mono text-[0.85em]">
        {p.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function Protos() {
  return (
    <div>
        <Group title="1. Hero pill">
          <Variant label="A" note="Live status, feels shipped and active rather than a static label.">
            <Badge variant="outline" className="gap-1.5 font-mono text-xs text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              v0.1 &nbsp; open source
            </Badge>
          </Variant>

          <Variant label="B" note="Reuses the header's tile so the pill reads as a brand mark, not a caption.">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-4 pl-1 text-xs text-muted-foreground">
              <span className="inline-flex size-5 items-center justify-center rounded-full border bg-muted text-[11px] leading-none" aria-hidden>
                🧘
              </span>
              for Claude Code, Codex, Gemini…
            </div>
          </Variant>

          <Variant label="C" note="Two-tone split pill, the kind npm and crates.io badges use, familiar and scannable.">
            <div className="inline-flex overflow-hidden rounded-full border font-mono text-xs">
              <span className="bg-secondary px-3 py-1 text-muted-foreground">npm</span>
              <span className="bg-primary px-3 py-1 text-primary-foreground">mdtation</span>
            </div>
          </Variant>

          <Variant label="D" note="A tiny terminal prompt with a blinking caret, shows the product instead of describing it.">
            <div className="inline-flex items-center rounded-md border bg-[#272822] px-3 py-1.5 font-mono text-xs text-[#f8f8f2]">
              <span className="text-[#a6e22e]">$</span>&nbsp;mdtation plan.md&nbsp;<Caret />
            </div>
          </Variant>

          <Variant label="E" note="No pill at all: a quiet eyebrow with hairline rules, lets the H1 carry the weight.">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px w-8 bg-border" aria-hidden />
              terminal markdown viewer for agent workflows
              <span className="h-px w-8 bg-border" aria-hidden />
            </div>
          </Variant>

          <Variant label="F" note="Link to GitHub with a star count, turns the pill into a call to action.">
            <a
              href="https://github.com/janniks/mdtation"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHub className="size-3.5" />
              janniks/mdtation
              <span className="inline-flex items-center gap-1 border-l pl-2">
                <Star className="size-3 fill-current text-muted-foreground" />
                128
              </span>
            </a>
          </Variant>
        </Group>

        <Group title="2. Hero proof bullets">
          <Variant label="A" note="Stat strip: big mono numbers read faster than a checkmark list.">
            <div className="flex gap-8 font-mono text-sm">
              <div>
                <div className="text-2xl font-semibold text-foreground">1</div>
                <div className="mt-1 text-xs text-muted-foreground">key to copy</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">0</div>
                <div className="mt-1 text-xs text-muted-foreground">plugins</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">∞</div>
                <div className="mt-1 text-xs text-muted-foreground">sessions</div>
              </div>
            </div>
          </Variant>

          <Variant label="B" note="Three small icon cards, each fact gets its own visual anchor.">
            <div className="grid w-full grid-cols-3 gap-2 text-left">
              {(
                [
                  [MessageSquareQuote, "Sticks to lines and selections, persists between sessions"],
                  [CopyIcon, "One key copies a block any agent reads"],
                  [FileStack, "One file in, one file out, no plugin"],
                ] as const
              ).map(([Icon, t], i) => (
                <div key={i} className="rounded-md border bg-card p-3">
                  <Icon className="size-4 text-primary" />
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t}</p>
                </div>
              ))}
            </div>
          </Variant>

          <Variant label="C" note="One sentence, three inline kbd chips, reads like prose instead of a list.">
            <p className="max-w-[420px] text-sm leading-relaxed text-muted-foreground">
              Comments persist across sessions, one <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">C</kbd>{" "}
              copies a block, and it is <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">.md</kbd> in,{" "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">.md</kbd> out.
            </p>
          </Variant>

          <Variant label="D" note="Keys strip: shows the actual bindings the reader will use, labeled underneath.">
            <div className="flex gap-6">
              {[
                ["c", "comment"],
                ["C", "copy"],
                ["]", "next"],
              ].map(([k, l]) => (
                <div key={k} className="flex flex-col items-center gap-1.5">
                  <kbd className="flex size-8 items-center justify-center rounded-md border bg-card font-mono text-sm shadow-xs">{k}</kbd>
                  <span className="text-[11px] text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          </Variant>

          <Variant label="E" note="Quiet two-line pair, trims three facts down to the two that matter most.">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Works with Claude Code, Codex, Gemini CLI.</p>
              <p>Ships as one markdown file, no plugin, no MCP.</p>
            </div>
          </Variant>

          <Variant label="F" note="Original, for reference: checkmark list the founder wants replaced.">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {proof.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <span className="text-primary">✓</span>
                  <span>{code(p)}</span>
                </li>
              ))}
            </ul>
          </Variant>
        </Group>

        <Group title="3. Section kicker">
          {(
            [
              ["A", "Numbered index in light mono, reads as a table of contents entry.", "index"],
              ["B", "Thin colored left bar with a small-caps label, common in editorial layouts.", "bar"],
              ["C", "No kicker: the title carries a colored final period instead.", "period"],
              ["D", "Hairline rule with the label sitting on top of it, quiet but structured.", "rule"],
              ["E", "Small lucide icon paired with a sans label, adds texture without mono type.", "icon"],
            ] as const
          ).map(([label, note, kind]) => (
            <Variant key={label} label={label} note={note}>
              <div className="w-full max-w-[520px] text-left">
                {kind === "index" && <p className="mb-2 font-mono text-xs font-light text-muted-foreground">01</p>}
                {kind === "bar" && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-3.5 w-1 rounded-full bg-primary" aria-hidden />
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">the problem</span>
                  </div>
                )}
                {kind === "rule" && (
                  <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="whitespace-nowrap">the problem</span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                )}
                {kind === "icon" && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bug className="size-3.5" />
                    the problem
                  </div>
                )}
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Agents ask for feedback in the worst possible places
                  {kind === "period" && <span className="text-primary">.</span>}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Every coding agent needs your review. Each one collects it through a channel built for answers, not critique.
                </p>
              </div>
            </Variant>
          ))}
        </Group>

        <Group title="4. Decorated section tags">
          {(
            [
              ["A", "Blueprint corners: the label sits in a box with tick marks at each corner, hairlines run out both sides.", "corners"],
              ["B", "Centered label between long hairlines with a small square at each end, a divider that also labels itself.", "centered"],
              ["C", "Label in a rounded chip, a dashed hairline trails out to the right edge and ends in a filled square.", "chip"],
              ["D", "Vertical hairline with a square marker, label rotated 90deg beside the title, editorial magazine feel.", "vertical"],
              ["E", "Registration marks: a small crosshair in each corner of the header block, label sits top-left.", "cross"],
              ["F", "Numbered index in an outlined square, hairline under the whole header with a square notch at the start.", "notch"],
            ] as const
          ).map(([label, note, kind]) => (
            <Variant key={label} label={label} note={note}>
              {kind === "vertical" ? (
                <div className="flex w-full max-w-[520px] items-start gap-4 text-left">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <span className="size-1.5 bg-primary" aria-hidden />
                    <span className="h-16 w-px bg-border" aria-hidden />
                  </div>
                  <div>
                    <p className="mb-2 origin-top-left -translate-y-1 rotate-90 text-[11px] tracking-wide text-muted-foreground uppercase">
                      the problem
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      Agents ask for feedback in the worst possible places
                    </h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      Every coding agent needs your review. Each one collects it through a channel built for answers, not
                      critique.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[520px] text-left">
                  {kind === "corners" && (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" aria-hidden />
                      <div className="relative px-3 py-1">
                        <span className="absolute top-0 left-0 size-2 border-t border-l border-primary" aria-hidden />
                        <span className="absolute top-0 right-0 size-2 border-t border-r border-primary" aria-hidden />
                        <span className="absolute bottom-0 left-0 size-2 border-b border-l border-primary" aria-hidden />
                        <span className="absolute right-0 bottom-0 size-2 border-r border-b border-primary" aria-hidden />
                        <span className="font-mono text-xs text-muted-foreground">the problem</span>
                      </div>
                      <span className="h-px flex-1 bg-border" aria-hidden />
                    </div>
                  )}
                  {kind === "centered" && (
                    <div className="mb-4 flex items-center justify-center gap-3">
                      <span className="h-px w-10 bg-border" aria-hidden />
                      <span className="size-1 bg-border" aria-hidden />
                      <span className="text-xs tracking-wide text-muted-foreground uppercase">the problem</span>
                      <span className="size-1 bg-border" aria-hidden />
                      <span className="h-px w-10 bg-border" aria-hidden />
                    </div>
                  )}
                  {kind === "chip" && (
                    <div className="mb-4 flex items-center gap-0">
                      <span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">the problem</span>
                      <span
                        className="h-px flex-1 border-t border-dashed border-border"
                        style={{ marginLeft: "8px" }}
                        aria-hidden
                      />
                      <span className="size-1.5 bg-primary" aria-hidden />
                    </div>
                  )}
                  {kind === "cross" && (
                    <div className="relative mb-4 px-4 py-3">
                      <span className="absolute top-0 left-0 text-[10px] leading-none text-border" aria-hidden>
                        +
                      </span>
                      <span className="absolute top-0 right-0 text-[10px] leading-none text-border" aria-hidden>
                        +
                      </span>
                      <span className="absolute bottom-0 left-0 text-[10px] leading-none text-border" aria-hidden>
                        +
                      </span>
                      <span className="absolute right-0 bottom-0 text-[10px] leading-none text-border" aria-hidden>
                        +
                      </span>
                      <p className="font-mono text-xs text-muted-foreground">the problem</p>
                    </div>
                  )}
                  {kind === "notch" && (
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded border font-mono text-[10px] text-muted-foreground">
                        01
                      </span>
                      <span className="text-xs tracking-wide text-muted-foreground uppercase">the problem</span>
                    </div>
                  )}
                  <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Agents ask for feedback in the worst possible places
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    Every coding agent needs your review. Each one collects it through a channel built for answers, not
                    critique.
                  </p>
                  {kind === "notch" && (
                    <div className="relative mt-6 h-px bg-border">
                      <span className="absolute top-1/2 left-0 size-2 -translate-y-1/2 bg-background" aria-hidden />
                      <span className="absolute top-1/2 left-0 size-1.5 -translate-y-1/2 border border-primary" aria-hidden />
                    </div>
                  )}
                </div>
              )}
            </Variant>
          ))}
        </Group>
    </div>
  );
}
