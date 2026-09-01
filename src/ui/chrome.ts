/**
 * hunk-style chrome: menu bar (label boxes + file name), dropdown overlay,
 * sticky breadcrumb row, status bar. Pure models live in core/menu.ts and
 * core/crumb.ts; this file only wires OpenTUI boxes and mouse handlers.
 */
import { BoxRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import type { Overlay } from "./overlay.ts";
import { prefix, step, type Menu, type Spec, width } from "../core/menu.ts";
import { displayWidth, pad } from "../core/unicode.ts";

export const THEME = {
  bar: "#242624",
  panel: "#1f211f",
  active: "#34402f",
  border: "#5c615c",
  text: "#e8e6df",
  // Key hints sit a step below the label they belong to, so the title reads first.
  hint: "#b3b7b1",
  muted: "#8a8f8a",
  badge: "#6f9e68",
  warn: "#e9d28a",
} as const;

export class MenuBar {
  readonly node: BoxRenderable;
  private readonly boxes: BoxRenderable[] = [];
  private readonly labels: TextRenderable[] = [];
  /** Right end: edit state, file name and/or the mode badge (what goes where is the shell's call). */
  readonly tail: Tail;

  constructor(
    renderer: CliRenderer,
    specs: readonly Spec[],
    on: { hover(i: number): void; toggle(i: number): void },
  ) {
    this.node = new BoxRenderable(renderer, {
      id: "menubar",
      height: 1,
      width: "100%",
      flexDirection: "row",
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
    this.tail = new Tail(renderer);
    this.node.add(this.tail.node);
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
  index = 0;

  constructor(
    renderer: CliRenderer,
    private readonly menu: Menu,
    spec: Spec,
    private readonly on: { run(id: string): void; close(): void; switch(delta: number): void },
    at = 0,
  ) {
    const inner = Math.min(width(menu), Math.max(20, renderer.width - 4));
    this.node = new BoxRenderable(renderer, {
      id: "dropdown",
      position: "absolute",
      top: 1,
      left: Math.max(0, Math.min(spec.left, renderer.width - inner - 2)),
      width: inner + 2,
      height: menu.entries.length + menu.entries.filter((e) => e.group).length + 2,
      zIndex: 40,
      border: true,
      borderColor: THEME.border,
      backgroundColor: THEME.panel,
      flexDirection: "column",
    });
    let rows = 0;
    menu.entries.forEach((e, i) => {
      if (e.group) {
        // Spacer keeps the flex column honest; the title row overdraws the border so it joins it.
        this.node.add(new BoxRenderable(renderer, { height: 1, width: inner }));
        this.node.add(
          new TextRenderable(renderer, {
            position: "absolute",
            top: rows,
            left: -1,
            // A nameless section is just a rule; no gap where the title would sit.
            content: e.group.trim()
              ? `├─ ${e.group} ${"─".repeat(Math.max(0, inner - displayWidth(e.group) - 3))}┤`
              : `├${"─".repeat(inner)}┤`,
            fg: THEME.border,
            selectable: false,
            wrapMode: "none",
          }),
        );
        rows++;
      }
      rows++;
      const row = new BoxRenderable(renderer, {
        height: 1,
        width: inner,
        backgroundColor: THEME.panel,
        onMouseOver: () => this.focus(i),
        onMouseUp: () => on.run(e.id),
      });
      row.add(
        new TextRenderable(renderer, {
          content: pad(prefix(e) + e.title, inner - displayWidth(e.hint) - 1),
          fg: THEME.text,
          selectable: false,
          wrapMode: "none",
        }),
      );
      if (e.hint) {
        row.add(
          new TextRenderable(renderer, {
            position: "absolute",
            top: 0,
            left: inner - displayWidth(e.hint) - 1,
            content: e.hint,
            fg: THEME.hint,
            selectable: false,
            wrapMode: "none",
          }),
        );
      }
      this.node.add(row);
      this.rows.push(row);
    });
    this.focus(Math.min(at, this.rows.length - 1));
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

/** Right end of a bar: `(unsaved changes)`, the file name, and the mode badge, each optional. */
export class Tail {
  readonly node: BoxRenderable;
  private readonly state: TextRenderable;
  private readonly file: TextRenderable;
  private readonly badge: TextRenderable;

  constructor(renderer: CliRenderer) {
    this.node = new BoxRenderable(renderer, {
      flexGrow: 1,
      height: 1,
      flexDirection: "row",
      justifyContent: "flex-end",
      backgroundColor: THEME.bar,
    });
    this.state = new TextRenderable(renderer, { content: "", fg: THEME.warn, selectable: false });
    this.file = new TextRenderable(renderer, {
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
    for (const t of [this.state, this.file, this.badge]) {
      this.node.add(t);
    }
  }

  set(parts: { state?: string; file?: string; badge?: string }): void {
    this.state.content = parts.state ? `${parts.state} ` : "";
    this.file.content = parts.file ? ` ${parts.file} ` : "";
    this.badge.content = parts.badge ? ` ${parts.badge} ` : "";
  }
}

/** Left info text, right `Tail`. */
export class StatusBar {
  readonly node: BoxRenderable;
  private readonly left: TextRenderable;
  readonly tail: Tail;

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
      content: "",
      fg: THEME.muted,
      selectable: false,
      wrapMode: "none",
      truncate: true,
    });
    this.tail = new Tail(renderer);
    this.node.add(this.left);
    this.node.add(this.tail.node);
  }

  update(info: string): void {
    this.left.content = info;
  }
}
