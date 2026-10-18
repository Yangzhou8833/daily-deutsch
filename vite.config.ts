import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on GitHub Pages sub-paths as well as Vercel.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
