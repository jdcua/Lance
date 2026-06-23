// vite.config.ts
import { defineConfig } from "file:///home/cuajuandiego/Lance/node_modules/vite/dist/node/index.js";
import react from "file:///home/cuajuandiego/Lance/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
var __vite_injected_original_import_meta_url = "file:///home/cuajuandiego/Lance/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex").slice(0, 32).toUpperCase();
}
var SECRET = process.env.LANCE_LICENSE_SECRET;
if (!SECRET) {
  console.error("LANCE_LICENSE_SECRET environment variable is required for production builds");
  process.exit(1);
}
var LICENSE_HASH = hashSecret(SECRET);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  define: {
    __LANCE_LICENSE_HASH__: JSON.stringify(LICENSE_HASH)
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug", "console.warn", "console.error"]
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    },
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "zustand", "lucide-react"],
          tiptap: ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-placeholder", "@tiptap/extension-typography"],
          pdf: ["@react-pdf/renderer", "pdfjs-dist"],
          tauri: ["@tauri-apps/api", "@tauri-apps/plugin-sql", "@tauri-apps/plugin-fs", "@tauri-apps/plugin-dialog", "@tauri-apps/plugin-process", "@tauri-apps/plugin-updater"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9jdWFqdWFuZGllZ28vTGFuY2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2N1YWp1YW5kaWVnby9MYW5jZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9jdWFqdWFuZGllZ28vTGFuY2Uvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwidXJsXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmZ1bmN0aW9uIGhhc2hTZWNyZXQoc2VjcmV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHNlY3JldCkuZGlnZXN0KFwiaGV4XCIpLnNsaWNlKDAsIDMyKS50b1VwcGVyQ2FzZSgpO1xufVxuXG5jb25zdCBTRUNSRVQgPSBwcm9jZXNzLmVudi5MQU5DRV9MSUNFTlNFX1NFQ1JFVDtcbmlmICghU0VDUkVUKSB7XG4gIGNvbnNvbGUuZXJyb3IoXCJMQU5DRV9MSUNFTlNFX1NFQ1JFVCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyByZXF1aXJlZCBmb3IgcHJvZHVjdGlvbiBidWlsZHNcIik7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn1cbmNvbnN0IExJQ0VOU0VfSEFTSCA9IGhhc2hTZWNyZXQoU0VDUkVUKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGRlZmluZToge1xuICAgIF9fTEFOQ0VfTElDRU5TRV9IQVNIX186IEpTT04uc3RyaW5naWZ5KExJQ0VOU0VfSEFTSCksXG4gIH0sXG4gIGNsZWFyU2NyZWVuOiBmYWxzZSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMTQyMCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIHdhdGNoOiB7XG4gICAgICBpZ25vcmVkOiBbXCIqKi9zcmMtdGF1cmkvKipcIl0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBtaW5pZnk6IFwidGVyc2VyXCIsXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgICBwdXJlX2Z1bmNzOiBbXCJjb25zb2xlLmxvZ1wiLCBcImNvbnNvbGUuaW5mb1wiLCBcImNvbnNvbGUuZGVidWdcIiwgXCJjb25zb2xlLndhcm5cIiwgXCJjb25zb2xlLmVycm9yXCJdLFxuICAgICAgfSxcbiAgICAgIG1hbmdsZToge1xuICAgICAgICB0b3BsZXZlbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBmb3JtYXQ6IHtcbiAgICAgICAgY29tbWVudHM6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbScsICd6dXN0YW5kJywgJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICAgIHRpcHRhcDogWydAdGlwdGFwL3JlYWN0JywgJ0B0aXB0YXAvc3RhcnRlci1raXQnLCAnQHRpcHRhcC9leHRlbnNpb24tcGxhY2Vob2xkZXInLCAnQHRpcHRhcC9leHRlbnNpb24tdHlwb2dyYXBoeSddLFxuICAgICAgICAgIHBkZjogWydAcmVhY3QtcGRmL3JlbmRlcmVyJywgJ3BkZmpzLWRpc3QnXSxcbiAgICAgICAgICB0YXVyaTogWydAdGF1cmktYXBwcy9hcGknLCAnQHRhdXJpLWFwcHMvcGx1Z2luLXNxbCcsICdAdGF1cmktYXBwcy9wbHVnaW4tZnMnLCAnQHRhdXJpLWFwcHMvcGx1Z2luLWRpYWxvZycsICdAdGF1cmktYXBwcy9wbHVnaW4tcHJvY2VzcycsICdAdGF1cmktYXBwcy9wbHVnaW4tdXBkYXRlciddLFxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFAsU0FBUyxvQkFBb0I7QUFDdlIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUM5QixPQUFPLFlBQVk7QUFKcUksSUFBTSwyQ0FBMkM7QUFNek0sSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsU0FBUyxXQUFXLFFBQXdCO0FBQzFDLFNBQU8sT0FBTyxXQUFXLFFBQVEsRUFBRSxPQUFPLE1BQU0sRUFBRSxPQUFPLEtBQUssRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLFlBQVk7QUFDM0Y7QUFFQSxJQUFNLFNBQVMsUUFBUSxJQUFJO0FBQzNCLElBQUksQ0FBQyxRQUFRO0FBQ1gsVUFBUSxNQUFNLDZFQUE2RTtBQUMzRixVQUFRLEtBQUssQ0FBQztBQUNoQjtBQUNBLElBQU0sZUFBZSxXQUFXLE1BQU07QUFFdEMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sd0JBQXdCLEtBQUssVUFBVSxZQUFZO0FBQUEsRUFDckQ7QUFBQSxFQUNBLGFBQWE7QUFBQSxFQUNiLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE9BQU87QUFBQSxNQUNMLFNBQVMsQ0FBQyxpQkFBaUI7QUFBQSxJQUM3QjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLGVBQWU7QUFBQSxRQUNmLFlBQVksQ0FBQyxlQUFlLGdCQUFnQixpQkFBaUIsZ0JBQWdCLGVBQWU7QUFBQSxNQUM5RjtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sVUFBVTtBQUFBLE1BQ1o7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFVBQVU7QUFBQSxNQUNaO0FBQUEsSUFDRjtBQUFBLElBQ0EsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsYUFBYSxvQkFBb0IsV0FBVyxjQUFjO0FBQUEsVUFDNUUsUUFBUSxDQUFDLGlCQUFpQix1QkFBdUIsaUNBQWlDLDhCQUE4QjtBQUFBLFVBQ2hILEtBQUssQ0FBQyx1QkFBdUIsWUFBWTtBQUFBLFVBQ3pDLE9BQU8sQ0FBQyxtQkFBbUIsMEJBQTBCLHlCQUF5Qiw2QkFBNkIsOEJBQThCLDRCQUE0QjtBQUFBLFFBQ3ZLO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
