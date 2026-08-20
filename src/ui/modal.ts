/** Centered comment modal: quoted target line, one-line input, ↵ save / esc cancel. */
import { BoxRenderable, InputRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import type { Overlay } from "./overlay.ts";

export interface ModalOpts {
  readonly title: string;
  readonly quote: string;
  readonly submit: (text: string) => void;
  readonly close: () => void;
}

export class Modal implements Overlay {
  readonly node: BoxRenderable;
  private readonly input: InputRenderable;
  private readonly opts: ModalOpts;

  constructor(renderer: CliRenderer, opts: ModalOpts) {
    this.opts = opts;
    const width = Math.max(30, Math.min(60, renderer.width - 4));
    const height = 5;
    this.node = new BoxRenderable(renderer, {
      id: "mdtation-modal",
      position: "absolute",
      left: Math.max(0, Math.floor((renderer.width - width) / 2)),
      top: Math.max(0, Math.floor((renderer.height - height) / 2)),
      width,
      height,
      zIndex: 10,
      border: true,
      title: ` ${opts.title} `,
      titleAlignment: "center",
      backgroundColor: "#1e1e1e",
      paddingLeft: 1,
      paddingRight: 1,
    });
    const inner = width - 4;
    const quote = opts.quote.length > inner ? opts.quote.slice(0, inner - 1) + "…" : opts.quote;
    this.node.add(new TextRenderable(renderer, { content: quote, fg: "#808080", width: inner }));
    this.input = new InputRenderable(renderer, {
      width: inner,
      placeholder: "your comment",
      backgroundColor: "#303030",
      focusedBackgroundColor: "#303030",
    });
    this.node.add(this.input);
    this.node.add(
      new TextRenderable(renderer, { content: "↵ save · esc cancel", fg: "#808080", width: inner }),
    );
    this.input.focus();
  }

  key(e: KeyEvent): boolean {
    if (e.name === "escape") {
      this.opts.close();
    } else if (e.name === "return" || e.name === "enter") {
      const text = this.input.value.trim();
      if (text) {
        this.opts.submit(text);
        this.opts.close();
      }
    }
    return true;
  }

  dispose(): void {
    this.input.blur();
  }
}
