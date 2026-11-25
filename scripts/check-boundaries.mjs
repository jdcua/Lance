/**
 * Reports architectural boundary violations described in AGENTS.md.
 * Read-only, warn-only. Use `node scripts/check-boundaries.mjs --strict` to
 * fail once the backlog is cleared.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const files = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f));
const violations = [];

function importsOf(file) {
  const text = readFileSync(file, 'utf8');
  const found = [];
  for (const match of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    found.push(match[1]);
  }
  return found;
}

function report(file, rule, detail) {
  violations.push(`${rule}: ${file} -> ${detail}`);
}

const basenames = new Map();
for (const file of files) {
  const name = path.basename(file);
  basenames.set(name, [...(basenames.get(name) || []), file]);

  const imp = importsOf(file);
  const isUi = file.startsWith('src/components/') || file.startsWith('src/screens/');
  const isLib = file.startsWith('src/lib/') && !file.startsWith('src/lib/engines/');

  if (isUi) {
    for (const spec of imp) {
      if (spec.startsWith('@tauri-apps/')) report(file, 'ui-direct-tauri', spec);
    }
  }
  if (file.startsWith('src/components/')) {
    for (const spec of imp) {
      if (spec.includes('screens/')) report(file, 'component-imports-screen', spec);
    }
  }
  if (isLib) {
    for (const spec of imp) {
      if (/(store|db|screens|components)/.test(spec)) report(file, 'lib-imports-volatile', spec);
    }
  }
  if (file === 'src/db/index.ts') {
    for (const spec of imp) if (spec === './index') report(file, 'self-import', spec);
  }
  if (file !== 'src/store/index.ts') {
    const text = readFileSync(file, 'utf8');
    if (/\bcreate\s*\(\s*</.test(text) && text.includes('zustand')) {
      report(file, 'second-store', 'zustand create()');
    }
  }
}

for (const [name, paths] of basenames) {
  if (paths.length > 1 && (name === 'index.ts' || name === 'shared.tsx')) {
    violations.push(`duplicate-basename: ${name} (${paths.length} files)`);
  }
}

for (const v of violations) console.log(v);
console.log(`${violations.length} boundary warning(s).`);
if (process.argv.includes('--strict') && violations.length) process.exit(1);
