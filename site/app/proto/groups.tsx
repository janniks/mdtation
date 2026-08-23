"use client";

import { Bug } from "lucide-react";

/** Prototype groups, rendered on /proto and inline at the bottom of the landing page. */

function Variant({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
}) {
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

export function Protos() {
  return (
    <div>
      {/* Parked: hero pill F (GitHub link with star count). Use once the repo has stars.
        <Group title="1. Hero pill">
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
        */}

      <Group title="3. Section kicker">
        {(
          [
            [
              "D",
              "Hairline rule with the label sitting on top of it, quiet but structured.",
              "rule",
            ],
            [
              "E",
              "Small lucide icon paired with a sans label, adds texture without mono type.",
              "icon",
            ],
          ] as const
        ).map(([label, note, kind]) => (
          <Variant key={label} label={label} note={note}>
            <div className="w-full max-w-[520px] text-left">
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
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Every coding agent needs your review. Each one collects it through a channel built
                for answers, not critique.
              </p>
            </div>
          </Variant>
        ))}
      </Group>

      <Group title="4. Decorated section tags">
        {(
          [
            [
              "A",
              "Blueprint corners: the label sits in a box with tick marks at each corner, hairlines run out both sides.",
              "corners",
            ],
            [
              "E",
              "Registration marks: a small crosshair in each corner of the header block, label sits top-left.",
              "cross",
            ],
          ] as const
        ).map(([label, note, kind]) => (
          <Variant key={label} label={label} note={note}>
            <div className="w-full max-w-[520px] text-left">
              {kind === "corners" && (
                <div className="mb-4 flex items-center gap-3">
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
                    <span className="font-mono text-xs text-muted-foreground">the problem</span>
                  </div>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
              )}
              {kind === "cross" && (
                <div className="relative mb-4 px-4 py-3">
                  <span
                    className="absolute top-0 left-0 text-[10px] leading-none text-border"
                    aria-hidden
                  >
                    +
                  </span>
                  <span
                    className="absolute top-0 right-0 text-[10px] leading-none text-border"
                    aria-hidden
                  >
                    +
                  </span>
                  <span
                    className="absolute bottom-0 left-0 text-[10px] leading-none text-border"
                    aria-hidden
                  >
                    +
                  </span>
                  <span
                    className="absolute right-0 bottom-0 text-[10px] leading-none text-border"
                    aria-hidden
                  >
                    +
                  </span>
                  <p className="font-mono text-xs text-muted-foreground">the problem</p>
                </div>
              )}
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Agents ask for feedback in the worst possible places
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Every coding agent needs your review. Each one collects it through a channel built
                for answers, not critique.
              </p>
            </div>
          </Variant>
        ))}
      </Group>
    </div>
  );
}
