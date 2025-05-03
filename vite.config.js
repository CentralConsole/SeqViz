import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.json"],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    extensions: [".js", ".jsx", ".json"],
  },
  publicDir: "public",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    headers: {
      "Content-Security-Policy":
        "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
    },
    hmr: {
      overlay: true,
      timeout: 30000,
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "d3"],
  },
});
