/**
 * Checks that tracked files still meet the open-source release standard.
 * Read-only. Run with `npm run audit:oss` (also part of `npm run verify`).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const CODE_EXT = /\.(ts|tsx|rs|js|cjs|mjs|json|yml|yaml|css|html)$/;
const CODE_PATTERNS = [
  /paddle/i,
  /paywall/i,
  /open-upgrade/i,
  /LICENSE_TIERS/,
  /PRO_PRICES/,
  /LANCE_LICENSE/,
  /lance-license/,
  /cuajuandiego/i,
  /\/Users\//,
];
const SECRET_PATTERNS = [
  /pri_[0-9a-f]{20,}/i,
  /hsc_[A-Za-z0-9]{10,}/,
  /sk-[A-Za-z0-9]{16,}/,
  /ghp_[A-Za-z0-9]{16,}/,
  /xox[bpas]-[A-Za-z0-9-]{8,}/,
  /LANCE-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY/,
];
const JUNK_PATH = /(\.DS_Store|__pycache__|\.env\.local|\.pyc$|(^|\/)(dist|target|qa-shots|test-results|landing|license-worker|promo)\/)/;

const findings = [];
for (const file of files) {
  if (JUNK_PATH.test(file)) findings.push(`${file}: junk path`);
  if (file === 'scripts/audit-oss.mjs') continue; // the rule list is not a violation
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const patterns = CODE_EXT.test(file) ? [...CODE_PATTERNS, ...SECRET_PATTERNS] : SECRET_PATTERNS;
  text.split('\n').forEach((line, i) => {
    for (const pattern of patterns) {
      if (pattern.test(line)) findings.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

if (findings.length) {
  console.error('Open-source audit FAILED:');
  for (const f of findings) console.error(`- ${f}`);
  process.exit(1);
}
console.log(`Open-source audit passed (${files.length} tracked files).`);
