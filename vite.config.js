import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // For GitHub Pages deployment
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  server: {
    port: 8000,
    open: true,
  },
});
