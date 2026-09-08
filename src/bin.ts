import { defineCommand, runMain } from "citty";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SKILL } from "./core/skill.ts";
import { parseDocument, type Document } from "./core/document.ts";
import { render as renderFrame } from "./core/renderer.ts";
import { createViewport, DEFAULT_WIDTH } from "./core/viewport.ts";
import { VERBS, me, run, watching, type Verb } from "./verbs.ts";

runMain(
  defineCommand({
    meta: {
      name: "mdtation",
      description: "Desktop-style terminal markdown viewer with clipboard comments.",
    },
    args: {
      file: { type: "positional", description: "Markdown file to view", required: true },
      verb: {
        type: "positional",
        description: `One of ${VERBS.join(", ")}; none opens the TUI`,
        required: false,
      },
      json: { type: "boolean", description: "list/read: JSON instead of markdown" },
      since: {
        type: "string",
        description: "list/read: only comments after last | <mark> | <iso>",
      },
      archived: { type: "boolean", description: "list/read: include archived comments" },
      archive: { type: "boolean", description: "list: archive what was printed" },
      author: {
        type: "string",
        description: "Act as this author (default $MDTATION_AUTHOR or agent)",
      },
      line: { type: "string", description: "add: 1-based line to comment on" },
      re: { type: "string", description: "add: id of the comment to reply to" },
      human: { type: "boolean", description: "add: a person, not an agent" },
      until: { type: "string", description: "watch: exit after this event (comment, open, quit)" },
      older: {
        type: "string",
        description: "expire: 1d, 7d, 30d, 1y (default: the retention setting)",
      },
    },
    async run({ args }) {
      if (args.file === "skill") {
        process.stdout.write(SKILL);
        return;
      }
      const file = resolve(args.file);
      const verb = args.verb as Verb | undefined;
      if (verb && !VERBS.includes(verb)) {
        die(`unknown verb ${verb}; try ${VERBS.join(", ")}`);
      }
      const who = args.author ?? me();
      if (verb === "watch") {
        await watching(file, who, args, (s) => process.stdout.write(s));
        return;
      }
      if (verb && verb !== "print") {
        try {
          const r = await run(file, verb, args._.slice(2), args, who);
          if (r.err) console.error(`mdtation: ${r.err}`);
          if (r.out) process.stdout.write(r.out);
        } catch (e) {
          die(e instanceof Error ? e.message : String(e));
        }
        return;
      }
      let doc: Document;
      try {
        doc = parseDocument(await readFile(file, "utf-8"));
      } catch {
        die(`cannot read ${file}`, 1);
      }
      if (verb === "print" || !process.stdout.isTTY) {
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
            "Use `print`, or run under Bun for the interactive TUI.",
        );
        await stdoutRender(doc);
      }
    },
  }),
);

function die(msg: string, code = 2): never {
  console.error(`mdtation: ${msg}`);
  process.exit(code);
}

async function stdoutRender(doc: Document): Promise<void> {
  const width = process.stdout.columns ?? DEFAULT_WIDTH;
  const vp = createViewport(0, 0, width, doc.lines.length);
  process.stdout.write(renderFrame(doc, vp).join("\n") + "\n");
}
