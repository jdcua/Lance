#!/usr/bin/env node
/**
 * Enforces that the `xlsx` CDN tarball stays hash-pinned in two independent
 * files.
 *
 * `package.json` pins a tarball URL, not a registry version, because SheetJS
 * moved off npm. `package-lock.json` therefore carries the integrity hash that
 * `npm ci` verifies, and the lockfile is exactly the file a supply-chain
 * attacker would edit alongside package.json. A second copy of that hash is
 * kept in .github/security/xlsx-integrity.txt; this script fails if the
 * lockfile drifts from it, so changing the tarball means editing a separate,
 * reviewed file rather than only package.json and the lockfile.
 *
 * `xlsx` also parses attacker-supplied binary input in the shipped app (client
 * and bank CSV/XLSX import) and is the single dependency that no `npm audit`
 * coverage reaches, so its provenance matters more than average.
 *
 * Update the recorded hash deliberately:
 *   node .github/security/check-xlsx-pin.mjs --update
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RECORDED_IN = '.github/security/xlsx-integrity.txt';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const dep = pkg.dependencies?.xlsx ?? '';
if (!dep.startsWith('https://')) {
  console.error(
    `::error::xlsx is no longer a CDN tarball (now "${dep}"). ` +
      'If it moved back to the npm registry, delete this gate and RECORDED_IN, ' +
      'the registry provides its own integrity and revocation.',
  );
  process.exit(1);
}

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const entry = lock.packages?.['node_modules/xlsx'];
if (!entry?.integrity) {
  console.error('::error::package-lock.json has no integrity hash for xlsx.');
  process.exit(1);
}

if (process.argv.includes('--update')) {
  writeFileSync(RECORDED_IN, `${entry.integrity}\n`);
  console.log(`recorded ${entry.integrity}`);
  process.exit(0);
}

const recorded = readFileSync(RECORDED_IN, 'utf8').trim();
if (recorded !== entry.integrity) {
  console.error(
    '::error::xlsx integrity hash changed without review.\n' +
      `  lockfile : ${entry.integrity}\n` +
      `  recorded : ${recorded}\n` +
      '  A new hash means a new tarball. If that was intended, run\n' +
      '    node .github/security/check-xlsx-pin.mjs --update\n' +
      '  and say why in the commit message.',
  );
  process.exit(1);
}

if (!entry.resolved?.startsWith('https://cdn.sheetjs.com/')) {
  console.error(`::error::xlsx resolves to an unexpected host: ${entry.resolved}`);
  process.exit(1);
}

console.log(`✓ xlsx pinned to ${entry.resolved}\n  ${entry.integrity}`);
