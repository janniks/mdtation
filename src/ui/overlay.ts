/**
 * Overlay contract. The shell keeps at most one overlay open (help, palette,
 * comment modal, menu dropdown). While open, the overlay gets every key first;
 * it returns true when it consumed the key. The shell removes `node` on close.
 */
import type { CliRenderer, KeyEvent } from "@opentui/core";
import type { BoxRenderable } from "@opentui/core";

export interface Overlay {
  /** Absolutely positioned box the shell adds to `renderer.root`; it also styles the border. */
  readonly node: BoxRenderable;
  /** Handle a key. Return true if consumed. */
  key(e: KeyEvent): boolean;
  /** A click outside the overlay. Return true to close; the click never reaches the body either way. */
  away?(): boolean;
  /** Re-fit to the terminal after a resize. */
  place?(): void;
  /** Called by the shell after the node is removed. Optional cleanup. */
  dispose?(): void;
}

/** Center `node` in the terminal (its own width/height must already be set). */
export function center(node: BoxRenderable, renderer: CliRenderer): void {
  node.left = Math.max(0, Math.floor((renderer.width - node.width) / 2));
  node.top = Math.max(0, Math.floor((renderer.height - node.height) / 2));
}
