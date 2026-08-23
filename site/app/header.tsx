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

/** Sticky translucent bar: icon tile + name, centered nav, buttons on the right. Ported from openindex home-nav without the scroll morph. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-md">
      <div className="mx-auto grid max-w-[1040px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 sm:grid-cols-[auto_1fr_auto] sm:px-8">
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
  );
}
