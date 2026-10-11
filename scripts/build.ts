/**
 * Bundles the worker into dist/worker.js. Page assets (HTML, CSS, the web
 * app's script) are imported as text and inlined, so the output is a single
 * self-contained module that wrangler uploads without re-bundling.
 */
import { rm } from "node:fs/promises";

const OUT_DIR = "dist";

await rm(OUT_DIR, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: OUT_DIR,
  naming: "worker.js",
  target: "browser",
  format: "esm",
  sourcemap: "linked",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

for (const output of result.outputs) {
  const kib = (output.size / 1024).toFixed(1);
  console.log(`${output.path.replace(process.cwd(), ".")}  ${kib} KiB`);
}
