import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { Card } from "./og/card";

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
  const logo = `data:image/png;base64,${(await readFile("app/icon.png")).toString("base64")}`;
  return new ImageResponse(<Card sans="Inter" mono="JetBrains Mono" logo={logo} />, {
    ...size,
    fonts: [
      { name: "Inter", data: sans, weight: 400 },
      { name: "Inter", data: bold, weight: 700 },
      { name: "JetBrains Mono", data: mono, weight: 400 },
    ],
  });
}
