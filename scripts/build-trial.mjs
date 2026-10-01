#!/usr/bin/env node
/* Build the trial: same app, static only, no source leak.
 * 1. vite build with VITE_TRIAL=1 and base /try/
 * 2. copy dist/ -> landing/try/
 * 3. write landing/try/build.json {version, builtAt, files:[{path, sha256}]}
 * Only hashes are published — no source, no sourcemaps.
 * Keep under 5 branches per function for reviewability.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'landing', 'try');

function run(cmd, env) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
}

function listFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...listFiles(full));
    else found.push(full);
  }
  return found;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

function writeAttestation(version) {
  // Stamp first so the attested hashes match exactly what is served.
  // The stamp covers the shell AND the worker source: the worker only
  // updates in browsers when its bytes change, so a worker-only fix must
  // still produce a new stamp.
  const swPath = join(OUT, 'trial-sw.js');
  const stampSeed = Buffer.concat([readFileSync(join(DIST, 'index.html')), readFileSync(swPath)]);
  const stamp = `${version}-${createHash('sha256').update(stampSeed).digest('hex').slice(0, 8)}`;
  writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__TRIAL_BUILD_ID__', stamp));
  const files = listFiles(OUT).filter(
    (f) => !f.endsWith('build.json') && !f.endsWith('asset-manifest.json'),
  );
  const rows = files.map((f) => ({ path: relative(OUT, f), sha256: sha256(f) }));
  rows.sort((a, b) => (a.path < b.path ? -1 : 1));
  const body = { app: 'lance-trial', version, builtAt: new Date().toISOString(), files: rows };
  writeFileSync(join(OUT, 'build.json'), JSON.stringify(body, null, 2) + '\n');
  // Asset list for the service worker precache (paths relative to /try/).
  const assets = rows.map((r) => r.path);
  writeFileSync(join(OUT, 'asset-manifest.json'), JSON.stringify(assets) + '\n');
  console.log(`trial attestation: ${rows.length} files, v${version}, sw=${stamp}`);
}

run('npx vite build --base=/try/', { VITE_TRIAL: '1' });
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(DIST, OUT, { recursive: true });
writeAttestation(readVersion());
console.log('trial ready at landing/try/');
