/** Fuzzy match in the Sublime way: the typed letters appear in `text` in order, not side by side. Pure. */

export interface Hit {
  /** Higher is better: letters in a row, word starts, an early start, a short text. */
  readonly score: number;
  /** Index in `text` of each matched letter. */
  readonly at: readonly number[];
}

/** Whether `i` starts a word. */
const edge = (t: string, i: number) => i === 0 || !/[a-z0-9]/.test(t[i - 1]!);

/** Where letter `ch` goes after index `last`: the very next one, else a word start, else the first found. */
function next(t: string, ch: string, last: number): number {
  if (t[last + 1] === ch) return last + 1;
  const first = t.indexOf(ch, last + 1);
  for (let i = first; i >= 0; i = t.indexOf(ch, i + 1)) if (edge(t, i)) return i;
  return first;
}

/** Best match of `query` in `text`, or null. Case and spaces in the query are ignored. */
export function score(query: string, text: string): Hit | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = text.toLowerCase();
  if (!q) return { score: 0, at: [] };
  let best: Hit | null = null;
  for (let s = t.indexOf(q[0]!); s >= 0; s = t.indexOf(q[0]!, s + 1)) {
    const at = [s];
    let n = (edge(t, s) ? 3 : 0) - s * 0.1 - t.length * 0.01;
    for (let k = 1; k < q.length && at.length === k; k++) {
      const i = next(t, q[k]!, at[k - 1]!);
      if (i < 0) break;
      n += i === at[k - 1]! + 1 ? 5 : edge(t, i) ? 3 : 0;
      at.push(i);
    }
    if (at.length === q.length && (!best || n > best.score)) best = { score: n, at };
  }
  return best;
}
