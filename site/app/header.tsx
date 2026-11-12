import type { ReactNode } from "react";
import { GitHub } from "./icons";

export const GITHUB = "https://github.com/janniks/mdtation";
export const NPM = "https://www.npmjs.com/package/mdtation";
export const INSTALL = "npm i -g mdtation";
/** What the install row's prompt button copies: tells an agent how to install mdtation and learn the comment flow. */
export const PROMPT =
  "Install mdtation with `npm i -g mdtation`, then run `mdtation skill` and follow it to read and address the comments I leave on your markdown.";

const links = [
  ["#loop", "How it works"],
  ["#features", "Features"],
  ["#faq", "FAQ"],
  ["#install", "Install"],
] as const;

/** Quiet top bar on the paper: wordmark, a few soft links, GitHub. No box, no shadow; it scrolls away with the page. */
export function Header({ mark }: { mark?: ReactNode }) {
  return (
    <header className="relative z-40 px-5 pt-[env(safe-area-inset-top)] sm:px-8">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-8 text-[13px] text-neutral-500">
        <a href="#" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-neutral-800">
          {mark}
          mdtation
        </a>
        <nav className="hidden items-center gap-6 sm:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="transition-colors duration-200 hover:text-neutral-900">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-neutral-900"
          >
            <GitHub className="size-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
