#!/usr/bin/env node
/**
 * Produce a Chrome Web Store upload ZIP from packages/extension/dist.
 *
 * Usage (from repo root):
 *   pnpm zip:webstore   (runs the build first, then this script)
 *
 * The ZIP is written to dist-zip/lirefin-extension-v{version}-{timestamp}.zip
 * and uses whatever was last built into packages/extension/dist (so it picks
 * up .env.production via Vite's loadEnv configured in vite.config.ts).
 */

import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createWriteStream } from "node:fs";
import archiver from "archiver";

const repoRoot = resolve(import.meta.dirname, "..");
const distDir = join(repoRoot, "packages", "extension", "dist");
const zipDir = join(repoRoot, "dist-zip");

if (!existsSync(join(distDir, "manifest.json"))) {
  console.error(
    `✗ ${distDir} not found. Run 'pnpm --filter @fni/extension build' first.`
  );
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(join(distDir, "manifest.json"), "utf8")
);
const version = manifest.version;
const stamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 12);
const zipName = `lirefin-extension-v${version}-${stamp}.zip`;
const zipPath = join(zipDir, zipName);

mkdirSync(zipDir, { recursive: true });
try {
  rmSync(zipPath);
} catch {
  // file may not exist; ignore
}

console.log(`→ Zipping → ${zipPath}`);
await new Promise((resolveZip, rejectZip) => {
  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolveZip);
  archive.on("error", rejectZip);
  archive.pipe(output);
  archive.directory(distDir, false);
  archive.finalize();
});

console.log(`✓ Done. Upload ${zipPath} to the Chrome Web Store.`);
console.log(`  Manifest version: ${version}`);
console.log(`  Backend URL    : ${manifest.host_permissions.find((h) => h.includes("railway")) ?? "(not detected)"}`);
