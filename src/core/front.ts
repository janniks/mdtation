/**
 * Frontmatter fields. Pure: the shell re-parses after each `set`.
 * Only flat `key: value` lines inside a leading `---` block count.
 */

export interface Field {
  readonly line: number;
  readonly key: string;
  readonly value: string;
}

const FIELD = /^([A-Za-z0-9_-]+):(?:\s+(.*))?$/;

/** Index of the closing fence line, or -1 when there is no block or it never closes. */
export function end(lines: readonly string[]): number {
  if (lines[0] !== "---") {
    return -1;
  }
  return lines.findIndex((l, i) => i > 0 && (l === "---" || l === "..."));
}

/** Fields of the leading frontmatter block. */
export function front(lines: readonly string[]): Field[] {
  const stop = end(lines);
  const out: Field[] = [];
  for (let i = 1; i < stop; i++) {
    const m = FIELD.exec(lines[i]!);
    if (m) {
      out.push({ line: i, key: m[1]!, value: m[2] ?? "" });
    }
  }
  return out;
}

/** The field on `line`, or null. */
export function field(lines: readonly string[], line: number): Field | null {
  return front(lines).find((f) => f.line === line) ?? null;
}

/** Replace the value on `line` of `text`; null if that line is not a field. */
export function set(text: string, line: number, value: string): string | null {
  const lines = text.split("\n");
  const f = field(lines, line);
  if (!f) {
    return null;
  }
  lines[line] = `${f.key}: ${value}`;
  return lines.join("\n");
}
