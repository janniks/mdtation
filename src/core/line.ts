/** Parse a source line number into a clamped zero-based index. */
export function parse(text: string, total: number): number | undefined {
  text = text.trim();
  if (!/^[0-9]+$/.test(text)) {
    return undefined;
  }
  return Math.max(0, Math.min(total - 1, Number(text) - 1));
}
