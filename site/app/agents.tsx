import { Amp, Claude, Codex, Copilot, Cursor } from "./icons";

const agents = [
  ["Claude Code", Claude, "-rotate-6"],
  ["Codex CLI", Codex, "rotate-3"],
  ["Cursor CLI", Cursor, "-rotate-2"],
  ["Amp", Amp, "rotate-6"],
  ["Copilot CLI", Copilot, "-rotate-3"],
] as const;

/** Quiet "works with" row: tiny label, then small monochrome tiles. Ported from openindex agents-row, tilted like stickers, no copy button. */
export function Agents({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span className="font-mono text-xs text-muted-foreground">works with</span>
      <div className="flex items-center">
        {agents.map(([name, Icon, tilt]) => (
          <span
            key={name}
            title={name}
            className={`-ml-1 inline-flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-xs first:ml-0 ${tilt}`}
          >
            <Icon className="size-4" />
            <span className="sr-only">{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
