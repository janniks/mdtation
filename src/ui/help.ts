/** `?` help overlay: centered box, one section per category, key column live from `COMMANDS`. */
import { BoxRenderable, StyledText, TextRenderable, bold, dim } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import { COMMANDS } from "../core/commands.ts";
import { rows } from "../core/palette.ts";
import type { Overlay } from "./overlay.ts";
import { chunk } from "./styled.ts";

export class Help implements Overlay {
  readonly node: BoxRenderable;

  constructor(renderer: CliRenderer, close: () => void) {
    const sections = rows(COMMANDS);
    const items = sections.flatMap((s) => s.items);
    const inner = Math.min(
      Math.max(24, ...items.map((i) => i.title.length + i.hint.length + 4)),
      Math.max(24, renderer.width - 4),
    );
    const lines = sections.length * 2 + items.length + 1;
    const height = Math.min(lines + 2, Math.max(3, renderer.height));
    this.node = new BoxRenderable(renderer, {
      position: "absolute",
      zIndex: 100,
      width: inner + 2,
      height,
      left: Math.max(0, Math.floor((renderer.width - inner - 2) / 2)),
      top: Math.max(0, Math.floor((renderer.height - height) / 2)),
      border: true,
      borderColor: "#7aa2f7",
      backgroundColor: "#1a1b26",
      title: " Help ",
      titleAlignment: "center",
      flexDirection: "column",
      onMouseUp: close,
    });
    for (const s of sections) {
      this.node.add(
        new TextRenderable(renderer, { content: new StyledText([bold(chunk(s.category))]) }),
      );
      for (const i of s.items) {
        const gap = Math.max(1, inner - i.title.length - i.hint.length);
        this.node.add(
          new TextRenderable(renderer, {
            content: new StyledText([chunk(i.title + " ".repeat(gap)), dim(chunk(i.hint))]),
          }),
        );
      }
      this.node.add(new TextRenderable(renderer, { content: "" }));
    }
    this.node.add(
      new TextRenderable(renderer, { content: new StyledText([dim(chunk("esc / ? to close"))]) }),
    );
    this.close = close;
  }

  private close: () => void;

  key(e: KeyEvent): boolean {
    if (e.name === "escape" || e.name === "?" || e.name === "q") this.close();
    return true;
  }

  dispose(): void {
    this.node.destroyRecursively();
  }
}
