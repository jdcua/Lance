#!/usr/bin/env node
/**
 * Verify that every key in the live pool would actually pass the OFFLINE check
 * in a shipped desktop build.
 *
 * Why this exists: /validate on the worker short-circuits on the key: record and
 * returns valid:true without ever running the HMAC. So a key that a customer
 * received by email can be reported valid by the worker and STILL be rejected by
 * the desktop app the moment they paste it in, because the app validates
 * offline with LANCE_LICENSE_SECRET baked in at build time.
 *
 * That exact split happened in Oct 2026: the worker's LANCE_LICENSE_SECRET and
 * the secret used by scripts/generate-license.cjs had diverged. Six keys in the
 * pool passed no offline check, and one of them was issued to a real customer.
 * Nothing in CI caught it, because the deploy smoke test only checks that
 * /validate answers.
 *
 * Usage:
 *   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
 *     https://lance-license.cuajuandiego.workers.dev/admin/kv?prefix=pool%3A \
 *     | node scripts/check-pool-hmac.cjs
 *
 * Env:
 *   LANCE_LICENSE_SECRET   the SAME value the worker and GitHub hold
 *   ADMIN_TOKEN            bearer token for /admin/kv
 *
 * Exit code is non-zero when any key fails, so it can gate a release.
 */
const crypto = require('crypto');

const LICENSE_PRIME = 999999937n;
const WORKER = 'https://lance-license.cuajuandiego.workers.dev';

function deriveH(secret) {
  const hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
  return hash.subarray(0, 16).toString('hex').toUpperCase();
}

/** Mirrors license.rs and worker.js passesHmacCheck exactly. */
function offlineCheck(key, hmacKey) {
  const stripped = key.replace('LANCE-', '').replaceAll('-', '');
  const sig = crypto.createHmac('sha256', hmacKey).update(stripped, 'utf8').digest();
  return sig.readBigUInt64BE(0) % LICENSE_PRIME === 0n;
}

async function readPool() {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    console.error('Set ADMIN_TOKEN (the worker\'s ADMIN_TOKEN value).');
    process.exit(2);
  }
  const res = await fetch(`${WORKER}/admin/kv?prefix=pool%3A`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`/admin/kv returned ${res.status}`);
    process.exit(2);
  }
  const body = await res.json();
  return (body.keys || []).map((k) => k.replace('pool:', ''));
}

(async () => {
  const secret = process.env.LANCE_LICENSE_SECRET;
  if (!secret) {
    console.error('Set LANCE_LICENSE_SECRET in your shell first (never commit it).');
    process.exit(2);
  }

  const keys = await readPool();
  if (keys.length === 0) {
    console.log('Pool is empty. Nothing to verify.');
    process.exit(0);
  }

  const hmacKey = deriveH(secret);
  const pass = [];
  const fail = [];

  for (const key of keys) {
    (offlineCheck(key, hmacKey) ? pass : fail).push(key);
  }

  console.log(`Pool: ${keys.length} key(s)\n`);
  for (const k of pass) console.log(`  PASS  ${k}`);
  for (const k of fail) console.log(`  FAIL  ${k}`);

  if (fail.length) {
    console.log(
      `\n${fail.length} key(s) would be REJECTED by a shipped desktop app.\n` +
        'They pass /validate only because the worker short-circuits on the\n' +
        'key: record. Either the pool holds keys from a different\n' +
        'LANCE_LICENSE_SECRET, or the app was built with a different secret\n' +
        'than the worker holds.\n\n' +
        'Fix by minting with the secret the worker holds, and confirm the app\n' +
        'build uses the same value (GitHub secret LANCE_LICENSE_SECRET).\n\n' +
        'Remove the failing keys before selling them:\n' +
        fail.map((k) => `  npx wrangler kv key delete "pool:${k}" --binding LICENSE_KV --remote`).join('\n'),
    );
    process.exit(1);
  }

  console.log('\nAll pool keys pass the offline check. Safe to sell.');
})();
