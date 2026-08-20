/**
 * hunk-style chrome: menu bar (label boxes + file name), dropdown overlay,
 * sticky breadcrumb row, status bar. Pure models live in core/menu.ts and
 * core/crumb.ts; this file only wires OpenTUI boxes and mouse handlers.
 */
import { BoxRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import type { Overlay } from "./overlay.ts";
import { step, type Menu, type Spec, width } from "../core/menu.ts";
import { displayWidth } from "../core/unicode.ts";

export const THEME = {
  bar: "#262626",
  panel: "#1c1c1c",
  active: "#3a3a5c",
  border: "#5a5a5a",
  text: "#d0d0d0",
  muted: "#8a8a8a",
  badge: "#5f87af",
} as const;

function pad(s: string, w: number): string {
  return s + " ".repeat(Math.max(0, w - displayWidth(s)));
}

export class MenuBar {
  readonly node: BoxRenderable;
  private readonly boxes: BoxRenderable[] = [];
  private readonly labels: TextRenderable[] = [];

  constructor(
    renderer: CliRenderer,
    specs: readonly Spec[],
    file: string,
    on: { hover(i: number): void; toggle(i: number): void },
  ) {
    this.node = new BoxRenderable(renderer, {
      id: "menubar",
      height: 1,
      width: "100%",
      flexDirection: "row",
      paddingLeft: 1,
      backgroundColor: THEME.bar,
    });
    specs.forEach((s, i) => {
      const box = new BoxRenderable(renderer, {
        id: `menu-${s.id}`,
        width: s.width,
        height: 1,
        backgroundColor: THEME.bar,
        onMouseOver: () => on.hover(i),
        onMouseUp: () => on.toggle(i),
      });
      const label = new TextRenderable(renderer, {
        content: ` ${s.label} `,
        fg: THEME.muted,
        selectable: false,
        wrapMode: "none",
      });
      box.add(label);
      this.node.add(box);
      this.boxes.push(box);
      this.labels.push(label);
    });
    const right = new BoxRenderable(renderer, {
      flexGrow: 1,
      height: 1,
      justifyContent: "flex-end",
      backgroundColor: THEME.bar,
    });
    right.add(
      new TextRenderable(renderer, {
        content: ` ${file} `,
        fg: THEME.muted,
        selectable: false,
        wrapMode: "none",
        truncate: true,
      }),
    );
    this.node.add(right);
  }

  /** Highlight menu `i` (null clears). */
  set active(i: number | null) {
    this.boxes.forEach((b, k) => {
      b.backgroundColor = k === i ? THEME.active : THEME.bar;
      this.labels[k]!.fg = k === i ? THEME.text : THEME.muted;
    });
  }
}

/** Bordered dropdown under a menu label. Keys: ↑/↓ move, ↵ runs, ←/→ switch menus, esc closes. */
export class Dropdown implements Overlay {
  readonly node: BoxRenderable;
  private readonly rows: BoxRenderable[] = [];
  private index = 0;

  constructor(
    renderer: CliRenderer,
    private readonly menu: Menu,
    spec: Spec,
    private readonly on: { run(id: string): void; close(): void; switch(delta: number): void },
  ) {
    const inner = Math.min(width(menu), Math.max(20, renderer.width - 4));
    this.node = new BoxRenderable(renderer, {
      id: "dropdown",
      position: "absolute",
      top: 1,
      left: Math.max(0, Math.min(spec.left, renderer.width - inner - 2)),
      width: inner + 2,
      height: menu.entries.length + 2,
      zIndex: 40,
      border: true,
      borderColor: THEME.border,
      backgroundColor: THEME.panel,
      flexDirection: "column",
    });
    menu.entries.forEach((e, i) => {
      const row = new BoxRenderable(renderer, {
        height: 1,
        width: inner,
        backgroundColor: THEME.panel,
        onMouseOver: () => this.focus(i),
        onMouseUp: () => on.run(e.id),
      });
      row.add(
        new TextRenderable(renderer, {
          content: pad(`  ${e.title}`, inner - displayWidth(e.hint) - 1) + e.hint,
          fg: THEME.text,
          selectable: false,
          wrapMode: "none",
        }),
      );
      this.node.add(row);
      this.rows.push(row);
    });
    this.focus(0);
  }

  private focus(i: number): void {
    this.index = i;
    this.rows.forEach((r, k) => {
      r.backgroundColor = k === i ? THEME.active : THEME.panel;
    });
  }

  key(e: KeyEvent): boolean {
    switch (e.name) {
      case "down":
        this.focus(step(this.index, 1, this.rows.length));
        return true;
      case "up":
        this.focus(step(this.index, -1, this.rows.length));
        return true;
      case "right":
        this.on.switch(1);
        return true;
      case "left":
        this.on.switch(-1);
        return true;
      case "return":
        this.on.run(this.menu.entries[this.index]!.id);
        return true;
      case "escape":
        this.on.close();
        return true;
      default:
        return false;
    }
  }
}

/** Dim heading path, sticky under the menu bar. */
export class Crumb {
  readonly node: TextRenderable;

  constructor(renderer: CliRenderer) {
    this.node = new TextRenderable(renderer, {
      id: "crumb",
      height: 1,
      width: "100%",
      content: "",
      fg: THEME.muted,
      selectable: false,
      wrapMode: "none",
      truncate: true,
    });
  }

  set text(s: string) {
    this.node.content = ` ${s}`;
  }
}

/** Left info text, right mode badge. */
export class StatusBar {
  readonly node: BoxRenderable;
  private readonly left: TextRenderable;
  private readonly badge: TextRenderable;

  constructor(renderer: CliRenderer, on: { click(): void }) {
    this.node = new BoxRenderable(renderer, {
      id: "statusbar",
      height: 1,
      width: "100%",
      flexDirection: "row",
      paddingLeft: 1,
      backgroundColor: THEME.bar,
      onMouseUp: () => on.click(),
    });
    this.left = new TextRenderable(renderer, {
      flexGrow: 1,
      content: "",
      fg: THEME.muted,
      selectable: false,
      wrapMode: "none",
      truncate: true,
    });
    this.badge = new TextRenderable(renderer, {
      content: "",
      fg: THEME.panel,
      bg: THEME.badge,
      selectable: false,
      wrapMode: "none",
    });
    this.node.add(this.left);
    this.node.add(this.badge);
  }

  update(info: string, mode: string): void {
    this.left.content = info;
    this.badge.content = ` ${mode} `;
  }
}
