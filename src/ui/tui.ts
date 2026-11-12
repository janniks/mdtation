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
import { THEME } from "../core/theme.ts";
import { createCliRenderer, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent, MouseEvent, Selection } from "@opentui/core";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { strip } from "../core/sgr.ts";
import { styled } from "./styled.ts";
import type { Overlay } from "./overlay.ts";
import { Crumb, Dropdown, MenuBar, StatusBar } from "./chrome.ts";
import { Help } from "./help.ts";
import { Palette } from "./palette.ts";
import { Modal } from "./modal.ts";
import { Prompt } from "./prompt.ts";
import { All } from "./all.ts";
import { copy } from "./clipboard.ts";
import { CommentStore, changes } from "../core/comment.ts";
import { follow } from "../core/watch.ts";
import {
  end as last,
  fit,
  gap,
  hold,
  pin,
  place,
  step as walk,
  type Caret,
} from "../core/caret.ts";
import type { Comment } from "../core/comment.ts";
import { create, markers } from "../core/comments.ts";
import { track } from "../core/track.ts";
import { lay, notes, type Align, type Layout, type Time } from "../core/inline.ts";
import { append, atomic, home, load, path as storePath, save } from "../core/store.ts";
import type { Change } from "../core/comment.ts";
import { load as loadPrefs, save as savePrefs } from "../core/prefs.ts";
import { report } from "../core/report.ts";
import { end, field, set } from "../core/front.ts";
import { cycle, DEFAULTS, rows as settings, TTL, type Values } from "../core/settings.ts";
import { nextComment, prevComment } from "../core/nav.ts";
import { parse } from "../core/line.ts";
import { parseDocument, type Document } from "../core/document.ts";
import { box, toggle } from "../core/edit.ts";
import { align, cell } from "../core/table.ts";
import { displayWidth } from "../core/unicode.ts";
import { crumb } from "../core/crumb.ts";
import { loadConfig } from "../core/config.ts";
import { hint, menus, specs, step } from "../core/menu.ts";
import { flow, gutter, hidden, render as renderFrame, span, statusBar } from "../core/renderer.ts";
import {
  clampViewport,
  createViewport,
  jumpToLine,
  moveCursor,
  type Viewport,
} from "../core/viewport.ts";
import {
  COMMANDS,
  CYCLES,
  matchKey,
  reduceCommand,
  toChord,
  type Command,
  type CommandId,
  type Cycle,
  verbs,
} from "../core/commands.ts";

/** Rows of chrome below the body (status bar). */
const FOOTER = 1;
/** Window for the second quit on unsaved changes (Claude Code uses the same 2 s). */
const AGAIN = 2000;
/** Window for a double click, macOS's default. */
const DOUBLE = 500;

export class TuiShell {
  readonly renderer: CliRenderer;
  doc: Document;
  dirty = false;
  /** The markdown changed on disk while an overlay was open or edits were unsaved; applied on close or `File > Reload`. */
  private stale = false;
  /** When quit was last refused on a dirty file; a second quit within `AGAIN` ms exits anyway. */
  private guard = 0;
  /** Chord of the key being dispatched (for the status hint). */
  private chord = "";
  private count: number | null = null;
  store: CommentStore;
  private readonly file: string;
  /** Stops for the disk watchers (comments json, markdown); see `follow`. */
  private stops: (() => void)[] = [];
  overlay: Overlay | null = null;
  private readonly spec = specs(menus(COMMANDS));
  /** View-menu toggles keyed by command id, seeded from `mdtation.json`; flips are session-only. */
  private on: Record<string, boolean>;
  /** Settings palette values (scroll margin, beta flags). */
  private prefs: Values = DEFAULTS;
  /** Current index per cycler. */
  private pick: Record<Cycle, number> = {
    viewFences: 0,
    viewCaret: 0,
    viewCheck: 0,
    viewCopy: 1,
    viewQuote: 0,
    viewNumbers: 0,
  };
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Clears a transient status badge after `AGAIN` ms. */
  private fade: ReturnType<typeof setTimeout> | null = null;
  private readonly bar: MenuBar;
  private readonly crumb: Crumb;
  private readonly text: TextRenderable;
  private readonly status: StatusBar;
  private view: Viewport;
  /** Index of the open menu, or null. */
  private cur = -1;

  constructor(renderer: CliRenderer, doc: Document, file = "", store = new CommentStore()) {
    this.renderer = renderer;
    renderer.setBackgroundColor(THEME.page);
    this.doc = doc;
    this.file = file;
    this.store = store;
    const cfg = loadConfig(process.cwd()).view;
    this.on = {
      viewColor: cfg.color,
      viewEmphasis: cfg.emphasis,
      viewSyntax: cfg.syntax,
      viewHashes: true,
      viewMarks: false,
      viewDeco: true,
      viewLinks: true,
      viewPipes: false,
      viewFront: false,
      viewCrumb: true,
      viewBar: true,
      viewFlow: false,
      viewIndent: false,
      viewArchive: false,
      viewSelect: true,
      viewInlineAgent: true,
      viewInlineOwn: true,
      viewMouse: true,
    };
    const saved = loadPrefs();
    for (const k of Object.keys(this.on)) {
      if (k !== "viewMouse" && typeof saved.toggles[k] === "boolean") {
        this.on[k] = saved.toggles[k]!;
      }
    }
    this.prefs = { ...this.prefs, ...saved.values } as Values;
    if (this.store.sweep(TTL[this.prefs.purge] ?? Infinity)) {
      this.persist();
    }
    for (const k of Object.keys(this.pick) as Cycle[]) {
      this.pick[k] = (saved.picks[k] ?? this.pick[k]) % CYCLES[k].length;
    }
    this.view = clampViewport(this.fit(), doc.lines.length);
    this.follow();
    if (file) {
      append(file, { event: "open", by: process.env.USER ?? "you" });
    }
    this.bar = new MenuBar(renderer, this.spec, {
      hover: (i) => this.cur >= 0 && this.cur !== i && this.menuOpen(i),
      toggle: (i) => this.outside() || (this.cur === i ? this.close() : this.menuOpen(i)),
    });
    this.crumb = new Crumb(renderer);
    this.text = new TextRenderable(renderer, {
      id: "body",
      fg: THEME.text,
      content: "",
      width: "100%",
      flexGrow: 1,
      flexShrink: 1,
      selectable: true,
      selectionBg: THEME.active,
      selectionFg: THEME.text,
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
    // Drag-select in the body opens a comment on the selection (stored verbatim, see `Comment.quote`);
    // with `Comments › Select to comment` off it copies the text instead (OSC-52, like hunk).
    renderer.on("selection", (s: Selection) => {
      // Order endpoints by screen position, including reverse drags on one row.
      const start = [s.anchor, s.focus].sort((a, b) => a.y - b.y || a.x - b.x)[0]!;
      const width = gutter(this.doc, this.style());
      const raw = s.isDragging ? "" : s.getSelectedText();
      const text = this.overlay
        ? raw.trim()
        : raw
            .split("\n")
            // The cursor slab pads its row to the pane; the padding is not text.
            .map((l, i) =>
              l.slice(i ? width : Math.max(0, width - (start.x - this.text.x))).trimEnd(),
            )
            .join("\n");
      if (!text.trim()) {
        return;
      }
      renderer.clearSelection();
      // Inside an overlay (e.g. All comments) a selection only copies; commenting is for the body.
      if (this.overlay || !this.on.viewSelect) {
        copy(text, renderer);
        this.draw("COPIED SELECTION");
      } else {
        const row = start.y - this.text.y;
        const hit = place(this.top(), row, this.doc.lines.length, this.spans(this.lay()));
        this.view = {
          ...this.view,
          cursor: hit ? hit.line : Math.max(0, this.doc.lines.length - 1),
        };
        this.seg = 0;
        this.row = row;
        this.comment(undefined, text);
      }
    });
    renderer.keyInput.on("keypress", this.onKey);
    renderer.on("resize", () => this.resize());
    this.draw();
  }

  /** Caret row inside the cursor line's block (wrap rows, then inline note rows). */
  private seg = 0;
  /** Screen row the caret was drawn on; unset after a jump, so the next draw fits strictly. */
  private row?: number;
  /** Comment id per rendered inline note row, keyed by line; refreshed by `lay()`. */
  private ids = new Map<number, string[]>();
  /** Where and when the body was last clicked, for `again()`. */
  private tap = { at: 0, line: -1, seg: -1 };

  get vp(): Viewport {
    return this.view;
  }

  /** The window's top row, as a caret. */
  private top(): Caret {
    return { line: this.view.offset, seg: this.view.skip ?? 0 };
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
      // Shown frontmatter starts under its opener; without any, line 0 (often the H1) stays reachable.
      first: this.on.viewFront && end(this.doc.lines) > 0 ? 1 : this.first(),
      // Keep the row inside the top line, so a resize or toggle doesn't snap the window to a line edge.
      skip: this.view?.skip ?? 0,
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
    this.row = undefined;
    this.draw();
  }

  /** Show `o` (replacing any open overlay). It sees keys first until closed. */
  open(o: Overlay): void {
    if (this.count !== null) {
      this.count = null;
      this.draw();
    }
    this.drop();
    // A click before the overlay must not pair with one after it.
    this.tap.at = 0;
    o.node.borderStyle = this.prefs.corners === "round" ? "rounded" : "single";
    this.overlay = o;
    this.renderer.root.add(o.node);
    this.renderer.requestRender();
  }

  /** Close the overlay, then apply a reload that waited on it. */
  close(): void {
    this.drop();
    if (this.stale) {
      this.safe(this.reloadDoc());
    }
  }

  private drop(): void {
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
    const c = walk(
      { line: this.view.cursor, seg: this.seg },
      dir === "down" ? 1 : -1,
      this.doc.lines.length,
      this.spans(this.lay()),
    );
    this.view = { ...this.view, cursor: c.line };
    this.seg = c.seg;
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
    const total = this.doc.lines.length;
    const opts = this.lay();
    const rows = this.spans(opts);
    // A click below the last rendered row lands on the last row instead of nowhere.
    const hit = place(this.top(), row, total, rows) ?? last(total, rows);
    const line = hit.line;
    this.view = { ...this.view, cursor: line };
    this.seg = hit.seg;
    // The caret now rests where the pointer is; the margin must not scroll the page under it.
    this.row = row;
    const twice = this.again(hit);
    if (hit.seg > 0) {
      // Continuation and note rows just take the caret; targets below live on a line's first row.
      // A second click on a wrapped row comments on it; note rows are the comments already.
      if (twice && !this.note(opts)) {
        this.comment(undefined, this.slice(opts));
        return;
      }
      this.draw();
      return;
    }
    const b = box(this.doc.lines[line] ?? "");
    const col = e.x - this.text.x - gutter(this.doc, opts);
    const left = b ? displayWidth(this.doc.lines[line]!.slice(0, b.at)) : -1;
    const f = this.prefs.front === "on" ? field(this.doc.lines, line) : null;
    if ((b && col >= left && col <= left + 2) || (f && col > f.key.length)) {
      this.toggle();
      return;
    }
    // Clicking a header or separator cell cycles that column's alignment.
    const t = this.on.viewPipes ? cell(this.doc.lines, line, col) : null;
    if (t && (t.row === 0 || line === t.sep)) {
      this.edit(align(this.doc.text, t.sep, t.col));
      return;
    }
    // Nothing else was under it: a second click on the same row comments on the line.
    if (twice) {
      this.comment(undefined, this.slice(opts));
      return;
    }
    this.draw();
  }

  /** True when this click lands on the row the last one did, inside the double-click window.
   * The pair is then spent, so a third click starts over instead of firing again. */
  private again(hit: Caret): boolean {
    const now = Date.now();
    const twice =
      now - this.tap.at < DOUBLE && this.tap.line === hit.line && this.tap.seg === hit.seg;
    this.tap = { at: twice ? 0 : now, line: hit.line, seg: hit.seg };
    return twice;
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
    this.draw(undefined, true);
  }

  /** Write all comments (with provenance) to a temp file and open it in `$EDITOR`. */
  private editor(): void {
    const path = join(tmpdir(), "mdtation-comments.md");
    writeFileSync(
      path,
      report(this.store.live(), this.doc, this.file, { mode: this.value("viewCopy") }),
    );
    this.renderer.suspend();
    spawnSync(process.env.EDITOR ?? "vi", [path], { stdio: "inherit" });
    this.renderer.resume();
    this.draw();
  }

  /** A background promise's failure becomes a status badge; unhandled, OpenTUI would pop its console over the page. */
  private safe(p: Promise<unknown>): void {
    p.catch((e: unknown) => this.draw(`ERROR ${e instanceof Error ? e.message : String(e)}`));
  }

  /** Write the store once; with `what` and ids, log each change for anyone watching. */
  private persist(what?: Change["what"], ...ids: string[]): void {
    if (this.file) {
      // Events follow the write, so a watcher never wakes for a comment that is not on disk yet.
      this.safe(
        save(this.file, this.store).then(() => {
          for (const id of what ? ids : []) {
            append(this.file, { event: "comment", by: process.env.USER ?? "you", id, what });
          }
        }),
      );
    }
  }

  /** The file is the channel: follow the comments json and the markdown on disk, no mode.
   * Our own writes come back as no-ops because the content matches. The markdown's directory
   * is watched with no name filter: an editor's save can show up under a temp name only. */
  private follow(): void {
    if (!this.file) {
      return;
    }
    const dir = join(home(), "comments");
    mkdirSync(dir, { recursive: true });
    const mine = basename(storePath(this.file));
    try {
      this.stops = [
        follow(
          dir,
          (name) => name.startsWith(mine),
          () => this.safe(this.reloadStore()),
        ),
        follow(
          dirname(this.file),
          () => true,
          () => this.safe(this.reloadDoc()),
        ),
      ];
    } catch {
      // Watching is best effort (some mounts refuse); the TUI still works without it.
    }
  }

  /** Re-read comments; badge what changed elsewhere, keep an open comment box untouched. */
  private async reloadStore(): Promise<void> {
    const fresh = await load(this.file);
    const diff = changes(this.store, fresh).filter((x) => x.what !== "new" || !x.c.archivedAt);
    // Adopt disk every time: a CLI clear, prune or mark shows up as no diff, yet must not be written back.
    this.store = fresh;
    if (diff.length === 0) {
      this.draw(undefined, true);
      return;
    }
    const added = diff.filter((x) => x.what === "new");
    const n = added.length;
    const replies = added.filter((x) => x.c.re).length;
    this.draw(
      n === 0
        ? "COMMENTS UPDATED"
        : `${n} NEW ${replies === n ? (n === 1 ? "REPLY" : "REPLIES") : n === 1 ? "COMMENT" : "COMMENTS"}`,
      true,
    );
  }

  /** Re-read the markdown; the cursor follows its line through the rewrite (`track`).
   * Waits (badged) while an overlay is open or edits are unsaved. */
  private async reloadDoc(): Promise<void> {
    let text: string;
    try {
      text = await readFile(this.file, "utf-8");
    } catch {
      return;
    }
    // An empty read is a writer caught between truncate and write; its next event brings the text.
    if (text === this.doc.text || !text) {
      this.stale = false;
      return;
    }
    if (this.overlay || this.dirty) {
      this.stale = true;
      this.draw("FILE CHANGED ON DISK");
      return;
    }
    this.stale = false;
    this.tap.at = 0;
    const next = parseDocument(text);
    const line = track(this.doc.lines, next.lines)[this.view.cursor]?.to ?? 0;
    this.doc = next;
    this.view = { ...this.fit(), cursor: line };
    this.draw("RELOADED", true);
  }

  private async save(): Promise<void> {
    const text = this.doc.text;
    if (this.file) {
      await atomic(this.file, text);
    }
    // An edit that landed during the write is still unsaved.
    this.dirty = this.doc.text !== text;
    this.draw("SAVED");
  }

  /** The menu cyclers as settings rows with their current values. */
  private cyclers(): Command[] {
    return COMMANDS.filter((c) => c.id in CYCLES).map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      keys: [this.value(c.id as Cycle)],
    }));
  }

  /** Move cycler `id` by `dir` (wrapping), persist, redraw. */
  private step(id: Cycle, dir: number): void {
    const n = CYCLES[id].length;
    this.pick[id] = (((this.pick[id] + dir) % n) + n) % n;
    this.remember();
    this.draw(undefined, true);
  }

  private value<K extends Cycle>(id: K): (typeof CYCLES)[K][number] {
    return CYCLES[id][this.pick[id]]!;
  }

  /** Render options owned by the Style cyclers. */
  private style() {
    return {
      fences: this.value("viewFences"),
      numbers: this.value("viewNumbers"),
      quote: this.value("viewQuote"),
      flow: this.on.viewFlow,
      indent: this.on.viewIndent,
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
      // Not `jumpToLine`: that re-anchors the window on the cursor and makes the page snap.
      this.view = moveCursor(this.view, c - this.view.cursor, this.doc.lines.length);
    }
  }

  /** Render options for the current view; refreshes inline note rows and their comment ids. */
  private lay() {
    const inline = new Map<number, string[]>();
    this.ids.clear();
    const laid = {
      agent: this.prefs.agent as Align,
      own: this.prefs.own as Align,
      width: this.prefs.width as Layout,
      time: this.prefs.time as Time,
      now: Date.now(),
      color: this.on.viewColor === true,
    };
    const cols = Math.max(1, this.view.width - gutter(this.doc, this.style()));
    for (const [line, list] of notes(this.store, this.doc, {
      agent: this.on.viewInlineAgent === true,
      own: this.on.viewInlineOwn === true,
      me: process.env.USER,
    })) {
      const l = lay(list, cols, laid);
      inline.set(line, l.rows);
      this.ids.set(
        line,
        l.of.map((i) => list[i]!.id),
      );
    }
    return {
      inline,
      color: this.on.viewColor,
      emphasis: this.on.viewEmphasis,
      syntax: this.on.viewSyntax,
      hashes: this.on.viewHashes,
      marks: this.on.viewMarks,
      deco: this.on.viewDeco,
      links: this.on.viewLinks,
      pipes: this.on.viewPipes,
      highlight: this.prefs.line === "on",
      ...this.style(),
    };
  }

  /** Screen rows per line under the current options. */
  private spans(opts: ReturnType<TuiShell["lay"]>): (l: number) => number {
    return (l) => span(this.doc, l, this.view, opts);
  }

  /** Quote for a new comment: the caret's wrap segment when the line wraps, else nothing. */
  private slice(opts = this.lay()): string | undefined {
    const chunks = flow(
      this.doc,
      this.view.cursor,
      { ...opts, inline: undefined },
      Math.max(1, this.view.width - gutter(this.doc, opts)),
    );
    if (chunks.length < 2 || this.seg >= chunks.length) {
      return undefined;
    }
    // Continuation rows carry the hanging prefix (quote bars, list indent); the quote drops it.
    return strip(chunks[this.seg]!)
      .replace(/^[\s\u2502]+/, "")
      .trimEnd();
  }

  /** The comment id under the caret when it rests on an inline note row. */
  private note(opts = this.lay()): string | undefined {
    const w = span(this.doc, this.view.cursor, this.view, { ...opts, inline: undefined });
    return this.seg >= w ? this.ids.get(this.view.cursor)?.[this.seg - w] : undefined;
  }

  draw(mode = this.dirty ? "UNSAVED" : "VIEW", keep = false): void {
    if (this.count !== null) {
      mode = String(this.count);
    }
    const marks = markers(this.store, this.doc);
    this.crumb.node.visible = this.on.viewCrumb === true;
    this.bar.node.visible = this.on.viewBar === true;
    this.crumb.text = crumb(this.doc, this.view.cursor, Number(this.prefs.crumb) || Infinity);
    const opts = this.lay();
    // Keep the scroll margin honest in screen rows (hidden lines take none, wrapped ones several).
    const total = this.doc.lines.length;
    const rows = this.spans(opts);
    let line = this.view.cursor;
    // A line that lost its rows under the reader (flow on, fences hidden) hands the caret to the text above.
    while (keep && line > 0 && rows(line) === 0) line--;
    const c = pin({ line, seg: this.seg }, total, rows);
    const t =
      keep && this.row !== undefined
        ? hold(this.view, c, this.row - this.seg, total, rows)
        : fit(this.view, c, total, rows, this.row);
    this.seg = c.seg;
    this.view = { ...this.view, cursor: c.line, offset: t.line, skip: t.seg };
    this.row = gap(t, c, rows);
    this.text.content = styled(
      renderFrame(this.doc, this.view, { ...opts, markers: marks, seg: this.seg }).join("\n"),
    );
    const held = this.note(opts);
    const badge = held && this.store.get(held);
    this.status.update(
      statusBar(this.doc, this.view, {
        markers: marks,
        note: badge
          ? `${badge.author ?? "you"}: ${badge.text.split("\n")[0]!}  (r to reply)`
          : undefined,
      }),
    );
    // `Status > Badge corner` picks its corner; file name + edit state take the other one.
    const top = this.prefs.status === "top";
    const name = { state: this.dirty ? "(unsaved changes)" : "", file: basename(this.file) };
    this.bar.tail.set(top ? { badge: mode } : name);
    this.status.tail.set(top ? name : { badge: mode });
    this.renderer.requestRender();
    if (this.fade) {
      clearTimeout(this.fade);
    }
    this.fade =
      this.count !== null || mode === "VIEW" || mode === "UNSAVED"
        ? null
        : setTimeout(() => this.draw(), AGAIN);
  }

  /** Open the comment box on the cursor row; `c` (existing comment) turns it into an edit,
   * `sel` (drag-selected text) is kept on the comment and shown instead of the line. */
  private comment(c?: Comment, sel?: string): void {
    const line = this.view.cursor;
    const shown = sel ?? c?.quote ?? this.doc.lines[line] ?? "";
    this.open(
      new Modal(this.renderer, {
        title: c ? "Edit comment" : sel ? "Comment on selection" : "Comment",
        quote: shown.split("\n")[0]! + (shown.includes("\n") ? " …" : ""),
        value: c?.text,
        submit: (text) => {
          const n = c ? { ...c, text } : create(this.doc, line, text, Date.now(), sel);
          this.store.add(n);
          this.persist(c ? "edit" : "new", n.id);
          this.close();
          this.draw("SAVED", true);
        },
        close: () => this.close(),
      }),
    );
  }

  /** `r`: answer the thread on the cursor row (its first comment is the parent); several threads → pick one. */
  private reply(): void {
    const tops = this.tops();
    const open = (parent: Comment) =>
      this.open(
        new Modal(this.renderer, {
          title: "Reply",
          quote: `${parent.author ?? "you"}: ${parent.text.split("\n")[0]!}`,
          submit: (text) => {
            const n = { ...create(this.doc, this.view.cursor, text), re: parent.id };
            this.store.add(n);
            this.persist("new", n.id);
            this.close();
            this.draw("SAVED", true);
          },
          close: () => this.close(),
        }),
      );
    const held = this.note();
    if (held) {
      const p = this.root(held);
      if (p) {
        open(p);
        return;
      }
    }
    if (tops.length === 0) {
      this.draw("NO COMMENT HERE");
    } else if (tops.length === 1) {
      open(tops[0]!);
    } else {
      this.open(
        new Palette(
          this.renderer,
          (id) => open(this.store.get(id)!),
          () => this.close(),
          {
            title: "Reply to which",
            hint: "type to filter…",
            items: () =>
              tops.map((x) => ({
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

  /** The first comment of the thread `id` belongs to (itself when it is no reply). */
  private root(id: string): Comment | undefined {
    let p = this.store.get(id);
    while (p?.re && this.store.get(p.re)) {
      p = this.store.get(p.re);
    }
    return p;
  }

  /** Threads whose first comment sits on the cursor row. */
  private tops(): readonly Comment[] {
    return this.here().filter((c) => !c.re || !this.store.get(c.re));
  }

  /** `d`: archive the thread on the cursor row, replies included; several threads → pick one.
   * Archive is the TUI's delete: gone from the screen at once, back with `restore`, pruned by retention. */
  private archive(): void {
    const done = (top: Comment) => {
      const ids = [top.id];
      for (const c of this.store.live()) {
        if (c.re && ids.includes(c.re)) ids.push(c.id);
      }
      for (const id of ids) this.store.archive(id);
      this.persist("archive", ...ids);
      this.draw(`ARCHIVED ${ids.length}  restore via cli`, true);
    };
    const held = this.note();
    const top = held ? this.root(held) : undefined;
    if (top) {
      done(top);
      return;
    }
    const list = this.tops();
    if (list.length === 0) {
      this.draw("NO COMMENT HERE");
    } else if (list.length === 1) {
      done(list[0]!);
    } else {
      this.open(
        new Palette(
          this.renderer,
          (id) => done(this.store.get(id)!),
          () => this.close(),
          {
            title: "Archive which thread",
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

  /** Live comments anchored on the cursor row. */
  private here(): readonly Comment[] {
    return this.store
      .live()
      .filter((x) => this.store.resolve(x.anchor, this.doc)?.startLine === this.view.cursor);
  }

  /** `e`: edit the comment on the cursor row; with several, pick one first.
   * On an inline note row the caret names the comment, so it is edited directly. */
  private amend(): void {
    const held = this.note();
    if (held) {
      const c = this.store.get(held);
      if (c?.agent) {
        this.draw("AGENT COMMENT  r to reply");
        return;
      }
      if (c) {
        this.comment(c);
        return;
      }
    }
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

  /** Copy the full comments report (OSC-52 + file).
   * With `Comments › Archive on copy`, the copied comments are archived (recoverable via `--restore`). */
  private copy(): void {
    const list = this.store.live();
    if (!list.length) {
      this.draw("NO COMMENTS");
      return;
    }
    copy(report(list, this.doc, this.file, { mode: this.value("viewCopy") }), this.renderer);
    // OSC-52 is fire-and-forget: over SSH/remote the terminal may accept it without reaching the host clipboard.
    const note = this.renderer.capabilities?.remote ? "  a to show comments" : "";
    if (this.on.viewArchive) {
      for (const c of list) {
        this.store.archive(c.id);
      }
      this.persist("archive", ...list.map((c) => c.id));
      this.draw(`COPIED ${list.length}  ARCHIVED${note}`, true);
      return;
    }
    this.draw(`COPIED ${list.length}${note}`);
  }

  /** Run a command by id. */
  private run(id: string, n: number | null = null): void {
    // A split palette row `<cycler>=<index>` sets that value directly.
    if (id.includes("=")) {
      const [cycler, at] = id.split("=");
      this.pick[cycler as Cycle] = Number(at);
      this.remember();
      this.draw();
      return;
    }
    const total = this.doc.lines.length;
    switch (id) {
      case "goto":
        this.open(
          new Prompt(this.renderer, {
            title: "Go to line",
            submit: (text) => {
              if (!text.trim() || !this.doc.lines.length) {
                return;
              }
              const line = parse(text, this.doc.lines.length);
              if (line === undefined) {
                this.draw("INVALID LINE");
                return;
              }
              this.seg = 0;
              this.setCursor(line);
            },
            close: () => this.close(),
          }),
        );
        return;
      case "help":
        this.open(new Help(this.renderer, () => this.close()));
        return;
      case "palette":
        this.open(
          new Palette(
            this.renderer,
            (x) => this.run(x),
            () => this.close(),
            {
              items: () => verbs(COMMANDS, this.on, this.pick),
            },
          ),
        );
        return;
      case "comment":
        this.comment(undefined, this.slice());
        return;
      case "edit":
        this.amend();
        return;
      case "archive":
        this.archive();
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
            report(this.store.live(), this.doc, this.file, { mode: this.value("viewCopy") }),
            () => this.close(),
          ),
        );
        return;
      case "settings":
      case "viewMore":
        this.open(
          new Palette(
            this.renderer,
            (x, dir) => {
              if (x in CYCLES) {
                this.step(x as Cycle, dir);
                return;
              }
              this.prefs = cycle(this.prefs, x.slice(4), dir);
              this.remember();
              this.resize();
            },
            () => this.close(),
            {
              title: "Settings",
              query: id === "viewMore" ? "View >" : undefined,
              items: () => settings(this.prefs, this.cyclers()),
              stay: true,
            },
          ),
        );
        return;
      case "viewFences":
      case "viewCaret":
      case "viewCheck":
      case "viewCopy":
      case "viewQuote":
      case "viewNumbers":
        this.step(id, 1);
        return;
      case "reload":
        this.dirty = false;
        this.safe(this.reloadDoc().then(() => this.reloadStore()));
        return;
      case "save":
        this.safe(this.save());
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
      case "viewDeco":
      case "viewLinks":
      case "viewPipes":
      case "viewFront":
      case "viewCrumb":
      case "viewBar":
      case "viewFlow":
      case "viewIndent":
      case "viewArchive":
      case "viewSelect":
      case "viewInlineAgent":
      case "viewInlineOwn":
        this.on[id] = !this.on[id];
        this.remember();
        this.view = this.fit();
        this.draw(undefined, true);
        return;
      case "quit":
        if (this.dirty && Date.now() - this.guard > AGAIN) {
          this.guard = Date.now();
          this.draw(
            `Press ${hint(this.chord) || "^c"} again to exit with unsaved changes  ^s to save`,
          );
          return;
        }
        break;
      case "nextComment":
      case "prevComment":
      case "nextAgent":
      case "prevAgent":
        this.view = (id.startsWith("next") ? nextComment : prevComment)(
          this.view,
          total,
          this.store,
          this.doc,
          id.endsWith("Agent") ? (c) => c.agent === true : undefined,
        );
        this.seg = 0;
        this.row = undefined;
        this.draw();
        return;
      case "reply":
        this.reply();
        return;
    }
    if (id === "cursorDown" || id === "cursorUp") {
      if (n !== null) {
        if (n === 0) {
          return;
        }
        // A hidden tail falls back to the previous line's last row; counts land on its first.
        const line = this.view.cursor + (id === "cursorDown" ? n : -n);
        this.view = {
          ...this.view,
          cursor: pin(
            { line: Math.max(this.view.first ?? 0, line), seg: 0 },
            total,
            this.spans(this.lay()),
          ).line,
        };
        this.seg = 0;
        this.draw();
        return;
      }
      const c = walk(
        { line: this.view.cursor, seg: this.seg },
        id === "cursorDown" ? 1 : -1,
        total,
        this.spans(this.lay()),
      );
      this.view = { ...this.view, cursor: c.line };
      this.seg = c.seg;
      this.draw();
      return;
    }
    const action = reduceCommand(id, this.view, this.doc.lines.length);
    if (action.quit) {
      this.dispose();
    } else if (action.vp) {
      const prev = this.view.cursor;
      this.view = action.vp;
      this.seg = 0;
      this.row = undefined;
      this.settle(prev);
      this.draw();
    }
  }

  private onKey = (e: KeyEvent): void => {
    this.chord = toChord(e);
    if (!this.overlay && /^[0-9]$/.test(this.chord)) {
      e.preventDefault();
      this.count = Math.min(9999, (this.count ?? 0) * 10 + Number(this.chord));
      this.draw();
      return;
    }
    const n = this.count;
    this.count = null;
    if (n !== null) {
      this.draw();
    }
    if (this.overlay?.key(e)) {
      return;
    }
    if (e.name === "f10") {
      this.menuOpen(0);
      return;
    }
    const id = matchKey(this.chord)?.id as CommandId | undefined;
    if (id !== "quit") {
      this.guard = 0;
    }
    if (id) {
      e.preventDefault(); // keep the opening key out of an overlay's input
      const menu = this.cur;
      const row = this.overlay instanceof Dropdown ? this.overlay.index : 0;
      this.run(id, id === "cursorDown" || id === "cursorUp" ? n : null);
      if (menu >= 0 && this.cur === menu) {
        this.menuOpen(menu, row); // rebuild so toggles flipped by key show their new state
      }
    }
  };

  private resize(): void {
    this.view = this.fit();
    this.overlay?.place?.();
    this.draw(undefined, true);
  }

  dispose(): void {
    for (const stop of this.stops) stop();
    if (this.file) {
      append(this.file, { event: "quit", by: process.env.USER ?? "you" });
    }
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
