"use client";
import { useState } from "react";
import { Check, Copy as Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Copy({ text, label, size }: { text: string; label?: string; size?: "xs" | "sm" }) {
  const [done, setDone] = useState(false);
  async function go() {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
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
