/** A fake mdtation frame, built from the real layout: menu bar, crumb, gutter, status bar, comment popup. */

type Row = { n: number; text: React.ReactNode; mark?: "caret" | "dot"; dim?: boolean };

const rows: Row[] = [
  { n: 5, text: <span className="font-bold">## Architecture</span> },
  { n: 6, text: "" },
  { n: 7, text: "The renderer is a pure function from markdown to rows." },
  { n: 8, text: "Comments live beside the file, keyed by path, and re-anchor" },
  { n: 9, text: <>by heading slug so they survive a <span className="italic">moved</span> section.</>, mark: "dot" },
  { n: 10, text: "" },
  { n: 11, text: <span className="font-bold">### The copy step</span> },
  {
    n: 12,
    text: (
      <>
        Press <span className="text-primary">C</span> and the comment under the cursor becomes a
      </>
    ),
    mark: "caret",
  },
  { n: 13, text: "reference block on your clipboard. Paste it into the agent.", mark: "dot" },
  { n: 14, text: "" },
  { n: 15, text: <span className="text-muted-foreground">```sh</span> },
  { n: 16, text: <>mdtation spec.md <span className="text-muted-foreground"># c to comment, C to copy</span></> },
  { n: 17, text: <span className="text-muted-foreground">```</span> },
  { n: 18, text: "" },
  { n: 19, text: "- [x] persist comments, - [ ] stdin", mark: "dot" },
];

export function Terminal() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] overflow-hidden font-mono text-[11px] sm:text-[13px] leading-[1.55]">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <i className="size-2.5 rounded-full bg-[#ff5f57]" />
        <i className="size-2.5 rounded-full bg-[#febc2e]" />
        <i className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-muted-foreground text-xs">mdtation — spec.md</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className="flex gap-5 px-4 py-1 border-b border-border">
            {["File", "View", "Comments", "Help"].map((m) => (
              <span key={m} className={m === "Comments" ? "bg-fg text-bg px-1" : "text-muted-foreground"}>
                <u className="decoration-muted-foreground/60 underline-offset-2">{m[0]}</u>
                {m.slice(1)}
              </span>
            ))}
          </div>
          <div className="px-4 py-1 text-muted-foreground border-b border-border/60 truncate">
            spec.md <span className="opacity-60">/</span> Architecture{" "}
            <span className="opacity-60">/</span> The copy step
          </div>
          <div className="relative py-1">
            {rows.map((r) => (
              <div
                key={r.n}
                className={`flex px-2 ${r.mark === "caret" ? "bg-foreground/[0.06]" : ""}`}
              >
                <span className="w-6 text-right text-muted-foreground-foreground/60 select-none">{r.n}</span>
                <span className="w-5 text-center select-none">
                  {r.mark === "caret" && <span className="text-primary">+</span>}
                  {r.mark === "dot" && <span className="text-mark">●</span>}
                </span>
                <span className="whitespace-pre">{r.text}</span>
              </div>
            ))}
            <div className="hidden sm:block absolute right-4 top-[52%] w-[17rem] rounded-md border border-mark/50 bg-card shadow-lg">
              <div className="px-3 py-1.5 border-b border-border text-muted-foreground flex justify-between">
                <span>comment, Ln 13</span>
                <span className="text-mark">●</span>
              </div>
              <div className="px-3 py-2 whitespace-pre-wrap">
                Say what gets stripped when the crumb is too long.
                <span className="inline-block w-[0.6em] h-[1.1em] align-text-bottom bg-fg animate-pulse ml-px" />
              </div>
              <div className="px-3 py-1.5 border-t border-border text-muted-foreground text-[0.85em]">
                enter save  esc cancel
              </div>
            </div>
          </div>
          <div className="flex justify-between px-4 py-1 border-t border-border bg-foreground/[0.03] text-muted-foreground">
            <span>
              <span className="text-foreground">Ln 12/131</span>  3 comments
            </span>
            <span>
              <span className="text-foreground">c</span> comment  <span className="text-foreground">C</span> copy{" "}
              <span className="text-foreground">/</span> palette  <span className="text-foreground">?</span> help
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
