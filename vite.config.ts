import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const configuredBase = (process.env.APP_BASE_PATH ?? "").trim();
const base = configuredBase
  ? `/${configuredBase.replace(/^\/+|\/+$/g, "")}/`
  : "/";
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3001",
    },
  },
  build: { outDir: "dist/public" },
});
