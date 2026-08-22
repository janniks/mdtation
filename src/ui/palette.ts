/** `/` command palette: input on top, filtered items (default `COMMANDS`) below, ↵ runs the selected id.
 * With `stay`, the palette stays open and re-reads `items` after each run (settings mode). */
import { BoxRenderable, InputRenderable, StyledText, TextRenderable, bg, dim } from "@opentui/core";
import type { CliRenderer, KeyEvent, MouseEvent, TextChunk } from "@opentui/core";
import { COMMANDS } from "../core/commands.ts";
import type { Command } from "../core/commands.ts";
import { hint } from "../core/menu.ts";
import { filter } from "../core/palette.ts";
import { center } from "./overlay.ts";
import type { Overlay } from "./overlay.ts";
import { chunk } from "./styled.ts";

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

  constructor(
    renderer: CliRenderer,
    private run: (id: string, dir: number) => void,
    private close: () => void,
    opts: { title?: string; hint?: string; items?: () => readonly Command[]; stay?: boolean } = {},
  ) {
    this.renderer = renderer;
    this.items = opts.items ?? (() => COMMANDS);
    this.stay = opts.stay ?? false;
    this.hits = [...this.items()];
    this.inner = Math.min(48, Math.max(24, renderer.width - 4));
    this.max = Math.max(1, Math.min(this.hits.length, renderer.height - 5));
    const height = this.max + 4 + (this.stay ? 1 : 0);
    this.node = new BoxRenderable(renderer, {
      position: "absolute",
      zIndex: 100,
      width: this.inner + 2,
      height,
      border: true,
      borderColor: "#7aa2f7",
      backgroundColor: "#1a1b26",
      title: ` ${opts.title ?? "Command"} `,
      titleAlignment: "center",
      flexDirection: "column",
    });
    this.place();
    this.input = new InputRenderable(renderer, {
      width: "100%",
      placeholder: opts.hint ?? (this.stay ? "↵ cycles the value" : "type a command…"),
      backgroundColor: "#1a1b26",
      focusedBackgroundColor: "#1a1b26",
    });
    this.input.on("input", () => {
      this.hits = filter(this.items(), this.input.value);
      this.sel = 0;
      this.draw();
    });
    this.list = new TextRenderable(renderer, {
      width: "100%",
      height: this.max,
      selectable: false,
      onMouseUp: (e: MouseEvent) => this.pick(e.y - this.list.y),
    });
    this.node.add(this.input);
    this.node.add(
      new TextRenderable(renderer, {
        content: new StyledText([dim(chunk("─".repeat(this.inner)))]),
      }),
    );
    this.node.add(this.list);
    if (this.stay) {
      this.node.add(
        new TextRenderable(renderer, {
          content: new StyledText([dim(chunk("esc close  ← → or ↵ change".padStart(this.inner)))]),
        }),
      );
    }
    // Focus after the opening keypress finished dispatching, else `/` lands in the input.
    queueMicrotask(() => this.input.focus());
    this.draw();
  }

  private draw(): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    const out: TextChunk[] = [];
    this.hits.slice(from, from + this.max).forEach((c, i) => {
      // Settings rows carry their value, not a chord: show it verbatim, like the menu does.
      const h = this.stay ? `[${c.keys[0] ?? ""}]` : hint(c.keys[0]);
      const text = `  ${c.title}${" ".repeat(Math.max(1, this.inner - c.title.length - h.length - 4))}${h}  `;
      const row = from + i === this.sel ? bg("#364a82")(chunk(text)) : chunk(text);
      out.push(row, chunk("\n"));
    });
    this.list.content = new StyledText(
      out.length ? out.slice(0, -1) : [dim(chunk("  no matches"))],
    );
  }

  private pick(row: number, dir = 1): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    const c = this.hits[from + row];
    if (!c) return;
    if (this.stay) {
      this.run(c.id, dir);
      this.hits = filter(this.items(), this.input.value);
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
