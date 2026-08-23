import { defineCommand, runMain } from "citty";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseDocument, type Document } from "./core/document.ts";
import { render as renderFrame } from "./core/renderer.ts";
import { createViewport, DEFAULT_WIDTH } from "./core/viewport.ts";
import { archive, clear, home, load, path, restore, save } from "./core/store.ts";
import { report } from "./core/report.ts";
import { json, read } from "./core/read.ts";
import type { Comment, CommentStore } from "./core/comment.ts";
import { create } from "./core/comments.ts";

const VERBS = [
  "list",
  "mark",
  "read",
  "print",
  "status",
  "add",
  "edit",
  "archive",
  "restore",
  "clear",
] as const;

/** The CLI's own author: `$MDTATION_AUTHOR`, else `agent`. */
const me = () => process.env.MDTATION_AUTHOR ?? "agent";
/** Label for comments without an author: the local human. */
const human = () => process.env.USER ?? "you";

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
    },
    async run({ args }) {
      const file = resolve(args.file);
      const verb = args.verb as (typeof VERBS)[number] | undefined;
      if (verb && !VERBS.includes(verb)) {
        console.error(`mdtation: unknown verb ${verb}; try ${VERBS.join(", ")}`);
        process.exit(2);
      }
      const rest = args._.slice(2);
      const who = args.author ?? me();
      if (verb === "status") {
        const store = await load(file);
        console.log(
          [
            `file      ${file}`,
            `comments  ${path(file)}`,
            `live      ${store.live().length}`,
            `archived  ${store.all().length - store.live().length}`,
            `marks     ${store.marks.map((m) => `${new Date(m.at).toISOString()}${m.by ? ` ${m.by}` : ""}${m.name ? ` ${m.name}` : ""}`).join(", ") || "none"}`,
            `last copy ${home()}/last-copy.md`,
          ].join("\n"),
        );
        return;
      }
      if (verb === "clear") {
        console.error(`mdtation: cleared ${await clear(file)} comments for ${basename(file)}`);
        return;
      }
      if (verb === "archive" || verb === "restore") {
        const n = await (verb === "archive" ? archive : restore)(file, rest);
        console.error(`mdtation: ${verb}d ${n} comments`);
        return;
      }
      if (verb === "mark") {
        const store = await load(file);
        store.mark(Date.now(), who, rest[0]);
        await save(file, store);
        console.error(`mdtation: marked${rest[0] ? ` ${rest[0]}` : ""} for ${who}`);
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
      if (verb === "add" || verb === "edit") {
        const store = await load(file);
        const id = (verb === "add" ? add : edit)(store, doc, rest, args, who);
        await save(file, store);
        console.error(`mdtation: ${verb === "add" ? "added" : "edited"} ${id}`);
        return;
      }
      if (verb === "list" || verb === "read") {
        const store = await load(file);
        const list = pick(store, args.archived === true, args.since, who);
        if (verb === "read") {
          process.stdout.write(
            args.json
              ? JSON.stringify(json(list, store, doc, file, human())) + "\n"
              : read(list, store, doc, human()),
          );
        } else if (args.json) {
          process.stdout.write(
            list.map((c) => JSON.stringify(c)).join("\n") + (list.length ? "\n" : ""),
          );
        } else {
          process.stdout.write(report(list, doc, file, { archived: args.archived }));
        }
        if (args.archive) {
          await archive(
            file,
            list.map((c) => c.id),
          );
        }
        return;
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

type Opts = { line?: string; re?: string; human?: boolean };

/** `add "text" --line N | --re <id>`: a new comment by `who`; replies copy the parent's anchor. */
function add(store: CommentStore, doc: Document, rest: string[], a: Opts, who: string): string {
  const text = rest[0];
  const parent = a.re ? store.get(a.re) : undefined;
  if (!text || (!a.line && !parent)) {
    die(a.re && !parent ? `no comment ${a.re}` : 'add needs "text" and --line N or --re <id>');
  }
  const line = parent ? (store.resolve(parent.anchor, doc)?.startLine ?? 0) : Number(a.line) - 1;
  if (!parent && !(line >= 0 && line < doc.lines.length)) {
    die(`--line ${a.line} is outside 1..${doc.lines.length}`);
  }
  const c: Comment = {
    ...create(doc, line, text),
    author: who,
    ...(a.human ? {} : { agent: true as const }),
    ...(parent ? { re: parent.id } : {}),
  };
  store.add(c);
  return c.id;
}

/** `edit <id> "text"`. */
function edit(store: CommentStore, _doc: Document, rest: string[]): string {
  const c = rest[0] ? store.get(rest[0]) : undefined;
  if (!c || !rest[1]) {
    die(c ? 'edit needs the new "text"' : `no comment ${rest[0]}`);
  }
  store.add({ ...c, text: rest[1] });
  return c.id;
}

function die(msg: string): never {
  console.error(`mdtation: ${msg}`);
  process.exit(2);
}

/** Live (or all) comments, optionally only those after `since`: `last` = my latest mark, a mark name, or an ISO time. */
function pick(
  store: CommentStore,
  all: boolean,
  since: string | undefined,
  who: string,
): Comment[] {
  const list = [...(all ? store.all() : store.live())];
  if (!since) {
    return list;
  }
  const at =
    since === "last"
      ? (store.since(who)?.at ?? 0)
      : (store.since(undefined, since)?.at ?? Date.parse(since));
  if (Number.isNaN(at)) {
    console.error(`mdtation: --since ${since} is neither last, a mark name, nor a date`);
    process.exit(2);
  }
  return list.filter((c) => c.createdAt > at);
}

async function stdoutRender(doc: Document): Promise<void> {
  const width = process.stdout.columns ?? DEFAULT_WIDTH;
  const vp = createViewport(0, 0, width, doc.lines.length);
  process.stdout.write(renderFrame(doc, vp).join("\n") + "\n");
}
