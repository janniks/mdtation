/** Where did each line go when the text was rewritten? Pure: no terminal or I/O here. */

export interface Spot {
  /** 0-based line in the new text. Always a real line; a neighbour when `sure` is 0. */
  readonly to: number;
  /** 1 = the same line, 0.6 to 1 = reworded (its likeness), 0.5 = replaced in place, 0 = gone. */
  readonly sure: number;
}

/** Likeness under this is noise; 0.6 came out of the golden corpus. */
const MIN = 0.6;
/** How many free lines either side a leftover line is compared with; bounds a whole-file rewrite. */
const REACH = 100;

/** A line without what agents churn: case, spacing, list, quote and checkbox marks. */
const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/^(>\s*)+/, "")
    .replace(/^([-*+]|\d+[.)])\s+(\[[ x]\]\s+)?/, "")
    .replace(/\s+/g, " ");

const grams = (s: string) => {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
};

/** Dice likeness of two gram sets, 0 to 1. */
const like = (a: Set<string>, b: Set<string>) => {
  let hit = 0;
  for (const g of a) if (b.has(g)) hit++;
  return (2 * hit) / (a.size + b.size || 1);
};

/** One Spot per line of `old`: where it is in `next`, and how sure. */
export function track(old: readonly string[], next: readonly string[]): Spot[] {
  const a = old.map(norm);
  const b = next.map(norm);
  const to = a.map(() => -1);
  const from = b.map(() => -1);
  const sure = a.map(() => 0);
  const link = (i: number, j: number, s: number) => {
    to[i] = j;
    from[j] = i;
    sure[i] = s;
  };
  const free = (i: number, j: number) => to[i] === -1 && from[j] === -1;

  // 1. A line that occurs once on each side is the same line, wherever it moved.
  const seen = new Map<string, number[]>();
  const count = (s: string, i: number, k: number) => {
    const x = seen.get(s) ?? [0, 0, 0, 0];
    x[k]!++;
    x[k + 1] = i;
    seen.set(s, x);
  };
  a.forEach((s, i) => count(s, i, 0));
  b.forEach((s, j) => count(s, j, 2));
  for (const [s, x] of seen) if (s && x[0] === 1 && x[2] === 1) link(x[1]!, x[3]!, 1);

  // 2. Grow each pair down, then up, over equal neighbours (blank lines, rules, repeats). The file edges count as pairs.
  for (let i = 0; i < a.length; i++) {
    const j = i ? to[i - 1]! + 1 : 0;
    if ((!i || j > 0) && j < b.length && free(i, j) && a[i] === b[j]) link(i, j, 1);
  }
  for (let i = a.length - 1; i >= 0; i--) {
    const j = i < a.length - 1 ? to[i + 1]! - 1 : b.length - 1;
    if (j >= 0 && free(i, j) && a[i] === b[j]) link(i, j, 1);
  }

  // 3. Leftover lines pair best first by likeness.
  const ga = a.map(grams);
  const gb = b.map(grams);
  const rest = b.flatMap((s, j) => (s && from[j] === -1 ? [j] : []));
  const left = a.flatMap((s, i) => (s && to[i] === -1 ? [i] : []));
  const cand: number[][] = [];
  left.forEach((i, x) => {
    const mid = Math.round((x * rest.length) / left.length);
    for (const j of rest.slice(Math.max(0, mid - REACH), mid + REACH)) {
      const s = like(ga[i]!, gb[j]!);
      if (s > MIN) cand.push([s, i, j]);
    }
  });
  cand.sort((x, y) => y[0]! - x[0]!);
  for (const [s, i, j] of cand) if (free(i!, j!)) link(i!, j!, s!);

  // 4. What is left is gone. Its hole is the gap between where its neighbours went: lines pair off with
  // the free lines there in order, from a heading on counted from the bottom (a heading hangs off what follows).
  // An empty hole leaves the neighbour in the same block: the line above, or the line below at a block start.
  const spot = a.map(() => 0);
  for (let s = 0; s < a.length; s++) {
    if (to[s]! >= 0) continue;
    let e = s;
    while (e + 1 < a.length && to[e + 1]! < 0) e++;
    const lo = s ? to[s - 1]! : -1;
    const hi = e + 1 < a.length ? to[e + 1]! : b.length;
    const news: number[] = [];
    for (let j = lo + 1; j < hi; j++) if (b[j] && from[j] === -1) news.push(j);
    const olds: number[] = [];
    for (let k = s; k <= e; k++) if (a[k]) olds.push(k);
    const cut = olds.findIndex((k) => a[k]!.startsWith("#"));
    const edge = s && a[s - 1] ? lo : hi;
    for (let k = s; k <= e; k++) spot[k] = hi - lo > 1 ? Math.min(lo + 1 + k - s, hi - 1) : edge;
    olds.forEach((k, x) => {
      const y =
        cut < 0 || x < cut
          ? Math.min(x, news.length - 1)
          : Math.max(news.length - olds.length + x, 0);
      spot[k] = news.length ? news[y]! : edge;
      if (news.length === olds.length) sure[k] = 0.5;
    });
    s = e;
  }
  return a.map((_, i) => ({
    to: to[i]! < 0 ? Math.max(0, Math.min(spot[i]!, b.length - 1)) : to[i]!,
    sure: sure[i]!,
  }));
}
