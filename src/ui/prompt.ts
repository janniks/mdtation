/** Centered single-line prompt; callers own parsing and actions. */
import { BoxRenderable, InputRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import { center } from "./overlay.ts";
import type { Overlay } from "./overlay.ts";

export class Prompt implements Overlay {
  readonly node: BoxRenderable;
  private readonly input: InputRenderable;

  constructor(
    private readonly renderer: CliRenderer,
    private readonly opts: {
      title: string;
      submit: (text: string) => void;
      close: () => void;
    },
  ) {
    const width = Math.max(30, Math.min(60, renderer.width - 4));
    this.node = new BoxRenderable(renderer, {
      id: "mdtation-prompt",
      position: "absolute",
      width,
      height: 3,
      zIndex: 10,
      border: true,
      title: ` ${opts.title} `,
      titleAlignment: "center",
      borderColor: "#9ec5e8",
      backgroundColor: "#1f211f",
      paddingLeft: 1,
      paddingRight: 1,
    });
    this.place();
    this.input = new InputRenderable(renderer, {
      width: width - 4,
      backgroundColor: "#2a2d2a",
      focusedBackgroundColor: "#2a2d2a",
    });
    this.node.add(this.input);
    this.input.focus();
  }

  key(e: KeyEvent): boolean {
    if (e.name === "escape") {
      e.preventDefault();
      this.opts.close();
    } else if (e.name === "return" || e.name === "enter") {
      e.preventDefault();
      const text = this.input.value;
      this.opts.close();
      this.opts.submit(text);
    }
    return true;
  }

  place(): void {
    center(this.node, this.renderer, 3);
  }

  away(): boolean {
    return !this.input.value.trim();
  }

  dispose(): void {
    this.input.blur();
    this.node.destroyRecursively();
  }
}
