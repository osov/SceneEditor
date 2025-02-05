import includeHtml from "./src/pluginTpl.js";
import { DynamicPublicDirectory } from "vite-multiple-assets";
import { defineConfig } from 'vite';
import { resolve } from "path"

const dirAssets = ["public/**", "../ExampleProject/{\x01,assets}/**"];

export default defineConfig({
  plugins: [
    includeHtml(),
    DynamicPublicDirectory(dirAssets, { ssr: !true, })
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  },
  build: { outDir: "dist" },
  publicDir: false,
  server: { host: true, hmr: true, },
})