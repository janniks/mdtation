/** `/` command palette: input on top, filtered `COMMANDS` below, ↵ runs the selected id. */
import { BoxRenderable, InputRenderable, StyledText, TextRenderable, bg, dim } from "@opentui/core";
import type { CliRenderer, KeyEvent, MouseEvent, TextChunk } from "@opentui/core";
import { COMMANDS } from "../core/commands.ts";
import type { Command } from "../core/commands.ts";
import { filter, hint } from "../core/palette.ts";
import type { Overlay } from "./overlay.ts";

const chunk = (text: string): TextChunk => ({ __isChunk: true, text });

export class Palette implements Overlay {
  readonly node: BoxRenderable;
  private input: InputRenderable;
  private list: TextRenderable;
  private hits: Command[] = [...COMMANDS];
  private sel = 0;
  private inner: number;
  private max: number;

  constructor(
    renderer: CliRenderer,
    private run: (id: string) => void,
    private close: () => void,
  ) {
    this.inner = Math.min(48, Math.max(24, renderer.width - 4));
    this.max = Math.max(1, Math.min(COMMANDS.length, renderer.height - 5));
    const height = this.max + 4;
    this.node = new BoxRenderable(renderer, {
      position: "absolute",
      zIndex: 100,
      width: this.inner + 2,
      height,
      left: Math.max(0, Math.floor((renderer.width - this.inner - 2) / 2)),
      top: Math.max(0, Math.floor((renderer.height - height) / 2)),
      border: true,
      borderColor: "#7aa2f7",
      backgroundColor: "#1a1b26",
      title: " Command ",
      titleAlignment: "center",
      flexDirection: "column",
    });
    this.input = new InputRenderable(renderer, {
      width: "100%",
      placeholder: "type a command…",
      backgroundColor: "#1a1b26",
      focusedBackgroundColor: "#1a1b26",
    });
    this.input.on("input", () => {
      this.hits = filter(COMMANDS, this.input.value);
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
    // Focus after the opening keypress finished dispatching, else `/` lands in the input.
    queueMicrotask(() => this.input.focus());
    this.draw();
  }

  private draw(): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    const out: TextChunk[] = [];
    this.hits.slice(from, from + this.max).forEach((c, i) => {
      const h = hint(c.keys);
      const text = `  ${c.title}${" ".repeat(Math.max(1, this.inner - c.title.length - h.length - 4))}${h}  `;
      const row = from + i === this.sel ? bg("#364a82")(chunk(text)) : chunk(text);
      out.push(row, chunk("\n"));
    });
    this.list.content = new StyledText(
      out.length ? out.slice(0, -1) : [dim(chunk("  no matches"))],
    );
  }

  private pick(row: number): void {
    const from = Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max));
    const c = this.hits[from + row];
    if (!c) return;
    this.close();
    this.run(c.id);
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
    } else if (e.name === "return" || e.name === "enter") {
      e.preventDefault();
      this.pick(
        this.sel - Math.max(0, Math.min(this.sel - this.max + 1, this.hits.length - this.max)),
      );
    }
    return true;
  }

  dispose(): void {
    this.input.blur();
    this.node.destroyRecursively();
  }
}
