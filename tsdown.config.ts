import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/bin.ts"],
  banner: { js: "#!/usr/bin/env node" },
});
