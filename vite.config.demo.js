/**
 * Vite config for building the demo app (SPA) for deployment (e.g. Netlify).
 * Use: npm run build:demo
 * Output: dist-demo/
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  root: ".",
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
  server: {
    headers: {
      "Content-Security-Policy":
        "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "d3"],
  },
});
