import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; CI sets BASE_PATH for that build.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
});
