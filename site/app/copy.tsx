"use client";
import { useState } from "react";
import { Check, Copy as Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** quiet: plain text link look, for the top bar. */
export function Copy({ text, label, size, quiet }: { text: string; label?: string; size?: "xs" | "sm"; quiet?: boolean }) {
  const [done, setDone] = useState(false);
  async function go() {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  // quiet: icons and labels crossfade in place, so the button never changes size
  if (quiet) {
    const fade = (on: boolean) => `col-start-1 row-start-1 transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`;
    return (
      <button onClick={go} aria-label={label ?? "Copy"} className="relative inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-neutral-900">
        <span className="grid">
          <Icon className={`size-3.5 ${fade(!done)}`} />
          <Check className={`size-3.5 ${fade(done)}`} />
        </span>
        {label ? (
          <span className="grid">
            <span className={fade(!done)}>{label}</span>
            <span className={fade(done)} aria-hidden>
              Copied
            </span>
          </span>
        ) : (
          <span className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 text-xs ${fade(done)}`} aria-live="polite">
            Copied
          </span>
        )}
      </button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size ?? (label ? "sm" : "icon-sm")}
          onClick={go}
          aria-label="Copy to clipboard"
          className="shrink-0"
        >
          {done ? <Check className="text-primary" /> : <Icon />}
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{done ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}
