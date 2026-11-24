/**
 * Local environment check for contributors and AI agents.
 * Read-only: never installs, downloads, or modifies the repository.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function version(bin, args) {
  const result = spawnSync(bin, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return (result.stdout || result.stderr).trim().split('\n')[0] || 'unknown';
}

function check(name, value, hint) {
  const ok = value !== null;
  console.log(`${ok ? '✓' : '✗'} ${name}${value ? `: ${value}` : ''}`);
  if (!ok) problems.push(hint);
}

const major = Number(process.versions.node.split('.')[0]);
check('Node.js >= 22', major >= 22 ? `v${process.versions.node}` : null, 'Install Node 22 or newer.');
check('npm', version('npm', ['--version']), 'npm ships with Node.js.');
check('Rust', version('rustc', ['--version']), 'Install stable Rust from https://rustup.rs.');
check('Cargo', version('cargo', ['--version']), 'Cargo ships with Rust.');
check(
  'Dependencies installed',
  existsSync(path.join(root, 'node_modules')) ? 'node_modules/' : null,
  'Run `npm install`.',
);
check(
  'Tauri CLI',
  existsSync(path.join(root, 'node_modules', '.bin', 'tauri')) ? 'node_modules/.bin/tauri' : null,
  'Run `npm install` to get the dev dependency.',
);

if (problems.length) {
  console.error('\nEnvironment is missing:');
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}

console.log('\nEnvironment ready. Run `npm run verify`, then `npm run tauri dev`.');
