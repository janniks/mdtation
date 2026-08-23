import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Copy } from "./copy";
import { GitHub } from "./icons";
import { Theme } from "./theme";

export const GITHUB = "https://github.com/janniks/mdtation";
export const NPM = "https://www.npmjs.com/package/mdtation";
export const INSTALL = "npm i -g mdtation";

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
      <div className="mx-auto grid max-w-[1040px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-8">
        <a
          href="#"
          className="inline-flex items-center gap-2.5 font-semibold tracking-tight"
          title="feedback your agent can use"
        >
          <span
            className="inline-flex size-7 items-center justify-center rounded-md border bg-card text-base leading-none shadow-xs"
            aria-hidden
          >
            <span className="[filter:grayscale(1)_brightness(0)] dark:[filter:grayscale(1)_brightness(0)_invert(1)]">🧘</span>
          </span>
          mdtation
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-1.5">
          <Theme />
          <Copy text={INSTALL} label="Install" />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={NPM} target="_blank" rel="noreferrer">
              <Package />
              npm
            </a>
          </Button>
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
