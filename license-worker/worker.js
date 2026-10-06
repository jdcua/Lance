// Lance license worker v2: validation + Paddle-webhook fulfillment.
//
// Routes:
//   POST /validate {key} (preferred)      -> { valid, tier, expires_at, message }
//   GET  /validate?key=LANCE-... (legacy)  -> { valid, tier, expires_at, message }
//   POST /webhooks/paddle                   -> Paddle events (signature-verified)
//   POST /admin/fulfill (Bearer ADMIN_TOKEN) -> retry pending fulfillments
//
// Key model: keys are HMAC-minted (see scripts/generate-license.cjs) so the
// desktop app can validate them offline (src-tauri/src/commands/license.rs).
// The worker binds each issued key to a tier in KV:
//   key:<KEY>  -> { tier, email, txn, sub, issued_at, revoked }
//   sub:<sub>  -> [<KEY>, ...]          (revocation index)
//   txn:<txn>  -> <KEY>                 (fulfillment marker / idempotency)
//   evt:<evt>  -> "1" (TTL 7d)          (delivery idempotency)
//   pool:<KEY> -> "1"                   (pre-minted stock, see mint script)
//   pending:<txn> / review:<txn>        (need human attention)
//
// Env (set via `wrangler secret put`; never committed):
//   LANCE_LICENSE_SECRET  HMAC secret (same as GitHub Secret + app builds)
//   PADDLE_API_KEY        live API key (customer email lookup)
//   PADDLE_WEBHOOK_SECRET endpoint_secret_key of the live destination (pdl_ntfset_...)
//   RESEND_API_KEY        Resend key for license delivery emails
//   LICENSE_FROM_EMAIL    verified sender, e.g. "Lance <licenses@<domain>>"
//   LICENSE_OWNER_EMAIL   alerts (pool empty, unknown price, failures)
//   ADMIN_TOKEN           bearer token you choose for /admin/fulfill

const LICENSE_PRIME = 999999937n;
const ALLOWED = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Live catalog: price ID -> license tier.
const PRICE_TIERS = {
  pri_01m242fjng66ktsykbdcf90aqg: 'pro', // Lance Pro monthly $14
  pri_01m242fjyp4msa968w4a26e684: 'pro', // Lance Pro yearly $99
  pri_01m242fkeweq5ca4vwhvxm0wqs: 'lifetime', // Lance Lifetime $249
};

const SIG_TOLERANCE_MS = 10 * 60 * 1000; // 10 min replay window

// ── key crypto (mirrors license.rs / build.rs) ──

function isValidFormat(key) {
  if (typeof key !== 'string' || !key.startsWith('LANCE-') || key.length !== 25) return false;
  const parts = key.slice(6).split('-');
  if (parts.length !== 4) return false;
  return parts.every((p) => p.length === 4 && [...p].every((ch) => ALLOWED.includes(ch)));
}

const hexUpper = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

async function passesHmacCheck(key, secret) {
  if (!isValidFormat(key)) return false;
  const stripped = key.replace('LANCE-', '').replaceAll('-', '');
  const secretHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const hmacKeyBytes = new TextEncoder().encode(hexUpper(secretHash).slice(0, 32));
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    hmacKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(stripped));
  return new DataView(sig).getBigUint64(0, false) % LICENSE_PRIME === 0n;
}

function safeEqual(a, b) {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < ba.length; i++) out |= ba[i] ^ bb[i];
  return out === 0;
}

// ── Paddle helpers ──

async function verifyPaddleSignature(request, secret) {
  const header = request.headers.get('Paddle-Signature');
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(';').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const { ts, h1 } = parts;
  if (!ts || !h1 || Number.isNaN(Number(ts))) return false;
  if (Math.abs(Date.now() - Number(ts) * 1000) > SIG_TOLERANCE_MS) return false;
  const raw = await request.text();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}:${raw}`));
  const computed = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { ok: safeEqual(computed, h1.toLowerCase()), raw };
}

async function getCustomerEmail(env, customerId) {
  const res = await fetch(`https://api.paddle.com/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data?.email || null;
}

async function sendEmail(env, to, subject, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.LICENSE_FROM_EMAIL, to: [to], subject, text }),
  });
  return res.ok;
}

const ownerAlert = (env, subject, text) =>
  env.LICENSE_OWNER_EMAIL && env.RESEND_API_KEY
    ? sendEmail(env, env.LICENSE_OWNER_EMAIL, `[Lance license] ${subject}`, text)
    : Promise.resolve(false);

function tierForItems(items) {
  for (const item of items || []) {
    // Paddle sends the ID as price_id on the line item, and nests it under
    // price.id on some payload shapes (notably older api_version=1 events).
    // Both must be checked or a valid purchase gets held for review.
    const id = item?.price_id || item?.price?.id;
    if (id && PRICE_TIERS[id]) return { tier: PRICE_TIERS[id], known: true };
  }
  // Fallback: one-time (no billing cycle) reads as lifetime, else pro.
  const first = (items || [])[0];
  const cycled = first?.price?.billing_cycle;
  return { tier: cycled ? 'pro' : 'lifetime', known: false };
}

// ── fulfillment ──

async function popPoolKey(env) {
  // KV list() is paginated at 1000. Reading only the first page and calling
  // the pool empty when later pages hold keys would strand real purchases.
  const list = await env.LICENSE_KV.list({ prefix: 'pool:' });
  for (const k of list.keys) {
    const key = k.name.slice('pool:'.length);
    // Claim check BEFORE delete. The old order deleted first, so a key that
    // lost a claim race was destroyed rather than returned to the pool, and
    // the pool silently drained.
    const existing = await env.LICENSE_KV.get(`key:${key}`, 'json');
    if (existing) continue;
    await env.LICENSE_KV.delete(k.name);
    return key;
  }
  // Drain any keys skipped above back into the pool.
  for (const k of list.keys) {
    const key = k.name.slice('pool:'.length);
    const existing = await env.LICENSE_KV.get(`key:${key}`, 'json');
    if (existing) await env.LICENSE_KV.put(`pool:${key}`, '1');
  }
  return null;
}

async function fulfillPurchase(env, purchase) {
  // purchase: { email, tier, txn, sub }
  const done = await env.LICENSE_KV.get(`txn:${purchase.txn}`);
  if (done) return { status: 'already_fulfilled', key: done };

  // Subscription renewals reuse the original key.
  if (purchase.sub) {
    const existing = await env.LICENSE_KV.get(`sub:${purchase.sub}`, 'json');
    if (existing && existing.length > 0) {
      await env.LICENSE_KV.put(`txn:${purchase.txn}`, existing[0]);
      return { status: 'renewal_reused', key: existing[0] };
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = await popPoolKey(env);
    if (!key) {
      await env.LICENSE_KV.put(`pending:${purchase.txn}`, JSON.stringify({ ...purchase, attempts: (purchase.attempts || 0) + 1 }));
      await ownerAlert(env, 'Key pool empty', `Pool exhausted fulfilling ${purchase.txn} (${purchase.email}, ${purchase.tier}). Mint more keys and POST /admin/fulfill.`);
      return { status: 'pool_empty' };
    }
    const record = { tier: purchase.tier, email: purchase.email, txn: purchase.txn, sub: purchase.sub || null, issued_at: new Date().toISOString(), revoked: false };
    await env.LICENSE_KV.put(`key:${key}`, JSON.stringify(record));
    const check = await env.LICENSE_KV.get(`key:${key}`, 'json');
    if (!check || check.txn !== purchase.txn) continue; // lost a race; try next pool key
    if (purchase.sub) {
      const keys = (await env.LICENSE_KV.get(`sub:${purchase.sub}`, 'json')) || [];
      keys.push(key);
      await env.LICENSE_KV.put(`sub:${purchase.sub}`, JSON.stringify(keys));
    }
    await env.LICENSE_KV.put(`txn:${purchase.txn}`, key);
    await env.LICENSE_KV.delete(`pending:${purchase.txn}`);
    const emailed = await sendEmail(
      env,
      purchase.email,
      'Your Lance license key',
      `Thanks for buying Lance ${purchase.tier === 'lifetime' ? 'Lifetime' : 'Pro'}!\n\nYour license key:\n\n  ${key}\n\nEnter it in Lance under Settings > License. Keep it somewhere safe, it unlocks Pro on all your devices.\n\nOrder: ${purchase.txn}\n`,
    );
    if (!emailed) {
      await ownerAlert(env, 'License email failed', `Key ${key} issued for ${purchase.txn} (${purchase.email}) but Resend delivery failed. Forward the key manually.`);
    }
    return { status: emailed ? 'fulfilled' : 'fulfilled_email_failed', key };
  }
  return { status: 'pool_race' };
}

// ── routes ──

// Validate rate limit: cheap HMAC compare, but no endpoint should take
// unbounded traffic. 30/min/IP, 5-min window, generous for humans (the app
// validates rarely and caches), tight enough to blunt key-guessing.
const validateHits = new Map();
const VALIDATE_MAX = 30;
function validateRateLimited(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  // Count BEFORE truncating. The previous version sliced to 30 and then
  // compared `> 30`, which is never true, the limit never fired once.
  const seen = (validateHits.get(ip) || []).filter((t) => now - t < windowMs).concat([now]);
  const blocked = seen.length > VALIDATE_MAX;
  validateHits.set(ip, seen.slice(-VALIDATE_MAX));
  if (validateHits.size > 2000) {
    for (const [k, v] of validateHits) {
      if (v.every((t) => now - t >= windowMs)) validateHits.delete(k);
      if (validateHits.size <= 1000) break;
    }
  }
  return blocked;
}

async function handleValidate(url, env, request) {
  const ip = (request && request.headers.get('cf-connecting-ip')) || 'unknown';
  if (validateRateLimited(ip)) {
    return Response.json({ valid: false, tier: 'free', expires_at: null, message: 'too many requests' }, { status: 429 });
  }
  if (!env.LANCE_LICENSE_SECRET) {
    return Response.json(
      { valid: false, tier: 'free', expires_at: null, message: 'server misconfigured' },
      { status: 500 },
    );
  }
  // POST JSON body preferred: keys in GET query strings land in access
  // logs (Cloudflare, worker logs). GET kept for older app builds.
  let key = (url.searchParams.get('key') || '').trim().slice(0, 64);
  if (request && request.method === 'POST') {
    try {
      const body = await request.json();
      if (typeof body.key === 'string') key = body.key.trim().slice(0, 64);
    } catch {
      /* fall through to query param */
    }
  }
  const record = await env.LICENSE_KV.get(`key:${key}`, 'json');
  if (record) {
    if (record.revoked) {
      return Response.json({ valid: false, tier: 'expired', expires_at: null, message: 'License revoked' });
    }
    return Response.json({ valid: true, tier: record.tier, expires_at: null, message: 'License valid' });
  }
  // No KV record: the key was never issued by us (or was never fulfilled), so
  // there is no tier to grant and nothing to revoke. The HMAC check is kept as
  // a cheap shape/origin signal only. It must NEVER confer a paid tier, the
  // HMAC key is recoverable from the shipped binary, so a forged key passing
  // it would be unrevokable.
  const wellFormed = await passesHmacCheck(key, env.LANCE_LICENSE_SECRET);
  return Response.json({
    valid: false,
    tier: 'free',
    expires_at: null,
    message: wellFormed ? 'License not found, contact support' : 'Invalid license key',
  });
}

async function handleWebhook(request, env) {
  if (!env.PADDLE_WEBHOOK_SECRET) {
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }
  const verified = await verifyPaddleSignature(request, env.PADDLE_WEBHOOK_SECRET);
  if (!verified || !verified.ok) {
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }
  let event;
  try {
    event = JSON.parse(verified.raw);
  } catch {
    return Response.json({ error: 'bad payload' }, { status: 400 });
  }

  // Delivery idempotency.
  // Replay guard. The marker is written AFTER fulfillment, not before: the old
  // order meant a crash between dedupe and minting lost the sale forever ,
  // Paddle retried, hit the marker, got {ok:true,deduped}, and the customer had
  // paid for nothing. See markEventDone() at the end of each handler.
  if (event.event_id) {
    if (await env.LICENSE_KV.get(`evt:${event.event_id}`)) {
      return Response.json({ ok: true, deduped: true });
    }
  }
  const markEventDone = () =>
    event.event_id
      ? env.LICENSE_KV.put(`evt:${event.event_id}`, '1', { expirationTtl: 7 * 24 * 3600 })
      : Promise.resolve();

  const data = event.data || {};
  if (event.event_type === 'transaction.completed') {
    // A transaction with no line items at all is malformed, not "unknown
    // price". Falling through to the billing-cycle heuristic would guess a
    // tier and grant the wrong entitlement, so treat it as a hard failure.
    if (!Array.isArray(data.items) || data.items.length === 0) {
      await env.LICENSE_KV.put(`review:${data.id}`, verified.raw.slice(0, 8000));
      await ownerAlert(env, 'Purchase with no line items', `Transaction ${data.id} completed with no usable line items; held for review (no key minted).`);
      return Response.json({ error: 'no line items' }, { status: 503 });
    }

    const { tier, known } = tierForItems(data.items);
    if (!known) {
      await env.LICENSE_KV.put(`review:${data.id}`, verified.raw.slice(0, 8000));
      await ownerAlert(env, 'Unknown price in purchase', `Transaction ${data.id} used an unrecognized price; held for review (no key minted).`);
      // Intentionally NOT markEventDone: this needs a human, and marking it done
      // would make Paddle's retry a no-op.
      return Response.json({ error: 'held for review' }, { status: 503 });
    }
    const email = data.customer_id && env.PADDLE_API_KEY ? await getCustomerEmail(env, data.customer_id) : null;
    if (!email) {
      await env.LICENSE_KV.put(`pending:${data.id}`, JSON.stringify({ email: null, tier, txn: data.id, sub: data.subscription_id || null }));
      await ownerAlert(env, 'Email lookup failed', `Transaction ${data.id} (${tier}) completed but customer email could not be resolved. Resolve manually.`);
      return Response.json({ error: 'email lookup failed' }, { status: 503 });
    }
    const result = await fulfillPurchase(env, { email, tier, txn: data.id, sub: data.subscription_id || null });
    // An empty pool is an ops failure, not a customer failure. It has already
    // written pending: and emailed the owner. Say so loudly in the response:
    // a 200 here reads as "delivered" in the Paddle dashboard and stops the
    // retry loop, which is how a paid customer ends up with nothing and no
    // further attempts.
    if (result.status === 'pool_empty') {
      return Response.json({ error: 'key pool empty, awaiting mint', status: result.status }, { status: 503 });
    }
    // Only a real issuance (or a renewal that reused an existing key) counts as
    // success. `pool_race` means money was taken and no key exists, so report
    // failure and let Paddle retry, and write a pending: record so the owner
    // can see it.
    if (result.status === 'pool_race') {
      await env.LICENSE_KV.put(`pending:${data.id}`, JSON.stringify({ email, tier, txn: data.id, sub: data.subscription_id || null, attempts: 5 }));
      await ownerAlert(env, 'Pool race lost all keys', `Transaction ${data.id} (${tier}) could not claim a pooled key. Retry via POST /admin/fulfill.`);
      return Response.json({ error: 'fulfillment failed' }, { status: 503 });
    }
    await markEventDone();
    return Response.json({ ok: true, ...result });
  }

  if (event.event_type === 'subscription.canceled') {
    const subId = data.id;
    const keys = (subId && (await env.LICENSE_KV.get(`sub:${subId}`, 'json'))) || [];
    for (const k of keys) {
      const record = await env.LICENSE_KV.get(`key:${k}`, 'json');
      if (record) {
        record.revoked = true;
        await env.LICENSE_KV.put(`key:${k}`, JSON.stringify(record));
      }
    }
    return Response.json({ ok: true, revoked: keys.length });
  }

  return Response.json({ ok: true, ignored: event.event_type });
}

function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  return !!env.ADMIN_TOKEN && safeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`);
}

// Ops inspection: list keys by prefix and read one key. Same auth as fulfill.
async function handleAdminKv(request, env, url) {
  if (!requireAdmin(request, env)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const prefix = url.searchParams.get('prefix') || '';
  const key = url.searchParams.get('key');
  if (key) {
    const value = await env.LICENSE_KV.get(key);
    return Response.json({ key, found: value !== null, value: value ? value.slice(0, 2000) : null });
  }
  const list = await env.LICENSE_KV.list(prefix ? { prefix } : undefined);
  return Response.json({ keys: list.keys.map((k) => k.name) });
}

async function handleAdminFulfill(request, env) {  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || !safeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const pending = await env.LICENSE_KV.list({ prefix: 'pending:' });
  const fulfilled = [];
  const emailFailed = [];
  const stillPending = [];
  for (const k of pending.keys) {
    const purchase = await env.LICENSE_KV.get(k.name, 'json');
    if (!purchase || !purchase.email) {
      stillPending.push(purchase?.txn || k.name.slice('pending:'.length));
      continue;
    }
    const result = await fulfillPurchase(env, purchase);
    // Classify on the real status. The old check was
    // `result.status === 'fulfilled'`, so a successful issue whose email
    // bounced (`fulfilled_email_failed`) and an already-issued txn
    // (`already_fulfilled`, `renewal_reused`) were all reported as still
    // pending. Fulfillment deletes the pending: record on success, so a
    // post-hoc read finds nothing either, which is what made a successful
    // run look like a total failure during a real incident.
    if (result.status === 'fulfilled' || result.status === 'fulfilled_email_failed') {
      fulfilled.push(purchase.txn);
      if (result.status === 'fulfilled_email_failed') emailFailed.push(purchase.txn);
    } else if (result.status === 'already_fulfilled' || result.status === 'renewal_reused') {
      fulfilled.push(purchase.txn);
    } else {
      stillPending.push(purchase.txn);
    }
  }
  return Response.json({ ok: true, fulfilled, email_failed: emailFailed, still_pending: stillPending });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (url.pathname === '/validate' && (request.method === 'GET' || request.method === 'POST')) {
      const res = await handleValidate(url, env, request);
      const body = await res.text();
      return new Response(body, { status: res.status, headers: { ...headers, 'Content-Type': 'application/json' } });
    }
    if (url.pathname === '/webhooks/paddle' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    if (url.pathname === '/admin/fulfill' && request.method === 'POST') {
      return handleAdminFulfill(request, env);
    }
    if (url.pathname === '/admin/kv' && request.method === 'GET') {
      return handleAdminKv(request, env, url);
    }
    return Response.json({ error: 'not found' }, { status: 404, headers });
  },
};
