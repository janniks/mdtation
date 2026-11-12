"use client";
import { useState } from "react";
import { code } from "./code";

/** Questions on the left; a picked answer appears on the right and swaps in place. Starts with none open. */
export function Questions({ items }: { items: readonly (readonly [string, string])[] }) {
  const [at, setAt] = useState(-1);
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10">
      <ul className="space-y-1">
        {items.map(([q], i) => (
          <li key={q}>
            <button
              onClick={() => setAt(i === at ? -1 : i)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${i === at ? "bg-black/[0.04] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
      {/* nothing until a question is picked; the column keeps its room so picking never shifts the page */}
      <p key={at} className="animate-in fade-in px-3 text-sm leading-relaxed text-muted-foreground md:pt-2">
        {at >= 0 && code(items[at][1])}
      </p>
    </div>
  );
}
