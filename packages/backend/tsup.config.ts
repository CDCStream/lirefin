import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts" },
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: false,
  minify: false,
  splitting: false,
  noExternal: ["@fni/shared"],
  shims: false,
  dts: false,
});
