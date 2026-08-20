/**
 * Command catalog — the single source of truth for keybindings, the menu bar,
 * the help dialog, the command palette, and the key dispatcher (mirrors
 * mdtation's spec: one table powers everything; a handler-map keyed by id
 * covers every cataloged id, else typecheck fails).
 *
 * Dispatch is pure and fully unit-tested: the OpenTUI shell just calls
 * `toChord(e)` -> `matchKey` -> `reduceCommand`.
 */
import { jumpToLine, moveCursor, pageDown, pageUp } from "./viewport.ts";
import type { KeyAction, Viewport } from "./viewport.ts";

export interface Command {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly keys: readonly string[];
  /** Optional section inside the menu; a separator is drawn when it changes. */
  readonly group?: string;
}

/** The canonical command table. First-match-wins on key dispatch. Declaration
 * order also drives the menu-bar category order (File, View, Navigate, Edit,
 * Comments, Tools, Help — mirrors the spec's menu bar). View toggles have no
 * chords on purpose: they are reached via the menu bar, palette, or help. */
export const COMMANDS = [
  { id: "quit", title: "Quit", category: "File", keys: ["q", "ctrl+c"] },
  { id: "save", title: "Save", category: "File", keys: ["ctrl+s"] },
  { id: "viewColor", title: "Color", category: "View", keys: [], group: "Render" },
  { id: "viewEmphasis", title: "Color bold/italic", category: "View", keys: [], group: "Render" },
  { id: "viewSyntax", title: "Syntax highlight", category: "View", keys: [], group: "Render" },
  { id: "viewHashes", title: "Show heading marks", category: "View", keys: [], group: "Render" },
  { id: "viewMarks", title: "Show inline marks", category: "View", keys: [], group: "Render" },
  { id: "viewFences", title: "Show code fences", category: "View", keys: [], group: "Render" },
  { id: "viewPipes", title: "Show table pipes", category: "View", keys: [], group: "Render" },
  { id: "viewFront", title: "Show frontmatter", category: "View", keys: [], group: "Render" },
  { id: "viewCaret", title: "Next caret glyph", category: "View", keys: [], group: "Gutter" },
  { id: "viewMark", title: "Next comment glyph", category: "View", keys: [], group: "Gutter" },
  { id: "viewCheck", title: "Next checkbox style", category: "View", keys: [], group: "Gutter" },
  { id: "viewCrumb", title: "Show section crumb", category: "View", keys: [], group: "Section" },
  { id: "viewMouse", title: "Capture mouse", category: "View", keys: ["shift+m"], group: "Mouse" },
  { id: "cursorDown", title: "Cursor Down", category: "Navigate", keys: ["j", "down"] },
  { id: "cursorUp", title: "Cursor Up", category: "Navigate", keys: ["k", "up"] },
  { id: "pageDown", title: "Page Down", category: "Navigate", keys: ["ctrl+d", "pagedown"] },
  { id: "pageUp", title: "Page Up", category: "Navigate", keys: ["ctrl+u", "pageup"] },
  { id: "top", title: "Top", category: "Navigate", keys: ["g"] },
  { id: "bottom", title: "Bottom", category: "Navigate", keys: ["shift+g"] },
  { id: "toggle", title: "Toggle / Edit", category: "Edit", keys: ["x", "space"] },
  { id: "comment", title: "New Comment", category: "Comments", keys: ["c"] },
  { id: "copy", title: "Copy comments to clipboard", category: "Comments", keys: ["shift+c"] },
  { id: "editor", title: "Show in editor", category: "Comments", keys: [] },
  { id: "prevComment", title: "Previous Comment", category: "Comments", keys: ["["] },
  { id: "nextComment", title: "Next Comment", category: "Comments", keys: ["]"] },
  {
    id: "viewArchive",
    title: "Archive on copy",
    category: "Comments",
    keys: [],
    group: "Options",
  },
  { id: "palette", title: "Command Palette", category: "Tools", keys: ["/"] },
  { id: "settings", title: "Settings", category: "Tools", keys: [] },
  { id: "help", title: "Help", category: "Help", keys: ["?"] },
] as const satisfies readonly Command[];

export type CommandId = (typeof COMMANDS)[number]["id"];

/** Effect of each command on the viewport. The mapped type enforces parity:
 * dropping a command id here is a type error. */
export type CmdHandler = (vp: Viewport, total: number) => KeyAction;
export const HANDLERS: { readonly [K in CommandId]: CmdHandler } = {
  cursorDown: (vp, total) => ({ vp: moveCursor(vp, 1, total) }),
  cursorUp: (vp, total) => ({ vp: moveCursor(vp, -1, total) }),
  pageDown: (vp, total) => ({ vp: pageDown(vp, total) }),
  pageUp: (vp, total) => ({ vp: pageUp(vp, total) }),
  top: (vp, total) => ({ vp: jumpToLine(vp, 0, total) }),
  bottom: (vp, total) => ({ vp: jumpToLine(vp, Math.max(0, total - 1), total) }),
  quit: () => ({ quit: true }),
  save: () => ({}),
  viewColor: () => ({}),
  viewEmphasis: () => ({}),
  viewSyntax: () => ({}),
  viewHashes: () => ({}),
  viewMarks: () => ({}),
  viewFences: () => ({}),
  viewPipes: () => ({}),
  viewFront: () => ({}),
  viewCaret: () => ({}),
  viewMark: () => ({}),
  viewCheck: () => ({}),
  viewCrumb: () => ({}),
  viewArchive: () => ({}),
  viewMouse: () => ({}),
  editor: () => ({}),
  settings: () => ({}),
  toggle: () => ({}),
  palette: () => ({}),
  comment: () => ({}),
  copy: () => ({}),
  prevComment: () => ({}),
  nextComment: () => ({}),
  help: () => ({}),
};

/** Raw key event shape (what OpenTUI's KeyEvent exposes minimally). */
export interface Key {
  name?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/** Normalize a key event into the chord string the catalog keys are written with. */
export function toChord(e: Key): string {
  const mods = [e.ctrl && "ctrl", e.shift && "shift", e.alt && "alt"].filter(Boolean);
  return [...mods, e.name ?? ""].join("+");
}

/** First command whose `keys` contain `chord`, else undefined. */
export function matchKey(
  chord: string,
  commands: readonly Command[] = COMMANDS,
): Command | undefined {
  return commands.find((c) => c.keys.includes(chord));
}

/** Reduce a matched command id to a viewport action. */
export function reduceCommand(id: string | undefined, vp: Viewport, total: number): KeyAction {
  if (!id) {
    return {};
  }
  return (HANDLERS as Record<string, CmdHandler>)[id]?.(vp, total) ?? {};
}

/** One menu-bar line, e.g. "File   View   Navigate   Edit   Notes   Tools   Help". */
export function menuBar(commands: readonly Command[] = COMMANDS): string {
  const seen = new Set<string>();
  const cats: string[] = [];
  for (const c of commands) {
    if (!seen.has(c.category)) {
      seen.add(c.category);
      cats.push(c.category);
    }
  }
  return cats.join("   ");
}
