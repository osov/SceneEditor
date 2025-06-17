import includeHtml from "./src/pluginTpl.js";
import { defineConfig } from 'vite';
import { resolve } from "path"

export default defineConfig({
  plugins: [
    includeHtml()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, "./src"),
      '@editor': resolve(__dirname, 'src'),
      'three': resolve(__dirname, 'node_modules/three'),
      '@tweenjs/tween.js': resolve(__dirname, 'node_modules/@tweenjs/tween.js')
    }
  },
  base: "./",
  build: { outDir: "dist" },
  publicDir: false,
  server: { host: true, hmr: true, },
})