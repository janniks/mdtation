#!/usr/bin/env node
// Launcher: the TUI needs Bun. Prefer the user's bun, then the bundled
// npm `bun` dependency, then fall back to Node (CLI verbs + stdout mode).
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const entry = join(__dirname, "..", "dist", "bin.js");
const argv = process.argv.slice(2);

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.error) return false;
  process.exit(res.status ?? 1);
}

if (!process.env.MDTATION_NODE) {
  run("bun", [entry, ...argv]);
  try {
    run(require.resolve("bun/bin/bun.exe"), [entry, ...argv]);
  } catch {}
}

import(entry);
