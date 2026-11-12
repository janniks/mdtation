"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";
import { Fx, flat, specs as fx, type Spec } from "./lab/fx/canvas";
import { Light, specs as lights } from "./lab/hero/light";
import { Leaves, specs as leaves } from "./lab/card/leaves";

// The /lab/card overlap hero with its tuned defaults, no dials: a paper card with a shader ground,
// the terminal hanging off its bottom edge. Each page load takes the next look in the rotation.
// ?look=<name> pins one, for review.

// px values on the Tailwind 4px grid: radius 2rem, margin 1.5rem, padding 6rem, offset and overlap 4rem, width 42rem
const card = { radius: 32, margin: 24, padding: 96, offset: 64, width: 672, overlap: 64, outer: 1.5, term: 1.25 };
const inner = { strength: 1, spread: 28, softness: 1 };
// grain, fibre, scale, vignette, tint
const grain = [1.75, 2, 1, 1.5, 0];

// [name, renderer, mode]; leaves and glass run on WebGL2, the rest need WebGPU
export const looks = [
  ["horizon", "fx", 5],
  ["watercolor", "fx", 1],
  ["bloom", "fx", 7],
  ["mist", "fx", 8],
  ["caustics", "light", 2],
  ["petalglow", "light", 3],
  ["leaves", "leaves", 0],
  ["leaves edge", "leaves", 1],
  ["leaves on paper", "leaves", 2],
  // /lab/card glasshouse: leaf layer multiplied over the paper, faded out toward the middle
  ["glasshouse", "glass", 4],
] as const;
type Look = (typeof looks)[number];

// one logo tint per look: the look's characteristic mid-tone, muted and deep enough to read on the paper header (>= 3.5:1 on #fbfaf7)
export const tints: Record<string, string> = {
  horizon: "#6a6d69", // sumi ink band, thinned
  watercolor: "#6b7a9b", // the slate-blue wash
  bloom: "#67625c", // ink plume, a touch warm
  mist: "#6c737b", // cool ridgeline grey
  caustics: "#5a8792", // pool aqua, deepened
  petalglow: "#588e64", // the green rim glow, muted
  leaves: "#646d7d", // slate leaf shadow
  "leaves edge": "#5c6576",
  "leaves on paper": "#5d6f8a", // cooler shadow (warmth -0.3)
  glasshouse: "#686c73", // multiplied leaf grey
};

/** Next look after the one shown last time, so two loads in a row never match. Storage can be missing or throw. */
function pick(want?: string): Look {
  const pool = looks.filter((l) => l[1] === "leaves" || l[1] === "glass" || "gpu" in navigator);
  const pinned = want ?? new URLSearchParams(location.search).get("look");
  const hit = pool.find((l) => l[0] === pinned);
  if (hit) return hit;
  let last = -1;
  try {
    last = pool.findIndex((l) => l[0] === localStorage.heroLook);
  } catch {}
  const next = pool[last < 0 ? Math.floor(Math.random() * pool.length) : (last + 1) % pool.length];
  try {
    localStorage.heroLook = next[0];
  } catch {}
  return next;
}

// per-load variation: a look listed here picks each named dial uniformly in [lo, hi];
// any other dial nudges up to 6% of its slider range around the tuned default. Snapped to the dial's step.
const ranges: Record<string, Record<string, [number, number]>> = {
  petalglow: {
    petals: [7, 11],
    size: [0.85, 1.1],
    glow: [0.9, 1.2],
    hue: [0.3, 0.45],
    softness: [1.6, 2.2],
    speed: [0, 0.15],
    x: [0.6, 0.76],
    y: [0.34, 0.46],
  },
};

const vary = (name: string, spec?: Spec) =>
  Object.entries(spec?.dials ?? {}).map(([key, [v, lo, hi, step]]) => {
    // seeds are hand-picked compositions, so they only move when a range asks for it
    const keep = key === "left" || key === "right" || key === "seed";
    const [a, b] = ranges[name]?.[key] ?? (keep ? [v, v] : [v - 0.06 * (hi - lo), v + 0.06 * (hi - lo)]);
    const n = Math.min(hi, Math.max(lo, a + Math.random() * (b - a)));
    return step ? Math.round(n / step) * step : n;
  });

// veil: a paper-coloured radial wash under the copy so the text reads on busy grounds.
// strength 0..1, ellipse width/height and centre y in % of the card, core = % that stays fully veiled; per look, else default. Tune with the dev "Veil" panel, paste back here.
type Wash = { strength: number; width: number; height: number; y: number; core: number };
const veil = (strength: number, width = 55, height = 40, y = 24, core = 30): Wash => ({ strength, width, height, y, core });
const veils: Record<string, Wash> = {
  default: veil(0.45),
  leaves: veil(0.2),
  "leaves edge": veil(0.15, 85, 25, 35, 20),
  "leaves on paper": veil(0.2),
};

function Veil({ wash, show }: { wash: Wash; show?: boolean }) {
  const { strength, width, height, y, core } = wash;
  // show: red instead of paper, so the shape is visible while tuning
  const ink = (a: number) => (show ? `rgba(230,40,40,${Math.max(a, 0.35)})` : `rgba(251,250,247,${a})`);
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: `radial-gradient(${width}% ${height}% at 50% ${y}%, ${ink(strength)} ${core}%, ${ink(0)})` }}
    />
  );
}

/** Dev only: the veil with live dials, one panel per look so each keeps its own values. */
function Tune({ name, wash }: { name: string; wash: Wash }) {
  const v = useDialKit(`Veil ${name}`, {
    strength: [wash.strength, 0, 1, 0.01],
    width: [wash.width, 10, 120, 1],
    height: [wash.height, 10, 120, 1],
    y: [wash.y, 0, 100, 1],
    core: [wash.core, 0, 95, 1],
    show: false,
  });
  return <Veil wash={v} show={v.show} />;
}

const dev = process.env.NODE_ENV === "development";

// layered shadow: [y, blur, spread, alpha] rows, alpha scaled by k
const drop = (k: number, rows: number[][]) =>
  rows.map(([y, b, s, a]) => `0 ${y}px ${b}px ${s}px rgba(20,22,28,${(a * k).toFixed(3)})`).join(", ");
// desktop value at 1280px and up, scaled with the viewport below, never under min(px, 12)
const fluid = (px: number) => `clamp(${Math.min(px, 12)}px, ${px / 12.8}vw, ${px}px)`;

const radius = `min(${card.radius}px, 7vw)`;
const outer = `0 0 0 1px rgba(20,22,28,0.06), ${drop(card.outer, [[1, 1, 0, 0.04], [3, 6, 0, 0.04], [12, 24, -4, 0.06], [32, 64, -12, 0.08], [64, 120, -32, 0.1]])}`;
// rim shade: falls off evenly from every edge, under the terminal
const edge = `inset 0 1px 0 rgba(255,255,255,0.8), inset 0 0 ${inner.spread * inner.softness}px ${-inner.spread * 0.2}px rgba(20,22,28,${(0.07 * inner.strength).toFixed(3)}), inset 0 0 2px rgba(20,22,28,${(0.05 * inner.strength).toFixed(3)})`;
const term = `0 0 0 1px rgba(20,22,28,0.12), ${drop(card.term, [[1, 2, 0, 0.08], [6, 12, -2, 0.1], [20, 40, -8, 0.16], [48, 96, -24, 0.22]])}`;
// terminal width is a max, never wider than the card minus 1rem a side; overlap scales with it
const tw = `min(${card.width}px, 100vw - 4rem)`;
const overlap = `calc(${card.overlap / card.width} * ${tw})`;

function Ground({ look }: { look: Look }) {
  const [name, kind, mode] = look;
  const surface = "absolute inset-0 h-full w-full";
  const [dials] = useState(() => vary(name, { leaves, glass: leaves, light: lights, fx }[kind][mode]));
  if (kind === "glass")
    return (
      <div
        className={`${surface} pointer-events-none mix-blend-multiply`}
        style={{ maskImage: "linear-gradient(90deg, #000 12%, transparent 34% 66%, #000 88%)" }}
      >
        <Leaves mode={mode} dials={dials} paper={flat} className={surface} />
      </div>
    );
  if (kind === "leaves") return <Leaves mode={mode} dials={dials} paper={grain} className={surface} />;
  if (kind === "light") return <Light mode={mode} dials={dials} paper={grain} quiet className={surface} />;
  return <Fx mode={mode} dials={dials} paper={grain} quiet className={surface} />;
}

/** Paper card hero: `children` is the copy, `media` (default: the terminal clip) overlaps the card's bottom edge. Stays light in dark mode. `want` pins a look by name; `onLook` hears which one was chosen; `bare` skips mounting DialRoot (a lab layout already has one). */
export function CardHero({
  children,
  media,
  want,
  bare,
  onLook,
}: {
  children: ReactNode;
  media?: ReactNode;
  want?: string;
  bare?: boolean;
  onLook?: (name: string) => void;
}) {
  // chosen after mount: the static export has no request to pick from, and the card reads as plain paper until then
  const [look, setLook] = useState<Look | null>(null);
  useEffect(() => {
    const next = pick(want);
    setLook(next);
    onLook?.(next[0]);
    // onLook is a listener, not an input: a new function each render must not re-pick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);
  const pad = fluid(card.margin);

  return (
    <div className="light relative pt-3 text-foreground">
      <div style={{ padding: `0 ${pad}` }}>
        {/* flow-root: otherwise the terminal's negative margin collapses through the card and nothing overlaps */}
        <section
          className="relative mx-auto flow-root max-w-6xl"
          style={{ borderRadius: radius, background: "#fbfaf7", boxShadow: outer }}
          data-look={look?.[0]}
        >
          {/* the ground mounts after the look is picked, so it fades up from the plain paper instead of popping in */}
          <div className="absolute inset-0 animate-[fade_1.2s_ease-out_0.15s_both] overflow-hidden" style={{ borderRadius: radius }} aria-hidden key={look?.[0]}>
            {look && <Ground key={look[0]} look={look} />}
            {look && (dev ? <Tune key={`${look[0]} veil`} name={look[0]} wash={veils[look[0]] ?? veils.default} /> : <Veil wash={veils[look[0]] ?? veils.default} />)}
          </div>
          <div className="pointer-events-none absolute inset-0 z-[5]" style={{ borderRadius: radius, boxShadow: edge }} />
          <div className="relative z-10 mx-auto max-w-[800px] px-5 text-center sm:px-8" style={{ paddingTop: fluid(card.padding) }}>
            {children}
          </div>
          <div className="relative z-10 mx-auto" style={{ width: tw, marginTop: card.offset, marginBottom: `calc(-1 * ${overlap})` }}>
            <div className="overflow-hidden rounded-xl" style={{ boxShadow: term }}>
              {media ?? (
                <video
                  src="/media/terminal/light.mp4"
                  poster="/media/terminal/light.png"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="block aspect-[1382/1136] w-full"
                />
              )}
            </div>
          </div>
        </section>
      </div>
      <div style={{ height: overlap }} />
      {dev && !bare && <DialRoot />}
    </div>
  );
}
