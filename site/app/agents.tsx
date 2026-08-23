import { Aider, Amp, Claude, Codex, Copilot, Cursor, Gemini, OpenCode, Windsurf } from "./icons";

const agents = [
  ["Claude Code", Claude],
  ["Codex CLI", Codex],
  ["Gemini CLI", Gemini],
  ["OpenCode", OpenCode],
  ["Cursor CLI", Cursor],
  ["Aider", Aider],
  ["Amp", Amp],
  ["Copilot CLI", Copilot],
  ["Windsurf", Windsurf],
] as const;

/** Quiet "works with" row: tiny label, then small monochrome tiles. Ported from openindex agents-row without the tilt and copy button. */
export function Agents({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span className="font-mono text-xs text-muted-foreground">works with</span>
      <div className="flex items-center">
        {agents.map(([name, Icon]) => (
          <span
            key={name}
            title={name}
            className="-ml-1.5 inline-flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors first:ml-0 hover:z-10 hover:text-foreground"
          >
            <Icon className="size-4" />
            <span className="sr-only">{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
