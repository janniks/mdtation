/** One-row notice floating over a corner of the body; hidden while it has no text. */
import { BoxRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import { displayWidth } from "../core/unicode.ts";
import { THEME } from "../core/theme.ts";

export class Toast {
  readonly node: BoxRenderable;
  private readonly text: TextRenderable;

  constructor(
    private readonly renderer: CliRenderer,
    click: () => void,
  ) {
    this.node = new BoxRenderable(renderer, {
      position: "absolute",
      zIndex: 50,
      height: 1,
      visible: false,
      backgroundColor: THEME.input,
      onMouseUp: click,
    });
    this.text = new TextRenderable(renderer, { content: "", fg: THEME.badge, selectable: false });
    this.node.add(this.text);
  }

  /** Show `text` on screen row `top`, against the right edge; empty text hides it. */
  set(text: string, top: number): void {
    this.node.visible = text !== "";
    this.text.content = ` ${text} `;
    this.node.width = displayWidth(text) + 2;
    this.node.top = top;
    this.node.left = Math.max(0, this.renderer.width - displayWidth(text) - 3);
  }
}
