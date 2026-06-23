import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hashSecret(secret: string): string {
  let h = 5381;
  for (let i = 0; i < secret.length; i++) {
    h = ((h << 5) + h) + secret.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).toUpperCase();
}

const LICENSE_HASH = process.env.LANCE_LICENSE_SECRET
  ? hashSecret(process.env.LANCE_LICENSE_SECRET)
  : "DEVELOPMENT";

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
        pure_funcs: ["console.log", "console.info", "console.debug"],
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
        }
      },
    },
  },
});
