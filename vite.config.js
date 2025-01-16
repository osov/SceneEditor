import includeHtml from "./src/pluginTpl.js";

import { defineConfig } from 'vite';
import { resolve } from "path"

export default defineConfig({
  plugins: [ includeHtml() ],
  resolve: {
      alias: {
        "@": resolve(__dirname, "./src")
      }
  },
  build: {
    outDir: "dist"
  },
  server: {
    host: true,
    hmr: true,
    // strictPort: true
    // port: 3000,
  },
})