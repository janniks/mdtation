/**
 * Minimal fenced-code syntax highlighting.
 * Line-based tokenizer: walks one source line and wraps tokens in ANSI SGR.
 * Unknown languages pass through unchanged (plain). No external deps; this is
 * intentionally small (a highlighter lib / shiki is a later phase).
 */
import { SGR } from "./sgr.ts";

/** Languages that share a JS-like token set. */
const JS_LANGS = new Set([
  "ts",
  "js",
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "es",
  "es6",
]);

const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "interface",
  "new",
  "null",
  "of",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "var",
  "let",
  "async",
  "await",
]);

/** Tokenize one line of `lang` and return the ANSI-styled line. */
export function highlight(line: string, lang: string | null): string {
  if (!lang || !JS_LANGS.has(lang.toLowerCase().replace(/[+-].*/, ""))) {
    return line;
  }
  let out = "";
  let i = 0;
  const n = line.length;
  while (i < n) {
    const ch = line[i] ?? "";
    // line comment (// ...)
    if (ch === "/" && line[i + 1] === "/") {
      out += `${SGR.gray}${line.slice(i)}${SGR.reset}`;
      break;
    }
    // string literal
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && (line[j] ?? "") !== ch) j++;
      out += `${SGR.green}${line.slice(i, j + 1)}${SGR.reset}`;
      i = j + 1;
      continue;
    }
    // number
    if (/\d/.test(ch)) {
      let j = i;
      while (j < n && /[.\d]/.test(line[j] ?? "")) j++;
      out += `${SGR.magenta}${line.slice(i, j)}${SGR.reset}`;
      i = j;
      continue;
    }
    // identifier or keyword
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(line[j] ?? "")) j++;
      const word = line.slice(i, j);
      out += KEYWORDS.has(word) ? `${SGR.cyan}${word}${SGR.reset}` : word;
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}
