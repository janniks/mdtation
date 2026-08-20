import { defineCommand, runMain } from "citty";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDocument, type Document } from "./core/document.ts";
import { render as renderFrame } from "./core/renderer.ts";
import { createViewport, DEFAULT_WIDTH } from "./core/viewport.ts";
import { clear, home } from "./core/store.ts";

runMain(
  defineCommand({
    meta: {
      name: "mdtation",
      description: "Desktop-style terminal markdown viewer with clipboard comments.",
    },
    args: {
      file: {
        type: "positional",
        description: "Markdown file to view",
        required: true,
      },
      // Named `tui` (default true) so the standard `--no-tui` form negates it
      // correctly under citty/scule's kebab parsing.
      tui: {
        type: "boolean",
        description: "Open the fullscreen TUI (default). Use --no-tui to render to stdout.",
        default: true,
      },
      clear: { type: "boolean", description: "Forget the comments saved for this file" },
      where: { type: "boolean", description: "Print the data dir holding comments.json" },
    },
    async run({ args }) {
      const file = resolve(args.file);
      if (args.where) {
        console.log(home());
        return;
      }
      if (args.clear) {
        console.error(`mdtation: cleared ${await clear(file)} comments for ${file}`);
        return;
      }
      let text: string;
      try {
        text = await readFile(file, "utf-8");
      } catch {
        console.error(`mdtation: cannot read ${file}`);
        process.exit(1);
      }
      const doc = parseDocument(text);

      if (!args.tui) {
        await stdoutRender(doc);
        return;
      }

      // Fullscreen TUI via OpenTUI, imported lazily so the native core only
      // loads under Bun; on Node it rejects and we fall back to the stdout render.
      try {
        await (await import("./ui/tui.ts")).runTui(doc, file);
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e ?? "renderer unavailable");
        console.error(
          `mdtation: fullscreen TUI unavailable (${why}); rendering to stdout. ` +
            "Use --no-tui, or run under Bun for the interactive TUI.",
        );
        await stdoutRender(doc);
      }
    },
  }),
);

async function stdoutRender(doc: Document): Promise<void> {
  const width = process.stdout.columns ?? DEFAULT_WIDTH;
  const vp = createViewport(0, 0, width, doc.lines.length);
  process.stdout.write(renderFrame(doc, vp).join("\n") + "\n");
}
