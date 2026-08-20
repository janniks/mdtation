/**
 * Overlay contract. The shell keeps at most one overlay open (help, palette,
 * comment modal, menu dropdown). While open, the overlay gets every key first;
 * it returns true when it consumed the key. The shell removes `node` on close.
 */
import type { KeyEvent, Renderable } from "@opentui/core";

export interface Overlay {
  /** Absolutely positioned renderable the shell adds to `renderer.root`. */
  readonly node: Renderable;
  /** Handle a key. Return true if consumed. */
  key(e: KeyEvent): boolean;
  /** Called by the shell after the node is removed. Optional cleanup. */
  dispose?(): void;
}
