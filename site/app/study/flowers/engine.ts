export const colors = {
  rose: "#d26679",
  orange: "#da6e40",
  ochre: "#d7a02b",
  teal: "#417d7c",
  violet: "#874ac3",
} as const;

export const forms = ["classic", "radial", "rings", "star", "frill", "daisy", "bell", "bud", "multi"] as const;

export type Color = keyof typeof colors;
export type Center = "open" | "ring" | "spiral";
export type Form = (typeof forms)[number];
export type Point = [number, number];
export type Curve = [Point, Point, Point];
export type Path = { start: Point; curves: Curve[]; closed?: boolean };
/** One pen for every flower: shape varies, the ink does not. Tapers are in drawing units. */
export type Pen = {
  pressure: boolean;
  min: number;
  max: number;
  thinning: number;
  entry: number;
  exit: number;
  streamline: number;
  smoothing: number;
  wobble: number;
};
export type Shape = {
  length: number;
  breadth: number;
  curl: number;
  overlap: number;
  core: number;
  spread: number;
  stem: boolean;
  leaf: boolean;
  bend: number;
};
export type Options = Partial<Pen & Shape> & {
  seed: string | number;
  color?: Color;
  weight?: number;
  size?: number;
  petals?: number;
  center?: Center;
  form?: Form | "mix";
  density?: number;
};
export type Model = {
  seed: string;
  color: string;
  width: number;
  paths: Path[];
  bounds: [number, number, number, number];
  material: { seed: number; phase: number; pen: Pen };
};

export const pen: Pen = {
  pressure: true,
  min: 0.8,
  max: 1.2,
  thinning: 0.4,
  entry: 0,
  exit: 0,
  streamline: 0.3,
  smoothing: 0.5,
  wobble: 0.6,
};
export const shape: Shape = {
  length: 1,
  breadth: 1,
  curl: 0,
  overlap: 0.4,
  core: 1,
  spread: 1,
  stem: true,
  leaf: true,
  bend: 1,
};

export function cubic(from: Point, [a, b, end]: Curve, t: number): Point {
  const u = 1 - t;
  return [0, 1].map(
    (k) => u * u * u * from[k] + 3 * u * u * t * a[k] + 3 * u * t * t * b[k] + t * t * t * end[k],
  ) as Point;
}

const polar = (r: number, a: number): Point => [Math.cos(a) * r, Math.sin(a) * r];

/** Catmull-Rom through the points, as cubic curves. A closed spline ends on its start. */
function spline(points: Point[], closed = false): Path {
  const n = points.length;
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const curves: Curve[] = [];
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

export function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

export function random(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function flower(opts: Options): Model {
  const seed = String(opts.seed);
  const rand = random(hash(`geometry:${seed}`));
  const jitter = (amount: number) => (rand() - 0.5) * amount;
  const { length, breadth, curl, overlap, core, spread, stem, leaf, bend } = { ...shape, ...opts };
  const count = Math.max(
    3,
    Math.min(12, Math.round(Number.isFinite(opts.petals) ? opts.petals! : 5)),
  );
  const form = opts.form === "mix" ? forms[hash(`form:${seed}`) % forms.length] : (opts.form ?? "classic");
  const reach = 64 * length;
  const step = (Math.PI * 2) / count;

  // A whorl of separate petal loops, with a gap at the bottom for the stem.
  function whorl(inner: number, size: number, phase: number): Path[] {
    return Array.from({ length: count }, (_, i) => {
      const a = phase + Math.PI / 2 + (i + 0.5) * step + jitter(0.3 * spread);
      const d = (step / 2) * breadth * (0.6 + overlap);
      const r = size * (0.9 + rand() * 0.2);
      const turn = (k: number) => a + curl * 0.7 * k * k;
      return spline(
        [
          polar(inner, a - d * 0.35),
          polar(r * 0.55, turn(0.55) - d),
          polar(r, turn(1)),
          polar(r * 0.55, turn(0.55) + d),
          polar(inner, a + d * 0.35),
        ],
        true,
      );
    });
  }

  // Head paths are drawn around the origin. Roots are where stems attach.
  let head: Path[] = [];
  let roots: Point[] = [];
  if (form === "classic") {
    // The five-lobe template follows the reference's long upper petal,
    // broad shoulders, and two unequal lower lobes. It is deliberately not radial.
    const valleys: Point[] =
      count === 5
        ? [
            [7, 24],
            [-31, 15],
            [-24, -26],
            [20, -27],
            [38, 15],
          ]
        : Array.from({ length: count }, (_, i) => polar(30, Math.PI / 2 + i * step));
    const tips: Point[] =
      count === 5
        ? [
            [-35, 54],
            [-70, -7],
            [3, -67],
            [68, -17],
            [42, 43],
          ]
        : Array.from({ length: count }, (_, i) => polar(66, Math.PI / 2 + (i + 0.5) * step));
    valleys.forEach((p) => {
      p[0] += jitter(5 * spread);
      p[1] += jitter(5 * spread);
    });
    tips.forEach((p, i) => {
      const twist = polar(Math.hypot(...p) * length, Math.atan2(p[1], p[0]) + curl * 0.35);
      tips[i] = [twist[0] + jitter(13 * spread), twist[1] + jitter(13 * spread)];
    });
    const tangent = (p: Point): Point => {
      const size = Math.hypot(...p);
      return [-p[1] / size, p[0] / size];
    };
    const offset = (p: Point, d: Point, amount: number): Point => [p[0] + d[0] * amount, p[1] + d[1] * amount];
    const bloom: Path = { start: valleys[0], curves: [], closed: true };
    for (let i = 0; i < count; i++) {
      const a = valleys[i];
      const b = valleys[(i + 1) % count];
      const tip = tips[i];
      const shoulder = ((count === 5 ? 20 : 95 / count) + jitter(6)) * breadth;
      bloom.curves.push(
        [offset(a, tangent(a), 5.5), offset(tip, tangent(tip), -shoulder), tip],
        [offset(tip, tangent(tip), shoulder), offset(b, tangent(b), -5.5), b],
      );
    }
    head = [bloom];
    roots = [bloom.start];
  } else if (form === "radial") {
    head = whorl(7 * core, reach, 0);
    roots = [[0, 7 * core]];
  } else if (form === "rings") {
    head = [...whorl(8 * core, reach, 0), ...whorl(5 * core, reach * 0.58, step / 2)];
    roots = [[0, 8 * core]];
  } else if (form === "star" || form === "frill") {
    // One closed outline: sharp tips for the star, a rippled rim for the frill.
    const valley = reach * Math.min(0.7, 0.34 * breadth);
    if (form === "star") {
      const tips = Array.from({ length: count }, (_, i) => -Math.PI / 2 + i * step + jitter(0.2 * spread));
      const start = polar(valley, tips[count - 1] + step / 2 - Math.PI * 2);
      const star: Path = { start, curves: [], closed: true };
      tips.forEach((a, i) => {
        const before = (i ? tips[i - 1] : tips[count - 1] - Math.PI * 2) + step / 2;
        const after = a + step / 2;
        const tip = polar(reach * (0.92 + rand() * 0.16), a + curl * 0.4);
        const out = (from: number, to: number) => polar((valley + reach) / 2, from * 0.35 + to * 0.65);
        star.curves.push(
          [out(before, a), tip, tip],
          [tip, out(after, a), i === count - 1 ? start : polar(valley, after)],
        );
      });
      head = [star];
    } else {
      const points = Array.from({ length: count * 8 }, (_, k) => {
        const u = (k % 8) / 8;
        const swell = Math.sin(Math.PI * u);
        const r = valley + (reach - valley) * swell ** 0.8 + reach * 0.06 * Math.sin(u * Math.PI * 6) * swell;
        return polar(r + jitter(3 * spread), Math.PI / 2 + (k / 8) * step + curl * 0.3 * swell);
      });
      head = [spline(points, true)];
    }
    roots = [[0, valley]];
  } else if (form === "daisy") {
    // A single looping stroke: lobes cross near the middle like a quick doodle.
    const inner = reach * (0.28 - 0.18 * overlap) * breadth;
    const points = Array.from({ length: count * 10 }, (_, k) => {
      const t = (k / (count * 10)) * Math.PI * 2;
      const a = polar((reach + inner) / 2, t + Math.PI / 2);
      const b = polar((reach - inner) / 2, (1 - count) * t + Math.PI / 2 + curl);
      return [a[0] + b[0] + jitter(2.5 * spread), a[1] + b[1] + jitter(2.5 * spread)] as Point;
    });
    head = [spline(points, true)];
    roots = [[0, reach * 0.2]];
  } else if (form === "bell") {
    // A cupped side view, its rim lobed by the petal count.
    const width = reach * 0.6 * breadth;
    const depth = reach * 0.8;
    const lobes = Math.min(count, 7);
    const rim = Array.from({ length: lobes * 2 - 1 }, (_, k) => {
      const x = width * (1 - k / (lobes - 1));
      const flare = k === 0 || k === lobes * 2 - 2 ? 1 + curl * 0.3 : 1;
      return [x * flare + jitter(4 * spread), (k % 2 ? -0.15 : -0.42 - curl * 0.1) * depth + jitter(5 * spread)] as Point;
    });
    const bottom: Point = [0, depth * 0.6];
    head = [
      spline([bottom, [width * 0.75, depth * 0.25], ...rim, [-width * 0.75, depth * 0.25]], true),
      spline([
        [rim[rim.length - 1][0] + 7, rim[rim.length - 1][1] + 8],
        [0, -depth * 0.05],
        [rim[0][0] - 7, rim[0][1] + 8],
      ]),
    ];
    roots = [bottom];
  } else if (form === "bud") {
    const width = reach * 0.34 * breadth;
    const depth = reach * 0.9;
    const bottom: Point = [0, depth * 0.35];
    const tip: Point = [curl * 12 + jitter(6 * spread), -depth * 0.7];
    head = [
      spline(
        [bottom, [width, depth * 0.05], [width * 0.7, -depth * 0.35], tip, [-width * 0.75, -depth * 0.3], [-width, depth * 0.05]],
        true,
      ),
      spline([bottom, [width * 0.3, -depth * 0.1], [tip[0] + 3, tip[1] + depth * 0.12]]),
      spline([bottom, [-width * 0.9, depth * 0.15], [-width * 1.2, -depth * 0.12]]),
      spline([bottom, [width * 0.9, depth * 0.15], [width * 1.2, -depth * 0.12]]),
    ];
    roots = [bottom];
  } else {
    // Several small heads on one stem.
    const heads: Point[] = [
      [-40 + jitter(8 * spread), -22 + jitter(8 * spread)],
      [38 + jitter(8 * spread), -34 + jitter(8 * spread)],
      [2 + jitter(8 * spread), 28 + jitter(6 * spread)],
    ];
    head = heads.flatMap(([x, y]) =>
      whorl(4 * core, reach * 0.42, 0).map((path) => {
        const move = (p: Point): Point => [p[0] + x, p[1] + y];
        return { ...path, start: move(path.start), curves: path.curves.map((c) => c.map(move) as Curve) };
      }),
    );
    roots = heads.map(([x, y]) => [x, y + 4 * core] as Point);
  }

  const lean = jitter(0.22 * spread);
  const stretch = 0.96 + rand() * 0.08;
  // Transform all points once, so shared junctions remain exactly attached.
  function point(p: Point): Point {
    return [
      120 + p[0] * Math.cos(lean) - p[1] * Math.sin(lean),
      94 + (p[0] * Math.sin(lean) + p[1] * Math.cos(lean)) * stretch,
    ];
  }
  const paths: Path[] = head.map((path) => ({
    ...path,
    start: point(path.start),
    curves: path.curves.map((curve) => curve.map(point) as Curve),
  }));
  if (stem) {
    const base: Point = [
      roots.length > 1 ? 120 + jitter(10) : point(roots[0])[0] + 8 + jitter(15),
      226 + jitter(5),
    ];
    const stems = roots.map((root): Path => {
      const start = point(root);
      return {
        start,
        curves: [
          [
            [start[0] - 8 * bend + jitter(6), start[1] + (base[1] - start[1]) * 0.32],
            [base[0] - 13 * bend + jitter(6), start[1] + (base[1] - start[1]) * 0.78],
            base,
          ],
        ],
      };
    });
    paths.push(...stems);
    if (leaf) {
      const main = stems[stems.length - 1];
      const joint = cubic(main.start, main.curves[0], 0.81 + rand() * 0.04);
      const tip: Point = [joint[0] + 46 + jitter(10), joint[1] - 30 + jitter(7)];
      paths.push({
        start: joint,
        closed: true,
        curves: [
          [[joint[0] + 6, joint[1] - 18], [tip[0] - 7, tip[1] - 6], tip],
          [[tip[0] + 5, tip[1] + 7], [joint[0] + 22, joint[1] + 2], joint],
        ],
      });
    }
  }
  const center = ["bell", "bud", "multi"].includes(form) ? "open" : (opts.center ?? "open");
  const cx = 120 + jitter(6);
  const cy = 94 + jitter(5);
  if (center === "ring") {
    const rx = (10.5 + rand() * 2) * core;
    const ry = (10 + rand() * 2) * core;
    paths.push({
      start: [cx + rx, cy],
      closed: true,
      curves: [
        [
          [cx + rx + 1, cy + ry * 0.65],
          [cx + rx * 0.5, cy + ry],
          [cx, cy + ry],
        ],
        [
          [cx - rx * 0.65, cy + ry],
          [cx - rx, cy + ry * 0.5],
          [cx - rx, cy],
        ],
        [
          [cx - rx, cy - ry * 0.6],
          [cx - rx * 0.4, cy - ry],
          [cx, cy - ry],
        ],
        [
          [cx + rx * 0.65, cy - ry],
          [cx + rx, cy - ry * 0.5],
          [cx + rx, cy],
        ],
      ],
    });
  } else if (center === "spiral") {
    // A short inward continuation, with an open counter even at broad weight.
    const at = (x: number, y: number): Point => [cx + x * core, cy + y * core];
    paths.push({
      start: form === "classic" ? paths[0].start : at(6, 24),
      curves: [
        [at(1, 23), at(-23, 13), at(-19, -2)],
        [at(-16, -20), at(9, -20), at(12, -6)],
        [at(16, 8), at(-4, 12), at(-5, 1)],
      ],
    });
  }
  // Reserve a fixed geometric envelope independent of color, weight, or pen.
  const points = paths.flatMap((path) => [path.start, ...path.curves.flat()]);
  const minx = Math.min(...points.map((p) => p[0]));
  const maxx = Math.max(...points.map((p) => p[0]));
  const miny = Math.min(...points.map((p) => p[1]));
  const maxy = Math.max(...points.map((p) => p[1]));
  const scale = Math.min(1, 208 / (maxx - minx), 208 / (maxy - miny));
  function fit(p: Point): Point {
    return [
      Math.round((128 + (p[0] - (minx + maxx) / 2) * scale) * 1000) / 1000,
      Math.round((128 + (p[1] - (miny + maxy) / 2) * scale) * 1000) / 1000,
    ];
  }
  const material = random(hash(`material:${seed}`));
  return {
    seed,
    color: colors[opts.color ?? "rose"] ?? colors.rose,
    width:
      [2.8, 4.5, 6.6, 9.1, 12.2][
        Math.max(0, Math.min(4, Math.round(Number.isFinite(opts.weight) ? opts.weight! : 3) - 1))
      ] * (opts.size ?? 1),
    paths: paths.map((path) => ({
      ...path,
      start: fit(path.start),
      curves: path.curves.map((curve) => curve.map(fit) as Curve),
    })),
    bounds: [
      128 - ((maxx - minx) * scale) / 2,
      128 - ((maxy - miny) * scale) / 2,
      128 + ((maxx - minx) * scale) / 2,
      128 + ((maxy - miny) * scale) / 2,
    ],
    material: {
      seed: hash(`material:${seed}`),
      phase: material() * Math.PI * 2,
      pen: Object.fromEntries(
        Object.entries(pen).map(([key, value]) => [key, opts[key as keyof Pen] ?? value]),
      ) as Pen,
    },
  };
}

/** A square sheet: inks cycle across, one pen throughout, the shape varies by seed. */
export function sheet(opts: Options): Model[] {
  const side = Math.max(1, Math.round(opts.density ?? 5));
  return Array.from({ length: side * side }, (_, i) =>
    flower({ ...opts, seed: `${opts.seed}.${i + 1}`, color: Object.keys(colors)[i % 5] as Color }),
  );
}
