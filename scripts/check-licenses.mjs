/**
 * Enforces the dependency license policy. Read-only. Run with
 * `npm run check:licenses` (also part of `npm run verify` and CI's lint job).
 *
 * Policy:
 *  - Every non-dev (shipped/bundled) npm package in package-lock.json, and
 *    every Rust crate in `cargo metadata`, must carry an SPDX license whose
 *    expression is satisfied by ALLOWED below.
 *  - SPDX expressions are evaluated, not string-matched: `A OR B` passes when
 *    at least one alternative is allowed, `A AND B` only when both are, `/`
 *    is treated as `OR`, and `WITH <exception>` is ignored (an exception can
 *    only relax a license). Example: `(MIT AND Zlib)` requires both MIT and
 *    Zlib; `(MIT OR GPL-3.0-or-later)` passes on MIT alone.
 *  - Dev-only npm packages additionally may use MPL-2.0 / LGPL / AGPL / GPL
 *    (DEV_EXTRA) because build and test tools are never shipped to users.
 *    MPL-2.0 is already in ALLOWED because shipped Rust crates (cssparser,
 *    selectors, ...) use that file-level copyleft license.
 *  - A package with no declared `license` fails unless it has an entry in
 *    LICENSE_EXCEPTIONS documenting the license found in its LICENSE file.
 *    Stale exception entries also fail, so they cannot silently accumulate.
 *
 * Requires a working `cargo` for the Rust half. If `cargo metadata` cannot be
 * run, this script fails loudly; it never treats Rust as "nothing to check".
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Permissive licenses (plus public-domain-like and attribution licenses)
// accepted for code that can reach a user's machine.
const ALLOWED = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD', // legacy metadata from duck@0.1.12; LICENSE is 2-clause BSD
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'BSL-1.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'CDLA-Permissive-2.0',
  'ISC',
  'MIT',
  'MIT-0',
  'MPL-2.0', // file-level copyleft; used by shipped Rust crates
  'Python-2.0',
  'Unicode-3.0',
  'Unlicense',
  'Zlib',
]);

// Only for packages npm marks dev-only. Reaching for a copyleft build tool is
// fine; reaching for the same license in a shipped package is not.
const DEV_EXTRA = new Set([
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MPL-2.0',
]);

const LICENSE_EXCEPTIONS = new Map([
  ['png-js', 'LICENSE file is MIT; package.json has no license field'],
]);

function tokenize(expression) {
  const normalized = expression.replace(/\s*\/\s*/g, ' OR ');
  return normalized.match(/\(|\)|[^\s()]+/g) ?? [];
}

function primary(tokens, index, allowed) {
  const token = tokens[index];
  if (token === undefined) return [false, index];
  if (token === '(') {
    const [value, next] = disjunction(tokens, index + 1, allowed);
    return [value, tokens[next] === ')' ? next + 1 : next];
  }
  const word = String(token).toUpperCase();
  if (word === 'WITH') return [false, index + 3];
  // `A WITH exception` is just A for allow-list purposes.
  const hasException = String(tokens[index + 1]).toUpperCase() === 'WITH';
  return [allowed.has(token), hasException ? index + 3 : index + 1];
}

function conjunction(tokens, index, allowed) {
  let [value, next] = primary(tokens, index, allowed);
  while (String(tokens[next]).toUpperCase() === 'AND') {
    const [right, after] = primary(tokens, next + 1, allowed);
    value = value && right;
    next = after;
  }
  return [value, next];
}

function disjunction(tokens, index, allowed) {
  let [value, next] = conjunction(tokens, index, allowed);
  while (String(tokens[next]).toUpperCase() === 'OR') {
    const [right, after] = conjunction(tokens, next + 1, allowed);
    value = value || right;
    next = after;
  }
  return [value, next];
}

function licenseAllowed(expression, isDev) {
  const allowed = isDev ? new Set([...ALLOWED, ...DEV_EXTRA]) : ALLOWED;
  return disjunction(tokenize(expression), 0, allowed)[0];
}

const failures = [];
const usedExceptions = new Set();
let npmShipped = 0;
let npmDev = 0;

function checkMissing(name, scope, label) {
  const reason = LICENSE_EXCEPTIONS.get(name);
  if (reason) {
    usedExceptions.add(name);
    return;
  }
  failures.push(`${scope} ${label}: no SPDX license declared`);
}

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
for (const [path, meta] of Object.entries(lock.packages ?? {})) {
  if (!path.startsWith('node_modules/')) continue;
  const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const label = `${name}@${meta.version ?? '?'}`;
  const isDev = meta.dev === true || meta.devOptional === true;
  const scope = isDev ? 'npm dev' : 'npm shipped';
  const license = typeof meta.license === 'string' ? meta.license.trim() : '';
  if (!license) {
    checkMissing(name, scope, label);
    continue;
  }
  if (isDev) npmDev += 1;
  else npmShipped += 1;
  if (!licenseAllowed(license, isDev)) failures.push(`${scope} ${label}: ${license}`);
}

for (const name of LICENSE_EXCEPTIONS.keys()) {
  if (!usedExceptions.has(name)) failures.push(`stale license exception for ${name}`);
}

let cargo;
try {
  const output = execFileSync('cargo', ['metadata', '--format-version', '1', '--locked'], {
    cwd: 'src-tauri',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  cargo = JSON.parse(output);
} catch (error) {
  const detail = String(error.stderr ?? error.message ?? error)
    .trim()
    .split('\n')
    .slice(-3)
    .join(' ')
    .slice(0, 400);
  console.error('License policy: FAIL — cargo metadata is required to check Rust licenses.');
  console.error('Install a working Rust toolchain from src-tauri and make sure Cargo.lock is complete.');
  console.error(`  ${detail}`);
  process.exit(1);
}

let rustCrates = 0;
for (const crate of cargo.packages ?? []) {
  const label = `${crate.name}@${crate.version}`;
  const license = typeof crate.license === 'string' ? crate.license.trim() : '';
  rustCrates += 1;
  if (!license) {
    checkMissing(crate.name, 'rust', label);
    continue;
  }
  if (!licenseAllowed(license, false)) failures.push(`rust ${label}: ${license}`);
}

if (failures.length) {
  console.error(`License policy: FAIL (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}

console.log('License policy: PASS');
console.log(`  npm: ${npmShipped} shipped + ${npmDev} dev-only packages; rust: ${rustCrates} crates`);
console.log(
  `  allow-list: ${ALLOWED.size} IDs; dev-only extras: ${DEV_EXTRA.size}; exceptions: ${usedExceptions.size}`,
);
