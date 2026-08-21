/** Big read-only popup with the full comments report; text is selectable, ↑/↓ scroll, esc closes. */
import { BoxRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import type { Overlay } from "./overlay.ts";
import { THEME } from "./chrome.ts";

export class All implements Overlay {
  readonly node: BoxRenderable;
  private readonly renderer: CliRenderer;
  private readonly text: TextRenderable;
  private readonly lines: string[];
  private rows: number;
  private top = 0;

  constructor(renderer: CliRenderer, report: string, close: () => void) {
    this.renderer = renderer;
    this.lines = report.split("\n");
    const width = Math.max(20, renderer.width - 4);
    const height = Math.max(5, renderer.height - 4);
    this.rows = height - 2;
    this.node = new BoxRenderable(renderer, {
      position: "absolute",
      zIndex: 100,
      width,
      height,
      left: 2,
      top: 2,
      border: true,
      borderColor: THEME.badge,
      backgroundColor: THEME.panel,
      title: " All comments | esc closes | select to copy ",
      titleAlignment: "center",
      paddingLeft: 1,
      paddingRight: 1,
    });
    this.text = new TextRenderable(renderer, {
      content: "",
      width: width - 4,
      height: this.rows,
      selectable: true,
      wrapMode: "none",
      onMouseScroll: (e) => this.scroll(e.scroll?.direction === "down" ? 1 : -1),
    });
    this.node.add(this.text);
    this.close = close;
    this.scroll(0);
  }

  private readonly close: () => void;

  private scroll(delta: number): void {
    this.top = Math.max(0, Math.min(this.top + delta, this.lines.length - this.rows));
    this.text.content = this.lines.slice(this.top, this.top + this.rows).join("\n");
  }

  /** Fill the terminal minus a 2-cell margin. */
  place(): void {
    this.node.width = Math.max(20, this.renderer.width - 4);
    this.node.height = Math.max(5, this.renderer.height - 4);
    this.rows = this.node.height - 2;
    this.text.width = this.node.width - 4;
    this.text.height = this.rows;
    this.scroll(0);
  }

  key(e: KeyEvent): boolean {
    switch (e.name) {
      case "escape":
      case "q":
        this.close();
        return true;
      case "down":
      case "j":
        this.scroll(1);
        return true;
      case "up":
      case "k":
        this.scroll(-1);
        return true;
      case "pagedown":
        this.scroll(this.rows);
        return true;
      case "pageup":
        this.scroll(-this.rows);
        return true;
      default:
        return true;
    }
  }
}
