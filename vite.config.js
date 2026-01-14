import includeHtml from "./src/pluginTpl.js";
import { DynamicPublicDirectory } from "vite-multiple-assets";
import { defineConfig } from 'vite';
import { resolve } from "path"

// Путь к проекту можно передать через переменную окружения
const projectPath = process.env.PROJECT_PATH || '../test-project';

const dirAssets = [
  { input: "public/**", output: "/", watch: true },
  { input: `${projectPath}/{public,assets}/**`, output: "/", watch: true }
];

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".zip": "application/zip",
  ".ktx2": "image/ktx2",
  ".basis": "image/basis",
};

export default defineConfig({
  plugins: [
    includeHtml(),
    DynamicPublicDirectory(dirAssets, { ssr: !true, mimeTypes })
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