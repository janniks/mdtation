"use client";

import { Bug, TriangleAlert } from "lucide-react";

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
              "B",
              "Thin colored left bar with a small-caps label, common in editorial layouts.",
              "bar",
            ],
            ["C", "No kicker: the title carries a colored final period instead.", "period"],
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
              {kind === "bar" && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3.5 w-1 rounded-full bg-primary" aria-hidden />
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    the problem
                  </span>
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
                Every coding agent needs your review. Each one collects it through a channel built
                for answers, not critique.
              </p>
            </div>
          </Variant>
        ))}
      </Group>

      <Group title="4. Decorated section tags (A, D, E kept)">
        {(
          [
            [
              "A",
              "Blueprint corners: the label sits in a box with tick marks at each corner, hairlines run out both sides.",
              "corners",
            ],
            [
              "D",
              "Vertical hairline with a square marker, label rotated 90deg beside the title, editorial magazine feel.",
              "vertical",
            ],
            [
              "E",
              "Registration marks: a small crosshair in each corner of the header block, label sits top-left.",
              "cross",
            ],
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
                    Every coding agent needs your review. Each one collects it through a channel
                    built for answers, not critique.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[520px] text-left">
                {kind === "corners" && (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <div className="relative px-3 py-1">
                      <span
                        className="absolute top-0 left-0 size-2 border-t border-l border-primary"
                        aria-hidden
                      />
                      <span
                        className="absolute top-0 right-0 size-2 border-t border-r border-primary"
                        aria-hidden
                      />
                      <span
                        className="absolute bottom-0 left-0 size-2 border-b border-l border-primary"
                        aria-hidden
                      />
                      <span
                        className="absolute right-0 bottom-0 size-2 border-r border-b border-primary"
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
            )}
          </Variant>
        ))}
      </Group>

      <Group title="6. Combined tags for other sections">
        {(
          [
            [
              "B",
              "Corner-tick box (4A) sitting on the rule kicker (3D): label in ticks, hairline runs to the right edge.",
              "features",
            ],
          ] as const
        ).map(([label, note, tag]) => (
          <Variant key={label} label={label} note={note}>
            {label === "B" && (
              <div className="w-full max-w-[520px] text-left">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative px-3 py-1">
                    <span
                      className="absolute top-0 left-0 size-2 border-t border-l border-primary"
                      aria-hidden
                    />
                    <span
                      className="absolute top-0 right-0 size-2 border-t border-r border-primary"
                      aria-hidden
                    />
                    <span
                      className="absolute bottom-0 left-0 size-2 border-b border-l border-primary"
                      aria-hidden
                    />
                    <span
                      className="absolute right-0 bottom-0 size-2 border-r border-b border-primary"
                      aria-hidden
                    />
                    <span className="font-mono text-xs text-muted-foreground">{tag}</span>
                  </div>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Everything a viewer should have had
                </h3>
              </div>
            )}
          </Variant>
        ))}
      </Group>

      <Group title="5. Problem section (E fun, maybe use within)">
        <Variant
          label="A"
          note="Muted red kicker with a TriangleAlert icon, label swapped from 'the problem' to 'today'."
        >
          <div className="w-full max-w-[520px] text-left">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
              <TriangleAlert className="size-3.5" />
              today
            </div>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Agents ask for feedback in the worst possible places
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every coding agent needs your review. Each one collects it through a channel built for
              answers, not critique.
            </p>
          </div>
        </Variant>

        <Variant
          label="B"
          note="Thin red left rule instead of a kicker word, the color alone signals warning."
        >
          <div className="w-full max-w-[520px] border-l-2 border-red-300 pl-4 text-left dark:border-red-900">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Agents ask for feedback in the worst possible places
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every coding agent needs your review. Each one collects it through a channel built for
              answers, not critique.
            </p>
          </div>
        </Variant>

        <Variant
          label="C"
          note="Soft red badge pill, label 'where feedback goes to die' instead of 'the problem'."
        >
          <div className="w-full max-w-[520px] text-left">
            <span className="mb-3 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              where feedback goes to die
            </span>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Agents ask for feedback in the worst possible places
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every coding agent needs your review. Each one collects it through a channel built for
              answers, not critique.
            </p>
          </div>
        </Variant>

        <Variant
          label="D"
          note="Old label struck through, replaced label beside it, makes the reframe visible instead of just picking a new word."
        >
          <div className="w-full max-w-[520px] text-left">
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground line-through">the problem</span>
              <span className="font-medium text-red-700 dark:text-red-400">the pain</span>
            </div>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Agents ask for feedback in the worst possible places
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every coding agent needs your review. Each one collects it through a channel built for
              answers, not critique.
            </p>
          </div>
        </Variant>

        <Variant
          label="E"
          note="Terminal-style red prompt line, alt title trimmed to fit the prompt's tone: 'Feedback has nowhere to land'."
        >
          <div className="w-full max-w-[520px] text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border bg-[#272822] px-3 py-1.5 font-mono text-xs">
              <span className="text-[#f92672]">!</span>
              <span className="text-[#f8f8f2]">feedback, today</span>
            </div>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Feedback has nowhere to land
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every coding agent needs your review. Each one collects it through a channel built for
              answers, not critique.
            </p>
          </div>
        </Variant>
      </Group>
    </div>
  );
}
