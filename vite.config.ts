import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    // Vite 8 builds with Rolldown (oxc), so there is no 'esbuild' minifier to
    // name, oxc is the default. Sourcemaps stay off for release builds.
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Rolldown replaces Rollup's manualChunks with codeSplitting.groups.
        // Each group is a module-id regex; keep the chunk names identical to
        // the old manualChunks keys because the release worker and the
        // build attestation both key off the emitted filenames.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](react|react-dom|react-router-dom|zustand|lucide-react)[\\/]/,
            },
            { name: 'tiptap', test: /node_modules[\\/]@tiptap[\\/]/ },
            { name: 'pdf', test: /node_modules[\\/](@react-pdf|pdfjs-dist)[\\/]/ },
            {
              name: 'tauri',
              test: /node_modules[\\/]@tauri-apps[\\/](api|plugin-sql|plugin-fs|plugin-dialog|plugin-process|plugin-updater)[\\/]/,
            },
            { name: 'import', test: /node_modules[\\/](mammoth|xlsx|@xmldom)[\\/]/ },
            { name: 'export', test: /node_modules[\\/](docx|@zip.js)[\\/]/ },
          ],
        },
      },
    },
  },
}));
