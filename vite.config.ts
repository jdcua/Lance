import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8"));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'lucide-react'],
          tiptap: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder', '@tiptap/extension-typography'],
          pdf: ['@react-pdf/renderer', 'pdfjs-dist'],
          tauri: ['@tauri-apps/api', '@tauri-apps/plugin-sql', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-process', '@tauri-apps/plugin-updater'],
          import: ['mammoth', 'xlsx'],
          export: ['docx'],
        }
      },
    },
  },
});
