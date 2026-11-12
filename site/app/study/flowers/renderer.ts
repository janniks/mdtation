import { getStroke } from "perfect-freehand";
import { cubic, type Model, type Path, type Point } from "./engine";

export type Output = { size?: number; background?: "paper" | "transparent" };
const paper = "#fcfbf8";
const number = (value: number) => Math.round(value * 100) / 100;
const pair = (p: number[]) => `${number(p[0])} ${number(p[1])}`;

/**
 * One pen stroke as a filled outline. Self-crossing strokes overlap with the
 * same winding, so the nonzero fill keeps every overlap solid.
 */
function stroke(path: Path, model: Model, index: number): string {
  const pen = model.material.pen;
  const points: Point[] = [path.start];
  let from = path.start;
  for (const curve of path.curves) {
    for (let i = 1; i <= 24; i++) points.push(cubic(from, curve, i / 24));
    from = curve[2];
  }
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(
      lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]),
    );
  const total = lengths[lengths.length - 1] || 1;
  const phase = model.material.phase + index * 0.7;
  // Whole cycles per stroke, so closed loops meet themselves without a step.
  const cycles = Math.max(1, Math.round(total / 90));
  const drawn = points.map((p, i) => {
    const t = lengths[i] / total;
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const size = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const shift =
      pen.wobble *
      (0.6 * Math.sin(Math.PI * 2 * t * cycles + phase) +
        0.4 * Math.sin(Math.PI * 2 * t * (cycles * 2 + 1) + phase * 1.7));
    return [
      p[0] - ((b[1] - a[1]) / size) * shift,
      p[1] + ((b[0] - a[0]) / size) * shift,
      0.5 + 0.35 * Math.sin(t * Math.PI * 2 + phase) + 0.15 * Math.sin(t * Math.PI * 4 + phase * 0.7),
    ];
  });
  // A closed loop runs a little past its start, the way a hand closes one.
  if (path.closed) drawn.push(...drawn.slice(1, Math.ceil(drawn.length * 0.06)));
  const outline = getStroke(drawn, {
    size: model.width,
    thinning: pen.thinning,
    smoothing: pen.smoothing,
    streamline: pen.streamline,
    simulatePressure: pen.pressure,
    easing: (t) => (pen.min + (pen.max - pen.min) * t) / 2,
    start: { taper: pen.entry, cap: true },
    end: { taper: pen.exit, cap: true },
    last: true,
  });
  if (outline.length < 3) return "";
  return `M${pair(outline[0])}Q${outline
    .map((p, i) => {
      const q = outline[(i + 1) % outline.length];
      return `${pair(p)} ${pair([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])}`;
    })
    .join(" ")}Z`;
}

const marks = (model: Model) =>
  model.paths.map((path, index) => stroke(path, model, index)).filter(Boolean);

function composition(model: Model | Model[]) {
  const models = Array.isArray(model) ? model : [model];
  const columns = Math.ceil(Math.sqrt(models.length));
  return { models, columns, extent: columns * 256 };
}

export function svg(model: Model | Model[], opts: Output = {}): string {
  const { models, columns, extent } = composition(model);
  const size = Math.max(64, Math.min(4096, Math.round(opts.size || extent * 2)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${extent} ${extent}" role="img" aria-label="Hand-drawn flower illustration"><title>Flower illustration</title>${opts.background !== "transparent" ? `<path fill="${paper}" d="M0 0H${extent}V${extent}H0Z"/>` : ""}${models
    .map(
      (item, index) =>
        `<g transform="translate(${(index % columns) * 256} ${Math.floor(index / columns) * 256})" fill="${item.color}">${marks(
          item,
        )
          .map((d) => `<path d="${d}"/>`)
          .join("")}</g>`,
    )
    .join("")}</svg>`;
}

export function paint(canvas: HTMLCanvasElement, model: Model | Model[], opts: Output = {}): void {
  const { models, columns, extent } = composition(model);
  const size = Math.max(64, Math.min(4096, Math.round(opts.size || extent * 2)));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas drawing is unavailable in this browser.");
  ctx.clearRect(0, 0, size, size);
  if (opts.background !== "transparent") {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.scale(size / extent, size / extent);
  models.forEach((item, index) => {
    ctx.save();
    ctx.translate((index % columns) * 256, Math.floor(index / columns) * 256);
    ctx.fillStyle = item.color;
    marks(item).forEach((d) => ctx.fill(new Path2D(d), "nonzero"));
    ctx.restore();
  });
}
