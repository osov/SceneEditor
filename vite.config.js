import includeHtml from "./src/pluginTpl.js";
import { DynamicPublicDirectory } from "vite-multiple-assets";
import { defineConfig } from 'vite';
import { resolve, dirname } from "path"
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Путь к проекту можно передать через переменную окружения
const projectPath = process.env.PROJECT_PATH || '../test-project';

// Корневая директория для проектов (на уровень выше SceneEditor)
const projectsRoot = resolve(__dirname, '..');

console.log('[vite.config] PROJECT_PATH:', projectPath);
const dirAssets = [
  { input: "public/**", output: "/", watch: true },
  { input: `${projectPath}/public/**`, output: "/", watch: false },
  { input: `${projectPath}/assets/**`, output: "/", watch: false }
];
console.log('[vite.config] dirAssets:', JSON.stringify(dirAssets, null, 2));

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
  server: {
    host: true,
    hmr: true,
    fs: {
      // Разрешаем доступ к файлам за пределами корня проекта
      allow: [
        // Текущий проект
        resolve(__dirname),
        // Родительская директория (где находятся все проекты SceneEditor_*)
        projectsRoot,
        // node_modules
        resolve(__dirname, 'node_modules'),
      ],
      strict: false,
    },
  },
})