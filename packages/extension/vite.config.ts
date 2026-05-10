import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("VITE_") && !(key in process.env)) {
      process.env[key] = value;
    }
  }

  const { default: manifest } = await import("./manifest.config.js");

  return {
    plugins: [react(), crx({ manifest })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          sidepanel: path.resolve(__dirname, "src/sidepanel/index.html"),
          options: path.resolve(__dirname, "src/options/index.html"),
          popup: path.resolve(__dirname, "src/popup/index.html"),
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
  };
});
