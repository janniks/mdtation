import { Amp, Claude, Codex, Copilot, Cursor } from "../icons";

/** The social card, 1200x630, as plain inline-styled JSX so next/og and the live /og page render the same tree. Font names differ per host. */
const AGENTS = [Claude, Codex, Cursor, Amp, Copilot];

export function Card({ sans, mono, logo }: { sans: string; mono: string; logo: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        background: "#fbfaf7",
        color: "#2a2823",
        fontFamily: sans,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30 }}>
        <img src={logo} width={52} height={52} alt="" />
        <div style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>mdtation</div>
        <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 22, color: "#7a766c" }}>
          terminal markdown viewer for agent workflows
        </div>
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 80,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.02,
        }}
      >
        A better agentic feedback flow.
      </div>
      <div
        style={{ marginTop: 24, fontSize: 30, lineHeight: 1.35, color: "#6b675e", maxWidth: 1000 }}
      >
        Your agent writes a spec. You comment on the exact section, inline. The agent reads it
        instead of long conversation chunks.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 44 }}>
        <div
          style={{
            display: "flex",
            borderRadius: 14,
            border: "2px solid #e3e0d8",
            background: "#fff",
            padding: "14px 26px",
            fontSize: 28,
            fontFamily: mono,
          }}
        >
          <span style={{ color: "#9b9689", marginRight: 14 }}>$</span>npm i -g mdtation
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginLeft: "auto",
            fontFamily: mono,
            fontSize: 22,
            color: "#7a766c",
          }}
        >
          works with
          <div style={{ display: "flex", gap: 8 }}>
            {AGENTS.map((Icon, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  border: "2px solid #e3e0d8",
                  background: "#fff",
                  color: "#4a4740",
                }}
              >
                <Icon size={24} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
