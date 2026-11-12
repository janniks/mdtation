// A parameterized flower: stem, leaves and head drawn as pen paths, then inked by the
// /study/flowers renderer. `sample` draws params from ranges; `art` turns them into SVG.
// Pure and deterministic from the seed, so a garden can import it as is.

import { cubic, hash, pen, random, type Model, type Path, type Point } from "../engine";
import { svg } from "../renderer";

/** Allowed choices for each categorical param. */
export const options = {
  stem: ["straight", "curved", "sbend", "droop", "double"],
  stalk: ["match", "sage", "moss"],
  leaf: ["oval", "lance", "heart", "round", "blade"],
  side: ["alt", "pair", "left", "right"],
  vein: ["none", "rib"],
  head: ["round", "pointed", "teardrop", "daisy", "star", "tulip", "cup", "bud"],
  color: ["rose", "coral", "ochre", "butter", "lilac", "sky", "teal", "plum", "ink"],
} as const;

/** Slider bounds for each numeric param, as [lo, hi, step]. */
export const scales = {
  length: [40, 260, 5],
  bend: [0, 1, 0.05],
  thick: [2, 10, 0.5],
  leaves: [0, 6, 1],
  size: [0.4, 2, 0.05],
  angle: [10, 90, 5],
  petals: [3, 14, 1],
  layers: [1, 3, 1],
  radius: [12, 50, 1],
  width: [0.4, 1.6, 0.05],
  center: [0, 0.6, 0.05],
  face: [0.4, 1, 0.05],
  tilt: [0, 40, 1],
  sway: [0, 8, 0.5],
} as const;

export const ints = ["leaves", "petals", "layers"];

export const palette: Record<string, string> = {
  rose: "#d98a94",
  coral: "#df9274",
  ochre: "#d4a94e",
  butter: "#e2c56a",
  lilac: "#a68bc8",
  sky: "#7ea2c2",
  teal: "#5e9890",
  plum: "#9a6a8c",
  ink: "#3b403d",
  sage: "#8aa383",
  moss: "#6f8a5e",
};

export type Choice = keyof typeof options;
export type Num = keyof typeof scales;
export type Params = { [K in Choice]: (typeof options)[K][number] } & { [K in Num]: number };
export type Ranges = { [K in Choice]: string[] } & { [K in Num]: [number, number] };

/** Defaults tuned in the lab: varied but calm, every flower still reads as a flower. */
export const ranges: Ranges = {
  stem: ["straight", "curved", "sbend", "droop", "double"],
  stalk: ["sage", "moss", "match"],
  leaf: ["oval", "lance", "heart", "blade"],
  side: ["alt", "pair"],
  vein: ["none", "rib"],
  head: ["round", "pointed", "teardrop", "daisy", "tulip", "cup", "bud"],
  color: ["rose", "coral", "ochre", "butter", "lilac", "sky", "teal", "plum"],
  length: [90, 210],
  bend: [0.25, 0.75],
  thick: [4, 6],
  leaves: [0, 3],
  size: [0.8, 1.3],
  angle: [35, 65],
  petals: [5, 9],
  layers: [1, 2],
  radius: [24, 38],
  width: [0.75, 1.15],
  center: [0.15, 0.35],
  face: [0.65, 1],
  tilt: [0, 12],
  sway: [1.5, 4],
};

/** Relative odds per option of a choice; options left out weigh 1. */
export type Weights = Partial<Record<Choice, Record<string, number>>>;

/** Draws one flower's params from the ranges, the same every time for a seed. */
export function sample(r: Ranges, seed: string, w: Weights = {}): Params {
  const rand = random(hash(`params:${seed}`));
  const out: Record<string, string | number> = {};
  for (const k of Object.keys(options) as Choice[]) {
    const list = r[k].length ? r[k] : [options[k][0]];
    const odds = list.map((o) => w[k]?.[o] ?? 1);
    let x = rand() * odds.reduce((a, b) => a + b, 0);
    out[k] = list.find((_, i) => (x -= odds[i]) < 0) ?? list[list.length - 1];
  }
  for (const k of Object.keys(scales) as Num[]) {
    const [lo, hi] = [Math.min(...r[k]), Math.max(...r[k])];
    const v = rand();
    out[k] = ints.includes(k) ? Math.min(hi, Math.floor(lo + v * (hi - lo + 1))) : Math.round((lo + v * (hi - lo)) * 100) / 100;
  }
  return out as Params;
}

const rot = ([x, y]: Point, a: number): Point => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const deg = Math.PI / 180;

/** Catmull-Rom through the points, as cubic curves. */
function spline(points: Point[], closed = false): Path {
  const n = points.length;
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const curves: Path["curves"] = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    curves.push([
      [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6],
      [c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6],
      c,
    ]);
  }
  return { start: points[0], curves, closed };
}

/** A point and unit tangent at t in 0..1 along an open path. */
function along(path: Path, t: number): [Point, Point] {
  const n = path.curves.length;
  const i = Math.min(n - 1, Math.floor(t * n));
  const from = i ? path.curves[i - 1][2] : path.start;
  const u = t * n - i;
  const [p, q] = [cubic(from, path.curves[i], Math.max(0, u - 0.02)), cubic(from, path.curves[i], Math.min(1, u + 0.02))];
  const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  return [cubic(from, path.curves[i], u), [(q[0] - p[0]) / d, (q[1] - p[1]) / d]];
}

const move = (path: Path, f: (p: Point) => Point): Path => ({
  ...path,
  start: f(path.start),
  curves: path.curves.map((c) => c.map(f) as Path["curves"][number]),
});

// Petal outlines as [near, far] control points in petal space: x along 0..1, y across.
const petals: Record<string, [Point, Point, number]> = {
  round: [[0.15, 1], [1, 0.9], 1],
  pointed: [[0.3, 1], [0.75, 0.45], 1],
  teardrop: [[0.05, 0.25], [1.1, 1.2], 1],
  daisy: [[0.2, 0.6], [1, 0.7], 0.45],
};

function petal(ri: number, r: number, w: number, a: number, [c1, c2]: [Point, Point, number]): Path {
  const P = (x: number, y: number): Point => rot([y * w, -(ri + x * (r - ri))], a);
  return {
    start: P(0, -0.2),
    closed: true,
    curves: [
      [P(c1[0], -c1[1]), P(c2[0], -c2[1]), P(1, 0)],
      [P(c2[0], c2[1]), P(c1[0], c1[1]), P(0, 0.2)],
      [P(-0.05, 0.1), P(-0.05, -0.1), P(0, -0.2)],
    ],
  };
}

const ring = (c: number): Path => spline(Array.from({ length: 6 }, (_, i) => rot([0, -c], (i * Math.PI) / 3)), true);

/** Head paths in local space: attached at the origin, growing toward -y. */
function head(p: Params, r: number, rand: () => number): Path[] {
  const jit = (k: number) => (rand() - 0.5) * k;
  const w = r * p.width;
  if (p.head in petals) {
    const shape = petals[p.head];
    const c = Math.max(3, p.center * r);
    const n = Math.round(p.petals * (p.head === "daisy" ? 1.6 : 1));
    const step = (Math.PI * 2) / n;
    const out: Path[] = [];
    for (let k = 0; k < p.layers; k++) {
      const rk = r * (1 - 0.28 * k);
      const half = Math.min(rk * Math.sin(step / 2) * 1.1, rk * 0.5) * p.width * shape[2];
      const phase = (k * step) / 2 + jit(0.3);
      for (let i = 0; i < n; i++) out.push(petal(c * 0.9, rk * (0.92 + rand() * 0.16), half, phase + i * step + jit(0.15), shape));
    }
    if (p.center > 0.05) out.push(ring(c));
    // Radial heads sit on their centre and squash toward the stem when seen at an angle.
    return out.map((path) => move(path, ([x, y]) => [x, (y - c) * p.face]));
  }
  if (p.head === "star") {
    const n = Math.max(4, p.petals);
    const c = r * 0.45 * p.width;
    const pts = Array.from({ length: n * 2 }, (_, i) => rot([0, -(i % 2 ? c : r * (0.92 + rand() * 0.16))], (i * Math.PI) / n));
    const star: Path = { start: pts[0], closed: true, curves: pts.map((q, i) => [q, pts[(i + 1) % pts.length], pts[(i + 1) % pts.length]]) };
    const out = [star, ...(p.center > 0.05 ? [ring(Math.max(3, p.center * r))] : [])];
    return out.map((path) => move(path, ([x, y]) => [x, (y - c) * p.face]));
  }
  const h = r * (p.head === "bud" ? 1.3 : 1.5);
  if (p.head === "tulip")
    return [
      spline(
        [[0, 0], [0.9 * w, -0.25 * h], [0.85 * w, -0.8 * h], [0.55 * w, -h], [0.3 * w, -0.72 * h], [0, -0.95 * h], [-0.3 * w, -0.72 * h], [-0.55 * w, -h], [-0.85 * w, -0.8 * h], [-0.9 * w, -0.25 * h]],
        true,
      ),
      spline([[-0.3 * w, -0.72 * h], [0, -0.45 * h], [0.3 * w, -0.72 * h]]),
    ];
  if (p.head === "cup") {
    const lobes = Math.max(2, Math.min(4, Math.round(p.petals / 2)));
    const rim = Array.from({ length: lobes * 2 + 1 }, (_, k) => [w * (1 - k / lobes), -h * (k % 2 ? 0.86 : 1) + jit(3)] as Point);
    return [spline([[0, 0], [0.8 * w, -0.35 * h], ...rim, [-0.8 * w, -0.35 * h]], true), spline([rim[1], [0, -0.78 * h], rim[rim.length - 2]])];
  }
  const tip: Point = [jit(0.3 * w), -h];
  return [
    spline([[0, 0], [0.5 * w, -0.3 * h], [0.35 * w, -0.75 * h], tip, [-0.35 * w, -0.7 * h], [-0.5 * w, -0.3 * h]], true),
    spline([[0, -0.1 * h], [0.15 * w, -0.5 * h], add(tip, [0, 0.15 * h])]),
    spline([[0, 0], [0.45 * w, -0.08 * h], [0.62 * w, -0.38 * h]]),
    spline([[0, 0], [-0.45 * w, -0.08 * h], [-0.62 * w, -0.38 * h]]),
  ];
}

const leaves: Record<string, Point[]> = {
  oval: [[0, 0], [0.25, 0.22], [0.65, 0.2], [1, 0], [0.65, -0.17], [0.25, -0.18]],
  lance: [[0, 0], [0.3, 0.1], [0.7, 0.08], [1, 0], [0.7, -0.07], [0.3, -0.09]],
  heart: [[0, 0], [0.15, 0.32], [0.5, 0.26], [1, 0], [0.5, -0.24], [0.15, -0.3]],
  round: [[0, 0], [0.2, 0.35], [0.65, 0.38], [1, 0.05], [0.7, -0.3], [0.25, -0.28]],
  blade: [[0, 0], [0.45, 0.1], [1, 0.22], [0.5, 0.02]],
};

/** One leaf from a stem joint, on side s (+1 right, -1 left), its tip bending with gravity. */
function leaf(p: Params, joint: Point, dir: Point, s: number, rand: () => number): Path[] {
  const len = 34 * p.size * (0.85 + rand() * 0.3) * (p.leaf === "blade" ? 1.3 : 1);
  const d = rot(dir, s * p.angle * deg);
  const across: Point = [-d[1], d[0]];
  const at = ([x, y]: Point): Point => add(joint, add(mul(d, x * len), mul(across, (y + 0.12 * s * x * x) * len)));
  const out = [spline(leaves[p.leaf].map(at), true)];
  if (p.vein === "rib" && p.leaf !== "blade") out.push(spline(([[0.08, 0], [0.4, 0.01], [0.72, 0.02]] as Point[]).map(at)));
  return out;
}

/** Stem control points for the stem type, base at the origin, s the lean side. */
function stem(p: Params, s: number): Point[] {
  const [L, b] = [p.length, p.bend];
  const x = (k: number) => s * b * L * k;
  if (p.stem === "straight") return [[0, 0], [x(0.04), -0.5 * L], [x(0.08), -L]];
  if (p.stem === "sbend") return [[0, 0], [x(0.14), -0.33 * L], [x(-0.12), -0.66 * L], [x(0.04), -L]];
  if (p.stem === "droop") {
    const k = 0.5 + b / 2;
    return [[0, 0], [s * 0.05 * L, -0.5 * L], [s * 0.18 * L * k, -0.85 * L], [s * 0.35 * L * k, -0.92 * L], [s * 0.42 * L * k, -0.92 * L + 0.05 * L * k]];
  }
  return [[0, 0], [x(0.05), -0.5 * L], [x(0.22), -0.95 * L]];
}

/** Paths for one flower, split into the green stalk and the coloured heads. */
export function draw(p: Params, seed: string): { stalk: Path[]; bloom: Path[] } {
  const rand = random(hash(`shape:${seed}`));
  const s = rand() < 0.5 ? -1 : 1;
  const main = spline(stem(p, s));
  const stalk = [main];
  const bloom: Path[] = [];
  const tilt = (rand() < 0.5 ? -1 : 1) * p.tilt * deg;
  const crown = (path: Path, r: number) => {
    const [top, dir] = along(path, 1);
    const a = Math.atan2(dir[0], -dir[1]) + tilt;
    bloom.push(...head(p, r, rand).map((h) => move(h, (q) => add(top, rot(q, a)))));
  };
  crown(main, p.radius);
  if (p.stem === "double") {
    const [joint, dir] = along(main, 0.5 + rand() * 0.1);
    const len = p.length * 0.5;
    const branch = spline([joint, add(joint, mul(rot(dir, -s * 60 * deg), len * 0.45)), add(joint, mul(rot(dir, -s * 35 * deg), len))]);
    stalk.push(branch);
    crown(branch, p.radius * 0.65);
  }
  const n = p.leaves;
  const pairs = p.side === "pair";
  const slots = pairs ? Math.ceil(n / 2) : n;
  for (let i = 0; i < slots; i++) {
    const [joint, dir] = along(main, 0.12 + (0.5 * (i + 0.5)) / slots + (rand() - 0.5) * 0.06);
    const sides = pairs ? (i * 2 + 1 < n ? [1, -1] : [s]) : [p.side === "left" ? -1 : p.side === "right" ? 1 : (i % 2 ? -s : s)];
    for (const side of sides) stalk.push(...leaf(p, joint, dir, side, rand));
  }
  return { stalk, bloom };
}

const model = (paths: Path[], color: string, width: number, seed: string): Model => ({
  seed,
  color,
  width,
  paths,
  bounds: [0, 0, 0, 0],
  material: { seed: hash(seed), phase: random(hash(seed))() * Math.PI * 2, pen },
});

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The flower as an SVG string, `scale` px per drawing unit, its stem base on the
 * bottom edge so a row of them shares one ground line.
 */
export function art(p: Params, seed: string, scale = 0.5): { html: string; width: number; height: number } {
  const { stalk, bloom } = draw(p, seed);
  const pts = [...stalk, ...bloom].flatMap((path) => [path.start, ...path.curves.flat()]);
  const pad = p.thick + 4;
  const [x0, x1] = [Math.min(...pts.map((q) => q[0])) - pad, Math.max(...pts.map((q) => q[0])) + pad];
  const [y0, y1] = [Math.min(...pts.map((q) => q[1])) - pad, Math.max(0, ...pts.map((q) => q[1])) + pad];
  const ink = palette[p.color];
  const g = (m: Model) => svg(m, { background: "transparent" }).match(/<g[\s\S]*<\/g>/)?.[0] ?? "";
  const [width, height] = [r1((x1 - x0) * scale), r1((y1 - y0) * scale)];
  return {
    width,
    height,
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${r1(x0)} ${r1(y0)} ${r1(x1 - x0)} ${r1(y1 - y0)}" aria-hidden="true">${g(
      model(stalk, p.stalk === "match" ? ink : palette[p.stalk], p.thick, `stalk:${seed}`),
    )}${g(model(bloom, ink, p.thick, `bloom:${seed}`))}</svg>`,
  };
}
