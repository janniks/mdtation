/** The social card, 1200x630, as plain inline-styled JSX so next/og and the live /og page render the same tree. Font names differ per host. */
export function Card({ sans, mono }: { sans: string; mono: string }) {
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
        <div style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>mdtation</div>
        <div style={{ fontFamily: mono, fontSize: 22, color: "#7a766c" }}>
          terminal markdown viewer for agent workflows
        </div>
      </div>
      <div
        style={{
          marginTop: 48,
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.02,
        }}
      >
        A better agentic feedback flow.
      </div>
      <div
        style={{ marginTop: 28, fontSize: 34, lineHeight: 1.35, color: "#6b675e", maxWidth: 960 }}
      >
        Read the plan full screen, comment on the exact line, paste a reference your agent
        understands.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 56 }}>
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
        <div style={{ fontFamily: mono, fontSize: 22, color: "#7a766c" }}>
          works with anything that can CLI
        </div>
      </div>
    </div>
  );
}
