/**
 * OpenTUI fullscreen shell for mdtation.
 *
 * OpenTUI's native core only loads under Bun, so the interactive shell runs via
 * `bun src/bin.ts <file>`. Layout is a column flex: menu bar / breadcrumb /
 * body / status bar. Key dispatch is pure (toChord -> matchKey -> run) and the
 * shell keeps at most one overlay (src/ui/overlay.ts), which sees keys first.
 * The body is a single `TextRenderable` with `wrapMode: "none"`: the frame is
 * pre-wrapped by `render()` and must never be re-wrapped by OpenTUI.
 */
import { createCliRenderer, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent, MouseEvent, Selection } from "@opentui/core";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { styled } from "./styled.ts";
import type { Overlay } from "./overlay.ts";
import { Crumb, Dropdown, MenuBar, StatusBar } from "./chrome.ts";
import { Help } from "./help.ts";
import { Palette } from "./palette.ts";
import { Modal } from "./modal.ts";
import { All } from "./all.ts";
import { copy } from "./clipboard.ts";
import { CommentStore, copyFormat } from "../core/comment.ts";
import type { Comment } from "../core/comment.ts";
import { create, markers } from "../core/comments.ts";
import { load, save } from "../core/store.ts";
import { load as loadPrefs, save as savePrefs } from "../core/prefs.ts";
import { report } from "../core/report.ts";
import { end, field, set } from "../core/front.ts";
import { cycle, DEFAULTS, rows as settings, type Values } from "../core/settings.ts";
import { nextComment, prevComment } from "../core/nav.ts";
import { parseDocument, type Document } from "../core/document.ts";
import { box, toggle } from "../core/edit.ts";
import { align, cell } from "../core/table.ts";
import { displayWidth } from "../core/unicode.ts";
import { crumb } from "../core/crumb.ts";
import { loadConfig } from "../core/config.ts";
import { hint, menus, specs, step } from "../core/menu.ts";
import {
  CHECKS,
  GUTTER_WIDTH,
  hidden,
  render as renderFrame,
  statusBar,
} from "../core/renderer.ts";
import {
  clampViewport,
  createViewport,
  jumpToLine,
  moveCursor,
  type Viewport,
} from "../core/viewport.ts";
import { COMMANDS, matchKey, reduceCommand, toChord, type CommandId } from "../core/commands.ts";

/** Rows of chrome below the body (status bar). */
const FOOTER = 1;
/** Window for the second quit on unsaved changes (Claude Code uses the same 2 s). */
const AGAIN = 2000;

/** View › Style cyclers: each pick moves to the next value; the menu shows the current one. */
const CYCLES = {
  viewFences: ["ticks", "fence", "hide"],
  viewCaret: [">", "+", "▶", "›", "●"],
  viewCheck: CHECKS.map((c) => c[1]),
} as const;
type Cycle = keyof typeof CYCLES;

export class TuiShell {
  readonly renderer: CliRenderer;
  doc: Document;
  dirty = false;
  /** When quit was last refused on a dirty file; a second quit within `AGAIN` ms exits anyway. */
  private guard = 0;
  /** Chord of the key being dispatched (for the status hint). */
  private chord = "";
  readonly store: CommentStore;
  private readonly file: string;
  overlay: Overlay | null = null;
  private readonly spec = specs(menus(COMMANDS));
  /** View-menu toggles keyed by command id, seeded from `mdtation.json`; flips are session-only. */
  private on: Record<string, boolean>;
  /** Settings palette values (scroll margin, beta flags). */
  private prefs: Values = DEFAULTS;
  /** Current index per cycler. */
  private pick: Record<Cycle, number> = { viewFences: 0, viewCaret: 0, viewCheck: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly bar: MenuBar;
  private readonly crumb: Crumb;
  private readonly text: TextRenderable;
  private readonly status: StatusBar;
  private view: Viewport;
  /** Index of the open menu, or null. */
  private cur = -1;

  constructor(renderer: CliRenderer, doc: Document, file = "", store = new CommentStore()) {
    this.renderer = renderer;
    this.doc = doc;
    this.file = file;
    this.store = store;
    const cfg = loadConfig(process.cwd()).view;
    this.on = {
      viewColor: cfg.color,
      viewEmphasis: cfg.emphasis,
      viewSyntax: cfg.syntax,
      viewHashes: true,
      viewMarks: true,
      viewPipes: true,
      viewFront: false,
      viewCrumb: true,
      viewBar: true,
      viewArchive: false,
      viewDetail: false,
      viewMouse: true,
    };
    const saved = loadPrefs();
    for (const k of Object.keys(this.on)) {
      if (k !== "viewMouse" && typeof saved.toggles[k] === "boolean") {
        this.on[k] = saved.toggles[k]!;
      }
    }
    this.prefs = { ...this.prefs, ...saved.values } as Values;
    for (const k of Object.keys(this.pick) as Cycle[]) {
      this.pick[k] = (saved.picks[k] ?? 0) % CYCLES[k].length;
    }
    this.view = clampViewport(this.fit(), doc.lines.length);
    this.bar = new MenuBar(renderer, this.spec, basename(file), {
      hover: (i) => this.cur >= 0 && this.cur !== i && this.menuOpen(i),
      toggle: (i) => this.outside() || (this.cur === i ? this.close() : this.menuOpen(i)),
    });
    this.crumb = new Crumb(renderer);
    this.text = new TextRenderable(renderer, {
      id: "body",
      content: "",
      width: "100%",
      flexGrow: 1,
      flexShrink: 1,
      selectable: true,
      wrapMode: "none",
      onMouseScroll: (e) => this.wheel(e),
      onMouseDown: (e) => this.click(e),
    });
    this.status = new StatusBar(renderer, { click: () => this.outside() || this.close() });
    renderer.root.flexDirection = "column";
    for (const n of [this.bar.node, this.crumb.node, this.text, this.status.node]) {
      renderer.root.add(n);
    }
    renderer.useMouse = true;
    // Drag-select in the body copies like a terminal would (hunk does the same via OSC-52).
    renderer.on("selection", (s: Selection) => {
      // Rows after the first start at column 0, so drop their 2-col gutter.
      const text = s.isDragging
        ? ""
        : s
            .getSelectedText()
            .split("\n")
            .map((l, i) => (i ? l.slice(GUTTER_WIDTH) : l))
            .join("\n")
            .trim();
      if (text) {
        copy(text, renderer);
        renderer.clearSelection();
        this.draw("COPIED SELECTION");
      }
    });
    renderer.keyInput.on("keypress", this.onKey);
    renderer.on("resize", () => this.resize());
    this.draw();
  }

  get vp(): Viewport {
    return this.view;
  }

  private fit(): Viewport {
    const width = this.renderer.width || 80;
    const header = Number(this.on.viewCrumb) + Number(this.on.viewBar);
    const height = Math.max(1, (this.renderer.height || 24) - header - FOOTER);
    return {
      ...createViewport(
        this.view?.offset ?? 0,
        this.view?.cursor ?? 0,
        width,
        height,
        Number(this.prefs.margin),
      ),
      first: this.on.viewFront ? 1 : this.first(),
    };
  }

  /** First line after hidden frontmatter, skipping blank lines. */
  private first(): number {
    let i = end(this.doc.lines) + 1;
    while (i < this.doc.lines.length - 1 && this.doc.lines[i]!.trim() === "") {
      i++;
    }
    return i;
  }

  /** Move the cursor to `line` (clamped, scrolled on-screen) and redraw. */
  setCursor(line: number): void {
    this.view = jumpToLine(this.view, line, this.doc.lines.length);
    this.draw();
  }

  /** Show `o` (replacing any open overlay). It sees keys first until closed. */
  open(o: Overlay): void {
    this.close();
    this.overlay = o;
    this.renderer.root.add(o.node);
    this.renderer.requestRender();
  }

  close(): void {
    const o = this.overlay;
    this.overlay = null;
    this.cur = -1;
    this.bar.active = null;
    if (o) {
      this.renderer.root.remove(o.node);
      o.dispose?.();
    }
    this.renderer.requestRender();
  }

  /** Live menu model: View entries carry their current check state. */
  private menus() {
    return menus(COMMANDS, (id) => (id in CYCLES ? this.value(id as Cycle) : this.on[id]));
  }

  private menuOpen(i: number, at = 0): void {
    this.open(
      new Dropdown(
        this.renderer,
        this.menus()[i]!,
        this.spec[i]!,
        {
          run: (id) => {
            // Toggles and cyclers keep the menu open (rebuilt in place); anything else closes it.
            const keep = this.on[id] !== undefined || id in CYCLES;
            const row = (this.overlay as Dropdown).index;
            this.close();
            this.run(id as CommandId);
            if (keep) {
              this.menuOpen(i, row);
            }
          },
          close: () => this.close(),
          switch: (d) => this.menuOpen(step(i, d, this.spec.length)),
        },
        at,
      ),
    );
    this.cur = i;
    this.bar.active = i;
  }

  /** Wheel moves the cursor; the window follows once the cursor hits the scroll margin. */
  private wheel(e: MouseEvent): void {
    const dir = e.scroll?.direction;
    if (dir !== "up" && dir !== "down") {
      return;
    }
    const prev = this.view.cursor;
    this.view = moveCursor(this.view, dir === "down" ? 1 : -1, this.doc.lines.length);
    this.settle(prev);
    this.draw();
  }

  /** A click outside an overlay that handles them: close it if it agrees, and swallow the click either way. */
  private outside(): boolean {
    if (!this.overlay?.away) {
      return false;
    }
    if (this.overlay.away()) {
      this.close();
    }
    return true;
  }

  private click(e: MouseEvent): void {
    if (this.overlay instanceof Dropdown) {
      this.close();
      return;
    }
    if (this.outside()) {
      return;
    }
    const row = e.y - this.text.y;
    if (row < 0 || row >= this.view.height || this.doc.lines.length === 0) {
      return;
    }
    const line = Math.min(this.view.offset + row, this.doc.lines.length - 1);
    this.view = { ...this.view, cursor: line };
    const b = box(this.doc.lines[line] ?? "");
    const col = e.x - this.text.x - GUTTER_WIDTH;
    const left = b ? displayWidth(this.doc.lines[line]!.slice(0, b.at)) : -1;
    const f = this.prefs.front === "on" ? field(this.doc.lines, line) : null;
    if ((b && col >= left && col <= left + 2) || (f && col > f.key.length)) {
      this.toggle();
      return;
    }
    // Clicking a header or separator cell cycles that column's alignment.
    const t = cell(this.doc.lines, line, col);
    if (t && (t.row === 0 || line === t.sep)) {
      this.edit(align(this.doc.text, t.sep, t.col));
      return;
    }
    this.draw();
  }

  /** Flip the task box on the cursor line, or edit a frontmatter field there; marks the document dirty. */
  private toggle(): void {
    const line = this.view.cursor;
    const f = this.prefs.front === "on" ? field(this.doc.lines, line) : null;
    if (f) {
      this.open(
        new Modal(this.renderer, {
          title: `Edit ${f.key}`,
          quote: this.doc.lines[line] ?? "",
          value: f.value,
          submit: (value) => this.edit(set(this.doc.text, line, value)),
          close: () => this.close(),
        }),
      );
      return;
    }
    this.edit(toggle(this.doc.text, line));
  }

  /** Replace the document text (null = nothing editable here). */
  private edit(text: string | null): void {
    if (text === null) {
      this.draw("NOTHING TO EDIT");
      return;
    }
    this.doc = parseDocument(text);
    this.dirty = true;
    this.draw();
  }

  /** Write all comments (with provenance) to a temp file and open it in `$EDITOR`. */
  private editor(): void {
    const path = join(tmpdir(), "mdtation-comments.md");
    writeFileSync(path, report(this.store, this.doc, this.file, { detail: this.on.viewDetail }));
    this.renderer.suspend();
    spawnSync(process.env.EDITOR ?? "vi", [path], { stdio: "inherit" });
    this.renderer.resume();
    this.draw();
  }

  private persist(): void {
    if (this.file) {
      void save(this.file, this.store);
    }
  }

  private save(): void {
    if (this.file) {
      void writeFile(this.file, this.doc.text);
    }
    this.dirty = false;
    this.draw("SAVED");
  }

  /** Current value of a cycler. */
  private value<K extends Cycle>(id: K): (typeof CYCLES)[K][number] {
    return CYCLES[id][this.pick[id]]!;
  }

  /** Render options owned by the Style cyclers. */
  private style() {
    return {
      fences: this.value("viewFences"),
      caret: this.value("viewCaret"),
      check: this.pick.viewCheck,
    };
  }

  /** Persist toggles, settings and cycle picks (debounced, atomic write). */
  private remember(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      const { viewMouse: _, ...toggles } = this.on;
      savePrefs({
        toggles,
        values: this.prefs,
        picks: this.pick,
      });
    }, 200);
  }

  /** Step the cursor off a row-less line, continuing in the direction it came from. */
  private settle(prev: number): void {
    const dir = Math.sign(this.view.cursor - prev) || 1;
    let c = this.view.cursor;
    while (hidden(this.doc, c, this.style()) && c + dir >= 0 && c + dir < this.doc.lines.length) {
      c += dir;
    }
    if (c !== this.view.cursor) {
      this.view = jumpToLine(this.view, c, this.doc.lines.length);
    }
  }

  draw(mode = this.dirty ? "UNSAVED" : "VIEW"): void {
    const marks = markers(this.store, this.doc);
    this.bar.dirty = this.dirty;
    this.crumb.node.visible = this.on.viewCrumb === true;
    this.bar.node.visible = this.on.viewBar === true;
    this.crumb.text = crumb(this.doc, this.view.cursor, Number(this.prefs.crumb) || Infinity);
    this.text.content = styled(
      renderFrame(this.doc, this.view, {
        color: this.on.viewColor,
        emphasis: this.on.viewEmphasis,
        syntax: this.on.viewSyntax,
        hashes: this.on.viewHashes,
        marks: this.on.viewMarks,
        pipes: this.on.viewPipes,
        ...this.style(),
        markers: marks,
      }).join("\n"),
    );
    this.status.update(statusBar(this.doc, this.view, { markers: marks }), mode);
    this.renderer.requestRender();
  }

  /** Open the comment modal for the cursor line; ↵ adds + persists the comment. */
  /** Open the comment box on the cursor row; `c` (existing comment) turns it into an edit. */
  private comment(c?: Comment): void {
    const line = this.view.cursor;
    this.open(
      new Modal(this.renderer, {
        title: c ? "Edit comment" : "Comment",
        quote: this.doc.lines[line] ?? "",
        value: c?.text,
        submit: (text) => {
          this.store.add(c ? { ...c, text } : create(this.doc, line, text));
          this.persist();
          this.close();
          this.draw("SAVED");
        },
        close: () => this.close(),
      }),
    );
  }

  /** Live comments anchored on the cursor row. */
  private here(): readonly Comment[] {
    return this.store
      .live()
      .filter((x) => this.store.resolve(x.anchor, this.doc)?.startLine === this.view.cursor);
  }

  /** `e`: edit the comment on the cursor row; with several, pick one first. */
  private amend(): void {
    const list = this.here();
    if (list.length === 0) {
      this.draw("NO COMMENT HERE");
    } else if (list.length === 1) {
      this.comment(list[0]);
    } else {
      this.open(
        new Palette(
          this.renderer,
          (id) => this.comment(this.store.get(id)),
          () => this.close(),
          {
            title: "Edit which comment",
            hint: "type to filter…",
            items: () =>
              list.map((x) => ({
                id: x.id,
                title: x.text.split("\n")[0]!,
                category: "",
                keys: [],
              })),
          },
        ),
      );
    }
  }

  /** Copy the structured reference of the comment under the cursor (OSC-52 + file).
   * With `View › Archive comments on copy`, the comment is archived (recoverable via `--restore`). */
  private copy(): void {
    const c = this.here()[0];
    if (!c) {
      this.draw("NO COMMENT HERE");
      return;
    }
    copy(copyFormat(c, this.doc, this.on.viewDetail), this.renderer);
    // OSC-52 is fire-and-forget: over SSH/remote the terminal may accept it without reaching the host clipboard.
    const note = this.renderer.capabilities?.remote ? "  remote: if empty, press a" : "";
    if (this.on.viewArchive) {
      this.store.archive(c.id);
      this.persist();
      this.draw(`COPIED  ARCHIVED${note}`);
      return;
    }
    this.draw(`COPIED${note}`);
  }

  /** Run a command by id. */
  private run(id: CommandId): void {
    const total = this.doc.lines.length;
    switch (id) {
      case "help":
        this.open(new Help(this.renderer, () => this.close()));
        return;
      case "palette":
        this.open(
          new Palette(
            this.renderer,
            (x) => this.run(x as CommandId),
            () => this.close(),
          ),
        );
        return;
      case "comment":
        this.comment();
        return;
      case "edit":
        this.amend();
        return;
      case "copy":
        this.copy();
        return;
      case "editor":
        this.editor();
        return;
      case "all":
        this.open(
          new All(
            this.renderer,
            report(this.store, this.doc, this.file, { detail: this.on.viewDetail }),
            () => this.close(),
          ),
        );
        return;
      case "settings":
        this.open(
          new Palette(
            this.renderer,
            (x) => {
              this.prefs = cycle(this.prefs, x.slice(4));
              this.remember();
              this.resize();
            },
            () => this.close(),
            { title: "Settings", items: () => settings(this.prefs), stay: true },
          ),
        );
        return;
      case "viewFences":
      case "viewCaret":
      case "viewCheck":
        this.pick[id] = (this.pick[id] + 1) % CYCLES[id].length;
        this.remember();
        this.draw();
        return;
      case "save":
        this.save();
        return;
      case "viewMouse":
        // Off: the terminal keeps the mouse, so its native select-to-copy works; `M` turns it back on.
        this.on.viewMouse = !this.on.viewMouse;
        this.renderer.useMouse = this.on.viewMouse;
        this.draw(this.on.viewMouse ? "MOUSE ON" : "MOUSE OFF | select freely | M to re-enable");
        return;
      case "viewColor":
      case "viewEmphasis":
      case "viewSyntax":
      case "viewHashes":
      case "viewMarks":
      case "viewPipes":
      case "viewFront":
      case "viewCrumb":
      case "viewBar":
      case "viewArchive":
      case "viewDetail":
        this.on[id] = !this.on[id];
        this.remember();
        this.view = clampViewport(this.fit(), total);
        this.draw();
        return;
      case "quit":
        if (this.dirty && Date.now() - this.guard > AGAIN) {
          this.guard = Date.now();
          this.draw(
            `Press ${hint(this.chord) || "^c"} again to exit with unsaved changes  ^s saves`,
          );
          // The hint leaves with the window, so its disappearance says "too late".
          setTimeout(() => {
            if (this.guard && Date.now() - this.guard >= AGAIN) {
              this.guard = 0;
              this.draw();
            }
          }, AGAIN);
          return;
        }
        break;
      case "nextComment":
        this.view = nextComment(this.view, total, this.store, this.doc);
        this.draw();
        return;
      case "prevComment":
        this.view = prevComment(this.view, total, this.store, this.doc);
        this.draw();
        return;
    }
    const action = reduceCommand(id, this.view, this.doc.lines.length);
    if (action.quit) {
      this.dispose();
    } else if (action.vp) {
      const prev = this.view.cursor;
      this.view = action.vp;
      this.settle(prev);
      this.draw();
    }
  }

  private onKey = (e: KeyEvent): void => {
    if (this.overlay?.key(e)) {
      return;
    }
    if (e.name === "f10") {
      this.menuOpen(0);
      return;
    }
    this.chord = toChord(e);
    const id = matchKey(this.chord)?.id as CommandId | undefined;
    if (id !== "quit") {
      this.guard = 0;
    }
    if (id) {
      e.preventDefault(); // keep the opening key out of an overlay's input
      const menu = this.cur;
      const row = this.overlay instanceof Dropdown ? this.overlay.index : 0;
      this.run(id);
      if (menu >= 0 && this.cur === menu) {
        this.menuOpen(menu, row); // rebuild so toggles flipped by key show their new state
      }
    }
  };

  private resize(): void {
    this.view = clampViewport(this.fit(), this.doc.lines.length);
    this.overlay?.place?.();
    this.draw();
  }

  dispose(): void {
    this.renderer.keyInput.off("keypress", this.onKey);
    this.renderer.destroy();
    // OpenTUI's destroy() may not drain the process on its own, so the shell
    // owns a hard exit once the user quits (q / Ctrl-c).
    process.exit(0);
  }
}

/** Mount the fullscreen TUI for `doc`. `file` is shown in the menu bar. The shell runs until the user quits. */
export async function runTui(doc: Document, file = ""): Promise<TuiShell> {
  const store = file ? await load(file) : new CommentStore();
  return new TuiShell(
    await createCliRenderer({ useMouse: true, exitOnCtrlC: false }),
    doc,
    file,
    store,
  );
}
