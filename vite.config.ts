import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

// Trial builds strip third-party font links at BUILD time so the served
// /try/index.html references same-origin assets only, and link the trial
// manifest so the app is installable offline. No runtime race, auditable
// by viewing page source. Desktop builds are untouched.
const isTrialBuild = process.env.VITE_TRIAL === '1';
const trialHtml = {
  name: 'lance-trial-html',
  transformIndexHtml(html: string) {
    if (!isTrialBuild) return html;
    const kept = html.split('\n').filter((line) => !line.includes('fonts.bunny.net'));
    const manifest = '  <link rel="manifest" href="/try/manifest.trial.webmanifest" />';
    return kept.join('\n').replace('</head>', `${manifest}\n  </head>`);
  },
};

export default defineConfig(({ command }) => ({
  plugins: [react(), trialHtml],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Test mode ("godmode") is a dev + trial affordance. This has to be a
    // build-time constant rather than `import.meta.env.DEV` at the render
    // site: the DEV flag folded to `false || isTrial()`, so the whole panel
    // shipped in the production desktop bundle and the store rehydrated the
    // flag from localStorage with no guard at all, writing
    // lance:test-mode={"active":true,"tier":"pro"} granted permanent Pro.
    // Substituted as a literal so the bundler drops the dead branches.
    __TEST_MODE__: JSON.stringify(command === 'serve' || isTrialBuild),
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
    // name, oxc is the default. Sourcemaps stay off: the trial publishes
    // build.json hashes, and shipping .map files would leak source.
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Rolldown replaces Rollup's manualChunks with codeSplitting.groups.
        // Each group is a module-id regex; keep the chunk names identical to
        // the old manualChunks keys because the trial service worker and the
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
