import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** TTF for one Google font, fetched at build; an old user agent makes the CSS API hand out ttf, which satori can read. */
async function font(family: string, weight: number) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:30.0) Gecko/20100101 Firefox/30.0" },
  }).then((r) => r.text());
  const url = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error(`no ttf url for ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

/** Social card for GitHub and link previews, rendered with next/og in the site's light palette. Built once by the static export. */
export default async function Image() {
  const [sans, bold, mono] = await Promise.all([
    font("Inter", 400),
    font("Inter", 700),
    font("JetBrains+Mono", 400),
  ]);
  return new ImageResponse(
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
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30 }}>
        <div style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>mdtation</div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, color: "#7a766c" }}>
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
            fontFamily: "JetBrains Mono",
          }}
        >
          <span style={{ color: "#9b9689", marginRight: 14 }}>$</span>npm i -g mdtation
        </div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, color: "#7a766c" }}>
          works with anything that can CLI
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: sans, weight: 400 },
        { name: "Inter", data: bold, weight: 700 },
        { name: "JetBrains Mono", data: mono, weight: 400 },
      ],
    },
  );
}
