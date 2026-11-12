/** `/` command palette: input on top, filtered items (default `COMMANDS`) below, ↵ runs the selected id.
 * With `stay`, the palette stays open and re-reads `items` after each run (settings mode). */
import {
  BoxRenderable,
  InputRenderable,
  StyledText,
  TextRenderable,
  bg,
  bold,
  dim,
} from "@opentui/core";
import type { CliRenderer, KeyEvent, MouseEvent, TextChunk } from "@opentui/core";
import { COMMANDS } from "../core/commands.ts";
import type { Command } from "../core/commands.ts";
import { hint } from "../core/menu.ts";
import { filter } from "../core/palette.ts";
import { center } from "./overlay.ts";
import type { Overlay } from "./overlay.ts";
import { chunk } from "./styled.ts";
import { THEME } from "../core/theme.ts";

export class Palette implements Overlay {
  readonly node: BoxRenderable;
  private readonly renderer: CliRenderer;
  private input: InputRenderable;
  private list: TextRenderable;
  private hits: Command[];
  private sel = 0;
  private inner: number;
  private max: number;
  private readonly items: () => readonly Command[];
  private readonly stay: boolean;
  private readonly rank?: (query: string) => Command[];
  private readonly move?: (id: string) => void;
  private readonly first: number;

  constructor(
    renderer: CliRenderer,
    private run: (id: string, dir: number) => void,
    private close: () => void,
    opts: {
      title?: string;
      hint?: string;
      items?: () => readonly Command[];
      stay?: boolean;
      query?: string;
      /** Replaces the default filter: the rows for a query, best first. */
      rank?: (query: string) => Command[];
      /** Told the row id each time typing or the arrows move the selection. */
      move?: (id: string) => void;
      /** Row selected while the query is empty. */
      sel?: number;
      /** Widest the popup may grow, in columns. */
      width?: number;
    } = {},
  ) {
    this.renderer = renderer;
    this.items = opts.items ?? (() => COMMANDS);
    this.stay = opts.stay ?? false;
    this.rank = opts.rank;
    this.move = opts.move;
    this.hits = this.find(opts.query ?? "");
    this.sel = this.first = Math.min(opts.sel ?? 0, Math.max(0, this.hits.length - 1));
    this.inner = Math.min(opts.width ?? 48, Math.max(24, renderer.width - 4));
    this.max = Math.max(1, Math.min(this.hits.length, renderer.height - 5));
    const height = this.max + 4 + (this.stay ? 1 : 0);
    this.node = new BoxRenderable(renderer, {
      position: "absolute",
      zIndex: 100,
      width: this.inner + 2,
      height,
      border: true,
      borderColor: THEME.accent,
      backgroundColor: THEME.panel,
      title: ` ${opts.title ?? "Command"} `,
      titleAlignment: "center",
      flexDirection: "column",
    });
    this.place();
    this.input = new InputRenderable(renderer, {
      textColor: THEME.text,
      focusedTextColor: THEME.text,
      placeholderColor: THEME.muted,
      width: "100%",
      value: opts.query ?? "",
      placeholder: opts.hint ?? (this.stay ? "↵ cycles the value" : "type a command…"),
      backgroundColor: THEME.panel,
      focusedBackgroundColor: THEME.panel,
    });
    this.input.on("input", () => {
      this.hits = this.find(this.input.value);
      this.sel = this.input.value.trim() ? 0 : this.first;
      this.draw();
      this.moved();
    });
    this.list = new TextRenderable(renderer, {
      fg: THEME.text,
      width: "100%",
      height: this.max,
      selectable: false,
      onMouseUp: (e: MouseEvent) => this.pick(e.y - this.list.y),
      onMouseMove: (e: MouseEvent) => this.hover(e.y - this.list.y),
    });
    this.node.add(this.input);
    this.node.add(
      new TextRenderable(renderer, {
        fg: THEME.text,
        content: new StyledText([dim(chunk("─".repeat(this.inner)))]),
      }),
    );
    this.node.add(this.list);
    if (this.stay) {
      this.node.add(
        new TextRenderable(renderer, {
          fg: THEME.text,
          content: new StyledText([dim(chunk("esc close  ← → or ↵ change".padStart(this.inner)))]),
        }),
      );
    }
    // Focus after the opening keypress finished dispatching, else `/` lands in the input.
    queueMicrotask(() => this.input.focus());
    this.draw();
  }

  private find(query: string): Command[] {
    return this.rank?.(query) ?? filter(this.items(), query);
  }

  private moved(): void {
    const c = this.hits[this.sel];
    if (c) this.move?.(c.id);
  }

  private draw(): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    const out: TextChunk[] = [];
    this.hits.slice(from, from + this.max).forEach((c, i) => {
      // Settings rows carry their value, not a chord: show it verbatim, like the menu does.
      const h = this.stay ? `[${c.keys[0] ?? ""}]` : hint(c.keys[0]);
      const room = this.inner - h.length - 5;
      const title = c.title.length > room ? `${c.title.slice(0, room - 1)}…` : c.title;
      const pad = " ".repeat(this.inner - title.length - h.length - 4);
      // Letters a fuzzy query matched are bold; a row without marks stays one chunk.
      const row = c.marks?.length
        ? [
            chunk("  "),
            ...title.split("").map((ch, k) => (c.marks!.includes(k) ? bold(chunk(ch)) : chunk(ch))),
            chunk(`${pad}${h}  `),
          ]
        : [chunk(`  ${title}${pad}${h}  `)];
      out.push(...(from + i === this.sel ? row.map(bg(THEME.active)) : row), chunk("\n"));
    });
    this.list.content = new StyledText(
      out.length ? out.slice(0, -1) : [dim(chunk("  no matches"))],
    );
  }

  /** Mouse over a row moves the highlight there (same as arrowing to it). */
  private hover(row: number): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    if (row >= 0 && from + row < this.hits.length && from + row !== this.sel) {
      this.sel = from + row;
      this.draw();
    }
  }

  private pick(row: number, dir = 1): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    const c = this.hits[from + row];
    if (!c) return;
    if (this.stay) {
      this.run(c.id, dir);
      this.hits = this.find(this.input.value);
      this.draw();
      return;
    }
    this.close();
    this.run(c.id, dir);
  }

  place(): void {
    center(this.node, this.renderer);
  }

  key(e: KeyEvent): boolean {
    if (e.name === "escape") {
      e.preventDefault();
      this.close();
    } else if (e.name === "down" || e.name === "up") {
      e.preventDefault();
      const n = this.hits.length;
      if (n) this.sel = (this.sel + (e.name === "down" ? 1 : n - 1)) % n;
      this.draw();
      this.moved();
    } else if (
      e.name === "return" ||
      e.name === "enter" ||
      (this.stay && (e.name === "left" || e.name === "right"))
    ) {
      e.preventDefault();
      this.pick(
        this.sel - Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max)),
        e.name === "left" ? -1 : 1,
      );
    }
    return true;
  }

  dispose(): void {
    this.input.blur();
    this.node.destroyRecursively();
  }
}
