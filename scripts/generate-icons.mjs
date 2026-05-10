// Render the Lirefin brand mark to Chrome extension icon sizes.
//
// Source of truth: `assets/lirefin-logo-v2.png` — the AI-generated master
// (open book whose pages form an ascending bar chart, capped by a green peak
// dot, on a clean white squircle). The script trims the surrounding white
// canvas, then resizes into Chrome's required icon sizes plus a transparent
// variant for dark UI overlays.
//
// Run with:  pnpm icons   (or)   node scripts/generate-icons.mjs

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "assets/lirefin-logo-v2.png");
const OUT_DIR = resolve(ROOT, "packages/extension/public/icons");

const SIZES = [16, 32, 48, 128];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Trim the empty white border around the squircle so the mark fills more
  // of each rendered icon at small sizes. `threshold` keeps near-white
  // pixels as background; the AI render leaves a faint off-white halo so we
  // tolerate up to ~6 levels of brightness drop before treating it as
  // foreground.
  const masterPng = await sharp(SOURCE)
    .trim({ threshold: 6 })
    .resize(1024, 1024, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  for (const size of SIZES) {
    const out = resolve(OUT_DIR, `icon-${size}.png`);
    await sharp(masterPng)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${out}`);
  }

  // Generic alias used by the manifest if a specific size is unavailable.
  await sharp(masterPng)
    .resize(128, 128, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT_DIR, "icon.png"));

  // Transparent variant — strip the white background by making white pixels
  // transparent. Used when the mark is rendered on its own (e.g. side panel
  // header without a frame). Anti-alias edges scale by brightness so the
  // outline stays smooth instead of jagged.
  const { data, info } = await sharp(masterPng)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const luma = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (luma > 235) {
      data[i + 3] = 0;
    } else if (luma > 200) {
      data[i + 3] = Math.max(0, 255 - Math.round((luma - 200) * 7.3));
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT_DIR, "icon-transparent.png"));
  console.log(`✓ ${resolve(OUT_DIR, "icon-transparent.png")}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
