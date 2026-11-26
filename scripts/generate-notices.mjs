/**
 * Generates THIRD_PARTY_NOTICES.md from package-lock.json.
 * Read-only with respect to dependencies; writes only the notices file.
 * Run with `npm run notices:generate`.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const groups = new Map();

for (const [path, meta] of Object.entries(lock.packages ?? {})) {
  if (!path.startsWith('node_modules/')) continue;
  const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const license = meta.license || 'UNKNOWN';
  const key = `${license}\u0000${meta.dev ? 'dev' : 'prod'}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(`${name}@${meta.version ?? '?'}`);
}

const lines = [
  '# Third-party notices',
  '',
  'This file is generated from `package-lock.json` by `npm run notices:generate`.',
  'Do not edit it by hand. It lists every npm package available in the lockfile,',
  'grouped by declared SPDX license. License texts are shipped in `node_modules`',
  'during development and in the installed application bundle.',
  '',
  'The bundled fonts are covered separately by `public/fonts/OFL.txt`.',
  'The `xlsx` package is fetched from cdn.sheetjs.com (Apache-2.0); its integrity',
  'hash is pinned in `package-lock.json` and checked in CI.',
  '',
];

for (const scope of ['prod', 'dev']) {
  lines.push(`## ${scope === 'prod' ? 'Runtime and bundled dependencies' : 'Development-only dependencies'}`);
  lines.push('');
  const entries = [...groups.entries()]
    .filter(([key]) => key.endsWith(`\u0000${scope}`))
    .sort(([a], [b]) => a.localeCompare(b));
  for (const [key, packages] of entries) {
    const license = key.split('\u0000')[0];
    lines.push(`### ${license}`);
    lines.push('');
    for (const pkg of packages.sort()) lines.push(`- ${pkg}`);
    lines.push('');
  }
}

writeFileSync('THIRD_PARTY_NOTICES.md', lines.join('\n'));
console.log(`Wrote THIRD_PARTY_NOTICES.md (${groups.size} license groups).`);
