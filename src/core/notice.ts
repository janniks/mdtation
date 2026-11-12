/** New comments outside the window: how many, on which side, and what the toast says. Pure. */

/** How many of `lines` sit above line `top` and below line `end` (both still visible). */
export function away(
  lines: readonly number[],
  top: number,
  end: number,
): { above: number; below: number } {
  return {
    above: lines.filter((n) => n < top).length,
    below: lines.filter((n) => n > end).length,
  };
}

/** `↑ 2 new comments above`, or nothing for none. */
export function label(n: number, side: "above" | "below"): string {
  return n ? `${side === "above" ? "↑" : "↓"} ${n} new comment${n === 1 ? "" : "s"} ${side}` : "";
}
