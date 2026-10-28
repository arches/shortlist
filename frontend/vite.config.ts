import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// shortlist.principles.md: the frontend bundle carries no configuration. The
// only environment-specific thing it needs is the API's own address, and that
// comes from detecting where the frontend is running — so every request goes to
// a relative /api path and the dev server forwards it to the api container.
// Nothing is injected, and no fetch stands between load and first paint.
//
// This file is outside src/, which is where the enforcement rule applies: the
// proxy target is the dev server's own configuration, not the bundle's.
const API_ORIGIN = process.env.SHORTLIST_API_ORIGIN ?? "http://api:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: API_ORIGIN,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
