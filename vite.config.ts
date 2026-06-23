import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex").slice(0, 32).toUpperCase();
}

const SECRET = process.env.LANCE_LICENSE_SECRET;
if (!SECRET) {
  console.error("LANCE_LICENSE_SECRET environment variable is required for production builds");
  process.exit(1);
}
const LICENSE_HASH = hashSecret(SECRET);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __LANCE_LICENSE_HASH__: JSON.stringify(LICENSE_HASH),
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
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug", "console.warn", "console.error"],
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
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
