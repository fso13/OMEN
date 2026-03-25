import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Для GitHub Pages (project site): задать в CI `GITHUB_PAGES_BASE=/имя-репозитория/` */
const base = process.env.GITHUB_PAGES_BASE?.trim() || "./";

export default defineConfig({
  plugins: [react()],
  base,
});
