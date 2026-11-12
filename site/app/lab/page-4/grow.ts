// Flowers that draw themselves in: each pen stroke of a ranges-generator flower is revealed by a
// mask whose centre line strokes on (pathLength 1, dash offset 1 to 0). Stem from the ground up,
// leaves from their base one side after the other, petals one after another, then the centre pops.
// Timing lives in --t (delay) and --l (length) per part; garden.css runs it once `.sprout` is [data-on].

import { hash, pen, random, type Model, type Path } from "../../study/flowers/engine";
import { svg } from "../../study/flowers/renderer";
import { draw, palette, type Params } from "../../study/flowers/ranges/flower";

const f = (n: number) => Math.round(n * 10) / 10;
const line = (q: Path) => `M${q.start.map(f)}${q.curves.map((c) => `C${c.flat().map(f)}`).join("")}`;

const model = (paths: Path[], color: string, width: number, seed: string): Model => ({
  seed,
  color,
  width,
  paths,
  bounds: [0, 0, 0, 0],
  material: { seed: hash(seed), phase: random(hash(seed))() * Math.PI * 2, pen },
});

/** The pen outlines the renderer draws, one `d` per path. */
const outlines = (m: Model) => [...svg(m, { background: "transparent" }).matchAll(/<path d="([^"]+)"/g)].map((x) => x[1]);

type Part = { path: Path; d: string; t: number; l: number; pop?: boolean };

/**
 * A flower as an SVG string, `scale` px per drawing unit (or `size` px tall), with draw-on parts.
 * `stems: false` keeps just the head. `uid` keeps mask ids unique on the page.
 */
export function grow(p: Params, seed: string, o: { uid: string; stems: boolean; scale?: number; size?: number }) {
  const { stalk, bloom } = draw(p, seed);
  const ink = palette[p.color];
  const parts: { color: string; list: Part[] }[] = [];
  let at = 0;
  if (o.stems) {
    const d = outlines(model(stalk, p.stalk === "match" ? ink : palette[p.stalk], p.thick, `stalk:${seed}`));
    const trunks = p.stem === "double" ? 2 : 1;
    parts.push({
      color: p.stalk === "match" ? ink : palette[p.stalk],
      list: stalk.map((path, i) =>
        i < trunks ? { path, d: d[i], t: i * 0.45, l: 0.9 } : { path, d: d[i], t: 0.55 + (i - trunks) * 0.16, l: 0.5 },
      ),
    });
    at = 0.85;
  }
  const d = outlines(model(bloom, ink, p.thick, `bloom:${seed}`));
  // the centre ring is the last, small path of a radial head
  const size = (q: Path) => Math.max(...[q.start, ...q.curves.flat()].map(([x]) => x)) - Math.min(...[q.start, ...q.curves.flat()].map(([x]) => x));
  const centre = bloom.length > 1 && size(bloom[bloom.length - 1]) < p.radius * 0.9;
  parts.push({
    color: ink,
    list: bloom.map((path, i) =>
      centre && i === bloom.length - 1 ? { path, d: d[i], t: at + i * 0.09 + 0.2, l: 0.35, pop: true } : { path, d: d[i], t: at + i * 0.09, l: 0.45 },
    ),
  });

  const all = parts.flatMap((g) => g.list).filter((x) => x.d);
  const pts = all.flatMap((x) => [x.path.start, ...x.path.curves.flat()]);
  const pad = p.thick + 4;
  const [x0, y0] = [Math.min(...pts.map((q) => q[0])) - pad, Math.min(...pts.map((q) => q[1])) - pad];
  const x1 = Math.max(...pts.map((q) => q[0])) + pad;
  const y1 = o.stems ? Math.max(0, ...pts.map((q) => q[1])) + pad : Math.max(...pts.map((q) => q[1])) + pad;
  const [w, h] = [x1 - x0, y1 - y0];
  const k = o.size ? o.size / h : (o.scale ?? 0.5);
  const reach = f(p.thick * 2.4 + 6);
  let n = 0;
  const body = parts
    .map(
      (g) =>
        `<g fill="${g.color}">${g.list
          .filter((x) => x.d)
          .map((x) => {
            const style = `--t:${f(x.t * 10) / 10}s;--l:${x.l}s`;
            if (x.pop) return `<path class="pop" style="${style}" d="${x.d}"/>`;
            const id = `${o.uid}-${n++}`;
            return `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}"><path class="draw" style="${style}" d="${line(x.path)}" pathLength="1" fill="none" stroke="#fff" stroke-width="${reach}" stroke-linecap="round" stroke-linejoin="round"/></mask><path mask="url(#${id})" d="${x.d}"/>`;
          })
          .join("")}</g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w * k)}" height="${f(h * k)}" viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}" aria-hidden="true">${body}</svg>`;
}
