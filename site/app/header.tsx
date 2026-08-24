import { Button } from "@/components/ui/button";
import { Copy } from "./copy";
import { GitHub } from "./icons";
import { Zen } from "./zen";

export const GITHUB = "https://github.com/janniks/mdtation";
export const NPM = "https://www.npmjs.com/package/mdtation";
export const INSTALL = "npm i -g mdtation";
/** What the header copies: tells an agent how to install mdtation and learn the comment flow. */
export const PROMPT =
  "Install mdtation with `npm i -g mdtation`, then run `mdtation skill` and follow it to read and address the comments I leave on your markdown.";

const links = [
  ["#problem", "the problem"],
  ["#loop", "the loop"],
  ["#features", "features"],
  ["#faq", "faq"],
] as const;

/** Floating pill nav, fixed so iOS Safari's collapsing bottom bar can't open a gap above it. Ported from openindex home-nav without the scroll morph. */
export function Header() {
  return (
    <>
      <header className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 sm:inset-x-8">
        <div className="mx-auto grid max-w-[960px] grid-cols-[1fr_auto] items-center gap-4 rounded-[14px] [corner-shape:squircle] border bg-background/80 p-2 shadow-sm backdrop-blur-md sm:grid-cols-[auto_1fr_auto]">
          <a
            href="#"
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight"
            title="feedback your agent can use"
          >
            <span
              className="inline-flex size-7 items-center justify-center rounded-md border bg-card text-base leading-none shadow-xs"
              aria-hidden
            >
              <Zen />
            </span>
            mdtation
          </a>
          <nav className="hidden items-center justify-center gap-6 font-mono text-xs text-foreground/70 sm:flex">
            {links.map(([href, label]) => (
              <a key={href} href={href} className="transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-1.5">
            <Copy text={PROMPT} label="Copy prompt" size="xs" />
            <Button asChild variant="outline" size="sm">
              <a href={GITHUB} target="_blank" rel="noreferrer">
                <GitHub />
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </header>
      <div className="h-[calc(4.5rem+env(safe-area-inset-top))]" aria-hidden />
    </>
  );
}
