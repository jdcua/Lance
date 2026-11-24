#!/usr/bin/env node
/**
 * Enforces that the `xlsx` CDN tarball stays hash-pinned in TWO independent
 * places.
 *
 * `package.json` pins a tarball URL, not a registry version, because SheetJS
 * moved off npm. `package-lock.json` therefore carries the only integrity hash
 * in the build, and the lockfile is exactly the file a supply-chain attacker
 * would edit alongside package.json. One file is not a check.
 *
 * `xlsx` also parses attacker-supplied binary input in the shipped app (client
 * and bank CSV/XLSX import) and is the single dependency that no `npm audit`
 * coverage reaches, so its provenance matters more than average.
 *
 * This script fails if the lockfile's integrity hash drifts from the one
 * recorded here in the repo. Update it deliberately:
 *   node .github/security/check-xlsx-pin.mjs --update
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED =
  'sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==';
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
