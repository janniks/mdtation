"use client";
import { useState } from "react";

/** Inline prototype picker: a small dark pill of options under the thing it switches. Sits in the top-right corner of the element so it takes no space. Dev tool, lives on the page until a pick is final. */
export function Pick({
  options,
  className = "",
}: {
  options: readonly (readonly [string, React.ReactNode])[];
  className?: string;
}) {
  const [i, set] = useState(0);
  return (
    <div className={`relative ${className}`}>
      {options[i][1]}
      <div className="absolute -top-2 -right-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/80 p-0.5 text-[10px] text-white/55 shadow-md backdrop-blur">
        {options.map(([name], j) => (
          <button
            key={name}
            type="button"
            onClick={() => set(j)}
            className={`rounded-full px-2 py-0.5 transition-colors ${j === i ? "bg-white/15 text-white" : "hover:text-white/85"}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
