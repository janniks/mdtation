"use client";

// Inline prototype picker: a row of soft dots under a component that flips its variants in place, with the
// current variant's name beside it so a pick can be referenced. Dev only; production renders nothing.

import { useEffect, useState } from "react";

const dev = process.env.NODE_ENV === "development";

/** A named choice remembered per `key` in localStorage; the first name is the default. */
export function usePick<T extends string>(key: string, names: readonly T[]) {
  const [at, setAt] = useState(names[0]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pick:${key}`) as T | null;
      if (saved && names.includes(saved)) setAt(saved);
    } catch {}
    // names is a constant list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [
    at,
    (name: T) => {
      setAt(name);
      try {
        localStorage.setItem(`pick:${key}`, name);
      } catch {}
    },
  ] as const;
}

/** The dots and the name: `label` says what is being picked, the current name follows it. */
export function Picker<T extends string>({
  label,
  names,
  at,
  set,
  className = "mt-2",
}: {
  label: string;
  names: readonly T[];
  at: T;
  set: (name: T) => void;
  className?: string;
}) {
  const [over, setOver] = useState<T | null>(null);
  if (!dev) return null;
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex justify-center gap-1.5" onPointerLeave={() => setOver(null)}>
        {names.map((name) => (
          <button
            key={name}
            type="button"
            aria-label={`${label} ${name}`}
            aria-current={name === at}
            onClick={() => set(name)}
            onPointerEnter={() => setOver(name)}
            className="cursor-pointer py-2"
          >
            <span
              className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${name === at ? "w-8 bg-foreground/40" : "w-1.5 bg-foreground/10 hover:bg-foreground/25"}`}
            />
          </button>
        ))}
      </div>
      <span className="font-mono text-[10px] leading-none text-muted-foreground/70">
        {label} <span className="text-foreground/70">{over ?? at}</span>
      </span>
    </div>
  );
}
