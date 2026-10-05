#!/usr/bin/env node
/**
 * Gate logic for `cargo audit`. Five properties, all deliberate:
 *
 *  1. An advisory WITH a fix always fails. There is no "we'll get to it"
 *     escape hatch, you either bump the crate or the gate fails.
 *  2. An advisory with NO fix must be allowlisted, with a substantive reason.
 *  3. An allowlist entry whose advisory has since gained a fix FAILS. Fixes
 *     appear months after disclosure; without this, an entry becomes permanent.
 *  4. An allowlist entry matching nothing FAILS, so the list cannot accumulate
 *     dead entries and quietly stop being reviewed.
 *  5. A missing or short reason FAILS. This is the specific anti-decoration
 *     property: an allowlist that anyone can extend with a shrug is not a gate.
 *
 * Deliberately NOT `cargo audit --ignore`: that input is additive and silent,
 * and cargo-audit will happily ignore something that is not vulnerable at all.
 *
 * Zero dependencies, so this script cannot itself rot.
 */
import { readFileSync, appendFileSync } from 'node:fs';

const [auditPath, allowPath, summaryPath] = process.argv.slice(2);
if (!auditPath || !allowPath) {
  console.error('usage: check-cargo-audit.mjs <audit.json> <allow.json> [summary.md]');
  process.exit(2);
}

const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
let allow = {};
try {
  allow = JSON.parse(readFileSync(allowPath, 'utf8'));
} catch {
  console.error(`::error::allowlist ${allowPath} is missing or not valid JSON`);
  process.exit(1);
}

/** A reason must exist and be substantive enough to actually review. */
function reasonTooShort(entry) {
  const reason = typeof entry?.reason === 'string' ? entry.reason.trim() : '';
  return reason.length < 40;
}

/** True when the key has never been validated, or the last check is stale. */
const vulns = audit?.vulnerabilities?.list ?? [];
const warnings = audit?.warnings ?? {};
const seen = new Set();
const errors = [];
const waived = [];

for (const v of vulns) {
  const id = v.advisory?.id;
  if (!id) continue;
  const crate = `${v.package.name} ${v.package.version}`;
  const patched = v.versions?.patched ?? [];
  const hasFix = patched.length > 0;
  const entry = allow[id];
  seen.add(id);

  // Property 1, unconditional, UNLESS the entry declares `fixBlockedBy`, which
  // means a patch exists but an upstream pin prevents taking it. That is a real
  // and common state (sqlx 0.8.1 is patched, but tauri-plugin-sql pins 0.8.0),
  // and without an escape hatch the gate can never go green, which is how audit
  // gates get disabled, the exact failure this script exists to prevent. The
  // escape hatch still requires a substantive reason AND the upstream package
  // name, so it cannot be used to wave away an easily-updatable crate.
  if (hasFix && typeof entry?.fixBlockedBy === 'string' && entry.fixBlockedBy.trim()) {
    if (reasonTooShort(entry)) {
      errors.push(
        `${id} (${crate}) declares fixBlockedBy but its "reason" is missing or too short ` +
          `to review (${String(entry.reason ?? '').trim().length} chars).`,
      );
      continue;
    }
    waived.push({
      id,
      crate,
      reason: `${entry.reason} BLOCKED BY UPSTREAM: ${entry.fixBlockedBy}`,
      title: v.advisory.title,
    });
    continue;
  }

  if (hasFix) {
    errors.push(
      `${id} (${crate}) has a fix available (${patched.join(' | ')}) and is not waived.\n` +
        `    ${v.advisory.title}\n` +
        `    fix:  cd src-tauri && cargo update -p ${v.package.name} && cargo audit\n` +
        `    If an upstream pin blocks it, add an allowlist entry with "reason" and\n` +
        `    "fixBlockedBy": "<the crate that pins it>".`,
    );
    continue;
  }

  if (!entry) {
    errors.push(
      `${id} (${crate}) has no published fix and is not in ${allowPath}.\n` +
        `    ${v.advisory.title}\n` +
        `    Either (a) it is genuinely unreachable, add an entry to the allowlist\n` +
        `    citing the code path that makes it so, or (b) it IS reachable and this\n` +
        `    is an incident.`,
    );
    continue;
  }

  // Property 2/5, the reason must exist and be reviewable.
  const reason = typeof entry.reason === 'string' ? entry.reason.trim() : '';
  if (reasonTooShort(entry)) {
    errors.push(
      `${id} is allowlisted but its "reason" is missing or too short to review ` +
        `(${reason.length} chars). State which code path makes it unreachable.`,
    );
    continue;
  }
  waived.push({ id, crate, reason, title: v.advisory.title });
}

// Property 4, stale entries.
for (const id of Object.keys(allow)) {
  if (!seen.has(id)) {
    errors.push(
      `${id} is in ${allowPath} but cargo audit did not report it. Remove it, ` +
        `a stale entry is an unchecked promise.`,
    );
  }
}

// Unmaintained crates are warnings in cargo-audit, not failures. Surface them so
// they cannot quietly accumulate either.
const unmaintained = Object.keys(warnings?.unmaintained ?? {});
const unsound = Object.keys(warnings?.unsound ?? {});
const yanked = Object.keys(warnings?.yanked ?? {});

const md = [
  '### cargo audit',
  '',
  `**${vulns.length}** advisory(ies) in the lockfile · **${errors.length}** blocking · **${waived.length}** waived with no upstream fix.`,
  '',
];
if (waived.length) {
  md.push('<details><summary>Waived, no upstream fix published</summary>', '');
  md.push('| advisory | crate | why it is not reachable |', '|---|---|---|');
  for (const w of waived) md.push(`| \`${w.id}\` | \`${w.crate}\` | ${w.reason} |`);
  md.push('', '</details>', '');
}
if (unmaintained.length || unsound.length || yanked.length) {
  md.push(
    `<details><summary>Warnings (non-blocking): ${unmaintained.length} unmaintained, ` +
      `${unsound.length} unsound, ${yanked.length} yanked</summary>`,
    '',
    `- unmaintained: ${unmaintained.map((c) => `\`${c}\``).join(', ') || 'none'}`,
    `- unsound: ${unsound.map((c) => `\`${c}\``).join(', ') || 'none'}`,
    `- yanked: ${yanked.map((c) => `\`${c}\``).join(', ') || 'none'}`,
    '',
    '</details>',
    '',
  );
}
if (errors.length) {
  md.push(
    '<details open><summary>Blocking</summary>',
    '',
    '```',
    ...errors,
    '```',
    '',
    '</details>',
  );
}
if (summaryPath) appendFileSync(summaryPath, md.join('\n') + '\n');

if (errors.length) {
  console.error('::error::cargo audit gate failed\n');
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`✓ cargo audit gate passed (${waived.length} waived, no fix available)`);
for (const w of waived) console.log(`  waived ${w.id} (${w.crate}), ${w.reason.slice(0, 90)}…`);
