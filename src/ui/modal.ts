/** Centered comment modal: quoted target line, an input that grows with the text it holds
 * (word wraps and shift+↵ breaks), esc cancel / ↵ save (both clickable). */
import { BoxRenderable, TextareaRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import { wrapWords } from "../core/unicode.ts";
import { center } from "./overlay.ts";
import type { Overlay } from "./overlay.ts";

export interface ModalOpts {
  readonly title: string;
  readonly quote: string;
  /** Initial input text (for edits). */
  readonly value?: string;
  readonly submit: (text: string) => void;
  readonly close: () => void;
}

export class Modal implements Overlay {
  readonly node: BoxRenderable;
  private readonly renderer: CliRenderer;
  private readonly input: TextareaRenderable;
  private readonly opts: ModalOpts;
  /** Columns the input has for text; the row count is measured against it. */
  private readonly inner: number;

  constructor(renderer: CliRenderer, opts: ModalOpts) {
    this.opts = opts;
    this.renderer = renderer;
    const width = Math.max(30, Math.min(60, renderer.width - 4));
    const height = 5;
    this.node = new BoxRenderable(renderer, {
      id: "mdtation-modal",
      position: "absolute",
      width,
      height,
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
    const inner = (this.inner = width - 4);
    const quote = opts.quote.length > inner ? opts.quote.slice(0, inner - 1) + "…" : opts.quote;
    this.node.add(new TextRenderable(renderer, { content: quote, fg: "#808080", width: inner }));
    this.input = new TextareaRenderable(renderer, {
      width: inner,
      height: 1,
      wrapMode: "word",
      placeholder: "your comment",
      initialValue: opts.value ?? "",
      backgroundColor: "#2a2d2a",
      focusedBackgroundColor: "#2a2d2a",
    });
    this.input.onContentChange = () => this.grow();
    this.node.add(this.input);
    const foot = new BoxRenderable(renderer, {
      width: inner,
      height: 1,
      flexDirection: "row",
      justifyContent: "flex-end",
    });
    foot.add(
      new TextRenderable(renderer, {
        content: "esc cancel",
        fg: "#808080",
        onMouseUp: () => this.cancel(),
      }),
    );
    foot.add(
      new TextRenderable(renderer, {
        content: "  ↵ save",
        fg: "#808080",
        onMouseUp: () => this.save(),
      }),
    );
    this.node.add(foot);
    this.input.focus();
    this.input.gotoBufferEnd();
    // An edit opens on an existing comment, which may already be several rows tall.
    this.grow();
  }

  /** Size the input to the rows its text really takes, wraps and shift+↵ breaks alike,
   * so one line stays compact and a long comment is read whole. Past what the screen
   * holds the input scrolls instead of growing, keeping the end (where you type) in view. */
  private grow(): void {
    // 4 = border top and bottom, the quoted line, the footer.
    const rows = Math.min(
      Math.max(1, this.renderer.height - 6),
      wrapWords(this.input.plainText, this.inner).length,
    );
    if (rows !== this.input.height) {
      this.input.height = rows;
      this.node.height = rows + 4;
      center(this.node, this.renderer, rows + 4);
    }
  }

  private cancel(): void {
    this.opts.close();
  }

  private save(): void {
    const text = this.input.plainText.trim();
    if (text) {
      this.opts.submit(text);
      this.opts.close();
    }
  }

  /** A click outside cancels only while the box is still empty; typed text is never lost to a stray click. */
  away(): boolean {
    return !this.input.plainText.trim();
  }

  place(): void {
    center(this.node, this.renderer);
  }

  key(e: KeyEvent): boolean {
    if (e.name === "escape") {
      this.cancel();
    } else if ((e.name === "return" || e.name === "enter") && e.shift) {
      e.preventDefault();
      this.input.insertText("\n");
      this.grow();
    } else if (e.name === "return" || e.name === "enter") {
      e.preventDefault();
      this.save();
    }
    return true;
  }

  dispose(): void {
    this.input.blur();
  }
}
