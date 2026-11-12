"use client";

import { useState, type CSSProperties } from "react";
import { INSTALL } from "./header";

const paper = "border border-black/[0.06] bg-black/[0.025] text-neutral-800 hover:bg-black/[0.045]";

/** The install command as one soft chip: no icon, a copy cursor, click copies and "Copied" fades in above it. `className` replaces the paper skin. */
export function Command({ id, className = paper, style }: { id?: string; className?: string; style?: CSSProperties }) {
  const [done, setDone] = useState(false);
  return (
    <button
      id={id}
      type="button"
      aria-label={`Copy ${INSTALL}`}
      onClick={() =>
        navigator.clipboard.writeText(INSTALL).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      // scroll margin: an #anchor jump rests the chip in the middle of the screen
      className={`relative flex max-w-full scroll-mt-[calc(50vh-1.5rem)] cursor-copy items-center rounded-xl px-5 py-3 font-mono text-sm transition-colors duration-200 ${className}`}
      style={style}
    >
      <span className="min-w-0 overflow-x-auto whitespace-nowrap">
        <span className="opacity-45">$</span> {INSTALL}
      </span>
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 font-sans text-xs transition-opacity duration-300 ${done ? "opacity-60" : "opacity-0"}`}
        aria-live="polite"
      >
        Copied
      </span>
    </button>
  );
}
