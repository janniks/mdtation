"use client";

import type { ReactNode } from "react";
import { Picker, usePick } from "./pick";

// title candidates per block; the first ships, dev shows a picker under it to flip through the rest
const words = {
  stage: [
    "Review agent output as a document",
    "Plan, comment, revise",
    "Review a plan like a document",
    "The agent writes. You comment. It revises.",
    "From plan to revision",
    "Your notes, on the lines they mean",
  ],
  tour: [
    "Use your keyboard or your mouse",
    "Keyboard-first, mouse-ready",
    "Click it or key it",
    "Keys when you want, a mouse when you don't",
    "Feels like a desktop app",
    "A terminal app you can click",
    "Point, click, comment",
  ],
};

/** A homepage block with an optional title; the title is the whole copy. `anchor` is the id the nav links to. */
export function Block({
  id,
  anchor,
  title,
  children,
}: {
  id?: keyof typeof words | false;
  anchor?: string;
  /** Locks the title to this candidate's number and drops the picker. */
  title?: string;
  children: ReactNode;
}) {
  const list = id ? words[id] : [];
  const names = list.map((_, i) => String(i + 1));
  const [pick, set] = usePick(`${id} title`, names);
  const at = title ?? pick;
  return (
    <section
      id={anchor}
      className="scroll-mt-8 py-[calc(3rem*var(--space,1))] sm:py-[calc(4.5rem*var(--space,1))]"
    >
      {id && (
        <div className="mb-8">
          <h2 className="grid text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {list.map((s, i) =>
              title && names[i] !== title ? null : (
                <span
                  key={s}
                  aria-hidden={names[i] !== at}
                  className={`col-start-1 row-start-1 transition-opacity duration-300 ${names[i] === at ? "" : "opacity-0"}`}
                >
                  {s}
                </span>
              ),
            )}
          </h2>
          {!title && <Picker label={`${id} title`} names={names} at={at} set={set} />}
        </div>
      )}
      {children}
    </section>
  );
}
