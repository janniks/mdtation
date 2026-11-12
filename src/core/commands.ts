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
import { CHECKS } from "./renderer.ts";

export interface Command {
  readonly id: string;
  readonly title: string;
  /** Palette action title when the neutral title has no verb. */
  readonly verb?: string;
  /** Palette action when a toggle is on. */
  readonly off?: string;
  readonly category: string;
  readonly keys: readonly string[];
  /** Optional section inside the menu; a separator is drawn when it changes. */
  readonly group?: string;
  /** `false` keeps the command out of the menu bar (still in help and the palette). */
  readonly menu?: boolean;
}

/** The canonical command table. First-match-wins on key dispatch. Declaration
 * order also drives the menu-bar category order (File, View, Navigate, Edit,
 * Comments, Help). View toggles have no
 * chords on purpose: they are reached via the menu bar, palette, or help. */
export const COMMANDS = [
  { id: "save", title: "Save", category: "File", keys: ["ctrl+s"] },
  { id: "reload", title: "Reload", category: "File", keys: [] },
  { id: "palette", title: "Command palette", category: "File", keys: ["/"], group: "Tools" },
  { id: "settings", title: "Settings", category: "File", keys: [], group: "Tools" },
  { id: "quit", title: "Quit", category: "File", keys: ["q", "ctrl+c"], group: " " },
  {
    id: "viewColor",
    title: "Color",
    verb: "Enable color",
    off: "Disable color",
    category: "View",
    keys: [],
  },
  {
    id: "viewMouse",
    title: "Capture mouse",
    off: "Release mouse",
    category: "View",
    keys: ["shift+m"],
  },
  { id: "viewBar", title: "Show menu bar", category: "View", keys: ["m"] },
  { id: "viewCrumb", title: "Show section crumb", category: "View", keys: [] },
  { id: "viewCaret", title: "Line caret", category: "View", keys: [] },
  { id: "viewNumbers", title: "Line numbers", category: "View", keys: [] },
  { id: "viewDeco", title: "Show text decoration", category: "View", keys: [], group: "Text" },
  {
    id: "viewEmphasis",
    title: "Color text decoration",
    off: "Gray text decoration",
    category: "View",
    keys: [],
    group: "Text",
  },
  { id: "viewMarks", title: "Show inline marks", category: "View", keys: [], group: "Text" },
  { id: "viewLinks", title: "Show links", category: "View", keys: [], group: "Text" },
  { id: "viewHashes", title: "Show heading marks", category: "View", keys: [], group: "Blocks" },
  { id: "viewPipes", title: "Show table pipes", category: "View", keys: [], group: "Blocks" },
  { id: "viewFront", title: "Show frontmatter", category: "View", keys: [], group: "Blocks" },
  {
    id: "viewSyntax",
    title: "Syntax highlight",
    verb: "Highlight code syntax",
    off: "Plain code",
    category: "View",
    keys: [],
    group: "Blocks",
  },
  { id: "viewFences", title: "Code fences", category: "View", keys: [], group: "Blocks" },
  { id: "viewQuote", title: "Blockquote", category: "View", keys: [], group: "Blocks" },
  { id: "viewCheck", title: "Checkbox", category: "View", keys: [], group: "Blocks" },
  {
    id: "viewFlow",
    title: "Flow paragraphs",
    off: "Unflow paragraphs",
    category: "View",
    keys: [],
    group: "Prose",
  },
  {
    id: "viewIndent",
    title: "Indent paragraphs",
    off: "Unindent paragraphs",
    category: "View",
    keys: [],
    group: "Prose",
  },
  { id: "viewGlow", title: "Show changes", category: "View", keys: [], group: "Prose" },
  { id: "viewMore", title: "More view settings…", category: "View", keys: [], group: " " },
  {
    id: "cursorDown",
    title: "Cursor Down",
    category: "Navigate",
    keys: ["j", "down"],
    menu: false,
  },
  { id: "cursorUp", title: "Cursor Up", category: "Navigate", keys: ["k", "up"], menu: false },
  {
    id: "pageDown",
    title: "Page down",
    category: "Navigate",
    keys: ["ctrl+d", "pagedown"],
    menu: false,
  },
  { id: "pageUp", title: "Page up", category: "Navigate", keys: ["ctrl+u", "pageup"], menu: false },
  { id: "top", title: "Top", category: "Navigate", keys: ["g"], menu: false },
  { id: "bottom", title: "Bottom", category: "Navigate", keys: ["shift+g"], menu: false },
  // Digit counts for vertical movement are owned by the shell.
  { id: "goto", title: "Go to line", category: "Cursor", keys: [":"], menu: false },
  { id: "comment", title: "New comment", category: "Comments", keys: ["c"] },
  { id: "edit", title: "Edit comment", category: "Comments", keys: ["e"] },
  { id: "reply", title: "Reply", category: "Comments", keys: ["r"] },
  { id: "archive", title: "Archive comment", category: "Comments", keys: ["d"] },
  {
    id: "prevComment",
    title: "Previous comment",
    category: "Comments",
    keys: ["["],
    group: "Navigate",
  },
  { id: "nextComment", title: "Next comment", category: "Comments", keys: ["]"] },
  { id: "prevAgent", title: "Previous agent comment", category: "Comments", keys: ["{"] },
  { id: "nextAgent", title: "Next agent comment", category: "Comments", keys: ["}"] },
  { id: "all", title: "Show all", category: "Comments", keys: ["a"], group: "Copy" },
  { id: "editor", title: "Show all in editor", category: "Comments", keys: [] },
  { id: "copy", title: "Copy all to clipboard", category: "Comments", keys: ["shift+c"] },
  { id: "viewCopy", title: "Copy format", category: "Comments", keys: [] },
  {
    id: "viewSelect",
    title: "Select to comment",
    off: "Select to copy",
    category: "Comments",
    keys: [],
    group: "Options",
  },
  {
    id: "viewArchive",
    title: "Archive on copy",
    off: "Keep on copy",
    category: "Comments",
    keys: [],
    group: "Options",
  },
  {
    id: "viewInlineAgent",
    title: "Show agent comments inline",
    category: "Comments",
    keys: [],
    group: "Options",
  },
  {
    id: "viewInlineOwn",
    title: "Show own comments inline",
    category: "Comments",
    keys: [],
    group: "Options",
  },
  { id: "help", title: "Help", category: "Help", keys: ["?"] },
] as const satisfies readonly Command[];

export type CommandId = (typeof COMMANDS)[number]["id"];

/** Cycler values in persisted index order. */
export const CYCLES = {
  viewFences: ["ticks", "fence", "hide"],
  viewCaret: [">", "+", "●"],
  viewCheck: CHECKS.map((c) => c[1]),
  viewCopy: ["simple", "detailed"],
  viewQuote: ["bar", ">", "hide"],
  viewNumbers: ["off", "absolute", "relative"],
} as const;
export type Cycle = keyof typeof CYCLES;

/** Palette actions in the same order as each cycler's values. */
export const LABELS = {
  viewFences: ["Show code fences as ticks", "Show code fences as lines", "Hide code fences"],
  viewCaret: ["Use > caret", "Use + caret", "Use ● caret"],
  viewCheck: CHECKS.map((c) => `Use ${c[1]} checkboxes`),
  viewCopy: ["Copy in simple format", "Copy in detailed format"],
  viewQuote: ["Show blockquotes with a bar", "Show blockquotes with >", "Hide blockquote marks"],
  viewNumbers: ["Hide line numbers", "Show absolute line numbers", "Show relative line numbers"],
} as const satisfies Record<Cycle, readonly string[]>;

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
  goto: () => ({}),
  quit: () => ({ quit: true }),
  save: () => ({}),
  reload: () => ({}),
  viewBar: () => ({}),
  viewColor: () => ({}),
  viewEmphasis: () => ({}),
  viewDeco: () => ({}),
  viewSyntax: () => ({}),
  viewHashes: () => ({}),
  viewMarks: () => ({}),
  viewLinks: () => ({}),
  viewFences: () => ({}),
  viewPipes: () => ({}),
  viewFront: () => ({}),
  viewCaret: () => ({}),
  viewNumbers: () => ({}),
  viewCheck: () => ({}),
  viewQuote: () => ({}),
  viewFlow: () => ({}),
  viewGlow: () => ({}),
  viewIndent: () => ({}),
  viewCrumb: () => ({}),
  viewMore: () => ({}),
  viewArchive: () => ({}),
  viewCopy: () => ({}),
  viewSelect: () => ({}),
  viewMouse: () => ({}),
  editor: () => ({}),
  all: () => ({}),
  settings: () => ({}),
  palette: () => ({}),
  comment: () => ({}),
  edit: () => ({}),
  reply: () => ({}),
  archive: () => ({}),
  prevAgent: () => ({}),
  nextAgent: () => ({}),
  viewInlineAgent: () => ({}),
  viewInlineOwn: () => ({}),
  copy: () => ({}),
  prevComment: () => ({}),
  nextComment: () => ({}),
  help: () => ({}),
};

/** Palette actions: flip toggles or choose any cycler value except the current one. */
export function verbs(
  commands: readonly Command[],
  on: Readonly<Record<string, boolean>>,
  pick: Readonly<Record<string, number>>,
): readonly Command[] {
  return commands.flatMap<Command>((c) => {
    if (c.id in CYCLES) {
      return LABELS[c.id as Cycle].flatMap((title, at) =>
        at === pick[c.id] ? [] : [{ id: `${c.id}=${at}`, title, category: c.category, keys: [] }],
      );
    }
    return [
      {
        ...c,
        title: on[c.id] ? (c.off ?? c.title.replace(/^Show /, "Hide ")) : (c.verb ?? c.title),
      },
    ];
  });
}

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
