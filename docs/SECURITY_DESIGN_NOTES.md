# Security Design Notes

**Scope:** Lance desktop app (Tauri + Rust + SQLite), the `/try/` browser trial,
and the two Cloudflare Workers behind them (landing, license).

**Status:** reviewed 2026-10-02 against OWASP **Top 10:2025** (flagship),
**API Security Top 10:2023**, and **Top 10 for LLM Applications:2025**.

**Companion:** `SECURITY.md` is the original v1 desktop threat model. This
document supersedes it for mapping purposes and adds the surfaces v1 never had
(workers, trial, license issuance). Where the two disagree, this one is current.

---

## 0. How to read this

| Section                      | What it gives you                                                |
| ---------------------------- | ---------------------------------------------------------------- |
| §1 Trust boundaries          | Which bytes cross which line, and who controls them              |
| §2 Attack surface inventory  | Every reachable endpoint/process, with its control               |
| §3 OWASP Top 10:2025         | Category-by-category evidence with `file:line`                   |
| §4 API Security Top 10:2023  | Per-route posture for the workers                                |
| §5 LLM Top 10:2025           | Constraints for v2 local AI, written before the code             |
| §6 Trial zero-network design | The claim we make publicly, and how it is enforced               |
| §7 License system            | Key model, issuance, validation paths, hardening, accepted risk  |
| §8 Cryptography inventory    | Every primitive we use, and where we deliberately use none       |
| §9 Input handling            | Sanitizers, limits, and the rule for keeping two copies in sync  |
| §10 Update chain             | Signing, manifest trust, attestation vs. signature               |
| §11 Secrets                  | Complete env inventory and where each one is allowed to appear   |
| §12 Privacy as a control     | Why "we don't collect" is an enforceable property, not a promise |
| §13 Supply chain (A03)       | Dependency pins, missing gates, concrete remediation             |
| §14 Risk register            | Open findings, ranked, each with an accept/fix decision          |
| §15 Verification             | Commands that prove the above still holds                        |

Findings that are **fixed** are marked ✅. Findings that are **open** are
numbered and live in §14. Nothing in §3–§13 is aspirational: every "we have"
claim cites the code that does it, so a reviewer can check it in one jump.

---

## 1. Trust boundaries

Five boundaries exist. Each one has a rule attached; no boundary is implicit.

```
                      ┌──────────────────────────────────────────┐
  (B4) Untrusted      │  Browser / OS                            │
  input               │  imports, CSV cells, shared-link          │
                      │  visitors, form submitters, portal        │
                      │  respondents, webhooks                   │
                      └───────────────┬──────────────────────────┘
                                      │ validate at every boundary
                      ┌───────────────▼──────────────────────────┐
  (B3) Server-side   │  landing/_worker.js   (public, no auth)   │
  semi-trusted       │  license-worker       (KV, HMAC, Paddle)  │
                      └───────────────┬──────────────────────────┘
                                      │ only from worker → fixed API hosts
                      ┌───────────────▼──────────────────────────┐
  (B2) First-party   │  GitHub API · Paddle API · Resend ·       │
  third party        │  Cloudflare KV · unpkg-bunny fonts        │
                      └──────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ (B1) Desktop process, highest trust inside Lance              │
  │  Rust commands · local SQLite · portal server on 127.0.0.1    │
  │  Client React bundle runs in the same webview                 │
  └───────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ (B0) Trial, no server at all                                 │
  │  static bytes + service worker + localStorage/IndexedDB       │
  │  B5: egress is blocked by policy, not by code                 │
  └───────────────────────────────────────────────────────────────┘
```

**B0/B5, the trial's rule.** The trial has no API, no database, no account.
Its only outbound capability is the page's own CSP, and that policy says
`connect-src 'none'`. This is the difference between a privacy claim and a
privacy guarantee: a claim is a sentence in a policy page, a guarantee is a
directive the browser enforces against us as well as against an attacker. §6
covers the enforcement.

**B1, the desktop process.** A Tauri command is a trust boundary that a
compromised renderer can call freely. Every command therefore re-validates its
own arguments; the React bundle's sanitizers are treated as ergonomics, not as
the control. Where a Rust and a TypeScript sanitizer both exist (§9), the Rust
one is the control.

**B2, third-party APIs.** Workers only ever `fetch()` a fixed, hardcoded
origin. There is no code path where a request body, query parameter, or KV
value becomes a fetch target. This is the whole of our SSRF story, and it holds
because the strings are literals in `_worker.js:362,627` and
`license-worker/worker.js:105,114`.

---

## 2. Attack surface inventory

Everything an attacker can name, and the control that stands in front of it.
Anything not in this table does not exist as far as an attacker is concerned.

### 2.1 Landing worker, public, unauthenticated

| Route                                                           | Method        | Control                                                                                                                                       |
| --------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `/`, `/privacy`, `/terms`, `/refunds`, `/press`, `/rates`       | GET           | Static passthrough + full CSP and security headers (`landingResponse()`)                                                                      |     |
| `/craft/:id`, `/alternatives/:slug`, `/use/:slug`, `/tools/:id` | GET           | Regex `/^\/(craft\|alternatives\|use\|tools\|rates\|templates)\/[^/.]+$/` then `+'.html'` (`_worker.js:697`), no traversal, no arbitrary path |
| `/try/**`                                                       | GET/HEAD only | 405 on writes (`_worker.js:424`); full CSP (`_worker.js:395`)                                                                                 |
| `/try/trial-sw.js`                                              | GET           | Served **without** the page CSP by design (§6.3)                                                                                              |
| `/api/exp-hit`                                                  | POST          | Strict allowlist: `exp` `/^[a-z0-9-]+$/`, `variant` `/^[ABC]$/`, `goal` ∈ fixed set (`_worker.js:228-243`)                                    |
| `/api/exp-report`                                               | GET           | Public, aggregate counters only, `Cache-Control: no-store`                                                                                    |
| `/api/waitlist`                                                 | POST          | Honeypot + `issueRateLimited` 3/hr/IP                                                                                                         |
| `/api/contact`                                                  | POST          | Honeypot + validation + `issueRateLimited` 3/hr/IP                                                                                            |
| `/api/issues`                                                   | POST          | Honeypot + validation + `issueRateLimited` 3/hr/IP; files a GitHub issue server-side                                                          |
| `/api/release`, `/api/updates/latest.json`                      | GET           | Read-only proxy of public GitHub data; `GITHUB_TOKEN` stays server-side                                                                       |
| `/api/updates/download/:file`                                   | GET           | Filename matched against the checked-in manifest                                                                                              |
| `/api/updates/download-local/:file`                             | GET           | Only the exact bundle named in the local manifest (`_worker.js:479`)                                                                          |
| `/api/download/:os`                                             | GET           | Only `mac`/`win`/`linux` are treated as OS identifiers                                                                                        |

### 2.2 License worker, semi-trusted

| Route              | Method    | Control                                                                                                                    |
| ------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/validate`        | GET, POST | Per-IP limit 30 req / 5 min (`worker.js:203`); key length-capped to 64 chars; KV record wins over HMAC; `revoked` honoured |
| `/webhooks/paddle` | POST      | HMAC-SHA256 signature + 10-minute replay window + 7-day delivery dedupe; **fails closed** on every step                    |
| `/admin/fulfill`   | POST      | `Authorization: Bearer $ADMIN_TOKEN`, constant-time compare                                                                |
| `/admin/kv`        | GET       | Same bearer; read-only; values truncated to 2000 chars                                                                     |

### 2.3 Desktop process

| Surface                | Control                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Portal HTTP server     | Bound to `127.0.0.1` (`server.rs:796,803`), not reachable off-host                                                 |
| Portal token lookup    | 256-bit CSPRNG token, expiry check, per-token 60/min, per-source-IP 10-fail/300s lockout (`server.rs:20-23,37-65`) |
| Portal POST `/respond` | Requires `X-Lance-Client: portal` (`server.rs:627`)                                                                |
| Portal HTML            | ammonia allowlist + `escape_html` on every interpolation (`server.rs:149-158`)                                     |
| Portal responses       | `X-Frame-Options: DENY`, `nosniff`, CSP, `Referrer-Policy: no-referrer` (`server.rs:525-544`)                      |
| Tauri command args     | Re-validated per command; SQL parameterized throughout                                                             |
| Asset filenames        | Canonicalized before filesystem access                                                                             |
| CSV/JSON import        | 50 MB envelope cap, 500-row/1000-char cell caps, formula-injection prefix strip                                    |
| Backups                | Envelope validation + 2 MB per blob / 8 MB total cap (`utils/backup.ts:203-205`)                                   |
| Auto-updater           | Signature verified against pinned `pubkey` (`tauri.conf.json:48-56`)                                               |
| Local SQLite           | Unencrypted, by design (§8)                                                                                        |

### 2.4 Trial (B0)

| Surface        | Control                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Network egress | `connect-src 'none'`; verified live by `curl -I /try/`                                           |
| Service worker | Same-origin, GET-only, `/try/`-prefixed, `/api/`-excluded (`trial-sw.js:25-31`)                  |
| Storage        | `localStorage` + IndexedDB, both local; inventory displayed to the user (`demo/storageProof.ts`) |
| Export         | Local file write; contains the user's own data and nothing else                                  |

### 2.5 Not attack surface

Test mode / "godmode" is a **development affordance**, not a production route.
It is reachable only when `import.meta.env.DEV` or the trial build flag is set
(`demo/testMode.ts:4-8`, `demo/isDemo.ts`), so the entry UI is not rendered and
the import is dead code in a production desktop build. It is scheduled for
deletion; see §14 F8.

---

## 3. OWASP Top 10:2025, mapping and evidence

2025 supersedes 2021. The renumbering matters for anyone comparing this doc to
the old one, so the delta is called out explicitly.

| 2025                                      | Was                | Lance posture                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                               |
| ----------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| A01 Broken Access Control                 | A01                | Share tokens: 256-bit CSPRNG, per-token rate limit, per-IP lockout, expiry → HTTP 410, revocable. Portal is loopback-only, so the "remote client" for a share link is a browser on the LAN talking to a server that only exists while the app is open. License keys are bearer tokens with no object hierarchy to confuse.                                                                                                                                                                                                                                                                          | `sharing.rs:42`, `server.rs:20-65,608-618`                             |
| A02 Security Misconfiguration             | **A05 (promoted)** | Trial: strict CSP, 405 on writes, `Permissions-Policy` disabling camera/mic/geo, `nosniff`, `no-referrer`. Landing/legal/promo: full CSP + 4 security headers, `script-src` with no inline. Portal: 5 security headers. Desktop: Tauri CSP with `frame-ancestors 'none'`. No debug endpoints, no stack traces, no verbose errors in any response. ✅ Desktop CSP no longer carries an unused `api.anthropic.com` egress allow. ✅ Landing, legal, and promo pages now ship a real policy, `script-src 'self'` with no `'unsafe-inline'`, which is stricter than the trial's. **Open: F5, F6 only.** | `_worker.js:395-419`, `server.rs:525-544`, `tauri.conf.json:26`        |
| A03 Software Supply Chain Failures        | **NEW in 2025**    | Updater is pubkey-pinned. Actions are pinned to major tags, not SHAs. **Open: no `npm audit`/`cargo audit` gate (F5); `xlsx` resolves from a CDN tarball outside the registry (F6).**                                                                                                                                                                                                                                                                                                                                                                                                               | `tauri.conf.json:48-56`, `package.json:57`, `.github/workflows/ci.yml` |
| A04 Cryptographic Failures                | **A02**            | Deliberate: local SQLite is unencrypted. The threat model is device theft against a desktop OS disk encryption boundary, not a shared machine, §8 states this as an accepted risk with its rationale. Tokens and license keys use `rand`/`crypto.getRandomValues`. All secret comparison is constant-time. No custom crypto anywhere: HMAC-SHA256 and SHA-256 via `crypto.subtle`/`hmac` crates only.                                                                                                                                                                                               | `sharing.rs:42-47`, `license-worker/worker.js:52-75`                   |
| A05 Injection                             | **A03**            | Every SQL call is parameterized (`?1`/`?n` or `rusqlite::params!`), no string concatenation into a query exists in the codebase. The single HTML sink is the portal, gated by an ammonia allowlist _and_ `escape_html` on each interpolation. CSV formula injection is stripped at parse. No `eval`, no `innerHTML` on user data.                                                                                                                                                                                                                                                                   | `server.rs:149-158`, `import/parsers/spreadsheet.ts:21`                |
| A06 Insecure Design                       | **A04**            | Threat model written before the mitigation list (`SECURITY.md`); the `/validate` endpoint shipped with no rate limit and got one; share tokens shipped as 32 alphanumeric chars and were replaced with 32 CSPRNG bytes. Test-mode removal is a scheduled deletion, not a permanent feature.                                                                                                                                                                                                                                                                                                         | this doc, `SECURITY.md`                                                |
| A07 Authentication Failures               | A07                | No accounts, so no passwords, sessions, or credential storage. License keys are the only bearer credential and are validated by format + HMAC + online record lookup, with online revocation. Admin surface is a single bearer token compared in constant time. Paddle webhooks are HMAC-verified, not "trusted by source IP".                                                                                                                                                                                                                                                                      | `license.rs:53-71`, `license-worker/worker.js:79-102,313-316`          |
| A08 Software or Data Integrity Failures   | A08                | Update bundles are signature-verified with a pinned public key. Backup envelopes are schema-validated with hard size caps. The trial publishes `build.json` with a SHA-256 per file so anyone can verify the bytes served. **Attestation is integrity, not authorship, see §10.**                                                                                                                                                                                                                                                                                                                   | `tauri.conf.json:51`, `utils/backup.ts:203`, `scripts/build-trial.mjs` |
| A09 Security Logging & Alerting Failures  | **A09 (promoted)** | No client telemetry, by privacy design, and that design is itself enforced (§12). Server-side we keep: in-memory rate-limit counters, fulfillment outcomes, `pending:`/`review:` work queues, and owner email alerts on pool exhaustion, email-delivery failure, unknown price IDs, and unresolvable customers. **Open: counters are per-isolate and ephemeral (F7).**                                                                                                                                                                                                                              | `license-worker/worker.js:166-196,283-291`                             |
| A10 Mishandling of Exceptional Conditions | **NEW in 2025**    | Every worker route answers misconfiguration with an explicit 500 and a static message, never a stack trace, never the secret's name. Webhook handling fails **closed** at every branch: missing secret → 500, bad signature → 401, unparseable body → 400, unknown price → held for review rather than minted. Offline license failure is a deliberate fail-_open_ to grace tiers, documented in §7.4. Rust errors are static strings or `.to_string()` of library errors, never interpolated key material.                                                                                         | `license-worker/worker.js:256-270`, `license.rs:11,33,36,40`           |

### 3.1 What the 2025 rename actually changes for us

Three categories are new or promoted, and two of them are where the remaining
work is:

- **A03 Supply Chain** is new _because_ of how much modern software is
  assembled. For a desktop app that pins an updater key and builds from a
  lockfile, the practical surface is the two audit gates we do not run and one
  dependency that does not come from the registry. That is F5 and F6, both
  cheap to fix.
- **A02 Security Misconfiguration** is promoted from A05, which matches our
  experience: the single largest real gap in this codebase is missing response
  headers on the landing pages (F1), not a logic bug.
- **A10 Exceptional Conditions** is new, and it is the category that caught the
  webhook design. "What happens when this fails?" is the right question for a
  system that mints money-adjacent entitlements.

---

## 4. OWASP API Security Top 10:2023, worker routes

| ID                                                   | Risk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Posture |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| API1 Broken Object-Level Authorization               | `/validate` takes a key, not an object ID. `/admin/kv` takes arbitrary key names but is admin-gated. No endpoint accepts a user-controlled identifier that selects another user's row, because there are no users and no per-user rows. **OK by construction.**                                                                                                                                                                                                                                                                                               |
| API2 Broken Authentication                           | Admin routes: bearer token, `safeEqual` constant-time, and the code fails closed when `ADMIN_TOKEN` is unset (`worker.js:334`). Webhooks: HMAC-SHA256 over `ts:raw`, 10-minute window. Public forms: no auth, honeypot + per-IP limits. **OK.**                                                                                                                                                                                                                                                                                                               |
| API3 Broken Object Property Level Authorization      | `/validate` returns exactly `{valid, tier, expires_at, message}`. A valid-key response contains no email, no transaction ID, no subscription ID, those stay in KV and are never returned. `/api/release` proxies public GitHub release JSON. **No over-exposure.**                                                                                                                                                                                                                                                                                            |
| API4 Unbounded Resource Consumption                  | ✅ `/validate`: 30 req / 5 min per IP, 429 beyond, key capped at 64 chars, response is a constant-size object. ✅ `/api/issues` + `/api/waitlist`: 3/hr per IP. ✅ `/api/exp-hit`: allowlisted enum-shaped payload, counter map self-evicts. ✅ `/api/contact`: 3/hr per IP. ⚠️ All limits are per-isolate in-memory, so they bound casual abuse and not a distributed one (**F7**).                                                                                                                                                                          |
| API5 Broken Function-Level Authorization             | The license worker dispatches admin routes only on exact path+method matches; there is no path-prefix or wildcard branch that could widen the admin surface. Public and admin handlers never share a code path. **OK.**                                                                                                                                                                                                                                                                                                                                       |
| API6 Unrestricted Access to Sensitive Business Flows | ✅ **Fixed 2026-10-02.** `/validate` previously read the key from the query string, which put license keys in Cloudflare and worker access logs. It now accepts `POST` JSON and the desktop client sends `POST` (`license.rs:27-31`); the GET path remains solely for older builds. Fulfillment is idempotent on three independent keys, `txn:`, `evt:` (7-day dedupe), and a post-write claim check on `key:`, so replaying a webhook cannot mint twice. Pool exhaustion queues to `pending:` and alerts instead of failing the customer's purchase. **OK.** |
| API7 Server-Side Request Forgery                     | Every outbound `fetch()` target is a string literal (`landing/_worker.js:362,627`; `license-worker/worker.js:105,114`). No request-controlled value reaches a URL, a hostname, or a redirect. **No SSRF surface.**                                                                                                                                                                                                                                                                                                                                            |
| API8 Security Misconfiguration                       | `Access-Control-Allow-Origin: *` on `/validate` is required: native desktop clients send no `Origin`. It is safe here because the route is a pure oracle that returns a boolean and a tier for a key the caller already possesses, there is no ambient authority to abuse. Admin and webhook responses set no CORS header at all, so browsers cannot read them cross-origin. **OK with rationale recorded.**                                                                                                                                                  |
| API9 Improper Inventory Management                   | `sitemap.xml`, this table, and the route table in §2 are maintained together. When a route is added it appears in all three or the doc is wrong. Every 404 returns a static `{error:'not found'}`. **OK.**                                                                                                                                                                                                                                                                                                                                                    |
| API10 Unsafe Consumption of APIs                     | Paddle responses are parsed with `res.json()` and then _shape-checked_: an unrecognized price ID is held in `review:` for a human instead of being guessed from a billing cycle (`worker.js:280-286`). GitHub responses likewise. No `eval`, no dynamic `require`, no execution of upstream text. **OK.**                                                                                                                                                                                                                                                     |

---

## 5. OWASP Top 10 for LLM Applications:2025, constraints for v2

**v2 AI does not exist in the shipping build yet.** There is no Anthropic call
in `src/` and no model runtime in `src-tauri/`; the only reference to
`api.anthropic.com` anywhere in the repo is the desktop CSP allowlist (which
is exactly why F3 asks to remove it). These constraints are written _before_ the
feature so the review is a checklist rather than an argument.

1. **LLM01 Prompt Injection.** Model output is untrusted input, treated exactly
   like the HTML a user pastes into a proposal today. Any drafted body passes
   through the same ammonia allowlist before it reaches a render sink
   (`server.rs:149`). Rule: no model output ever reaches `dangerouslySetInnerHTML`
   or a raw HTML sink without that function in between.
2. **LLM02 Sensitive Information Disclosure.** Models run **on-device**. No
   cloud fallback, ever, a "improve this with Claude" affordance would ship a
   freelancer's client list to a third party and falsify the privacy policy.
   This is not a preference; it is a product claim. Enforcing it is
   architectural: the desktop CSP must never grow a model-provider origin, and
   the trial CSP must keep `connect-src 'none'` even though the trial will never
   run a local model.
3. **LLM03 Supply Chain.** Model weights are the supply chain. Any local model
   is pinned by hash, loaded from a path the app does not write, and never
   fetched at first run.
4. **LLM04 Data and Model Poisoning.** No fine-tuning on user data, ever. Drafts
   are ephemeral and discarded on session close; nothing user-authored becomes
   training data, and no data is retained to improve the product.
5. **LLM05 Improper Output Validation.** Structured fields (rate, currency,
   dates) are parsed and range-checked before entering the store. A model
   proposing a negative rate must fail validation, not persist.
6. **LLM06 Excessive Agency.** Drafting writes _text into a draft field_. No
   model-initiated tool calls, no file writes, no network actions, no
   cross-record mutation. Keep this invariant in a unit test, not a comment.
7. **LLM07 System Prompt Leakage.** System prompts contain no user data and no
   secrets; there is nothing worth stealing and no license logic in the prompt.
8. **LLM08 Vector and Embedding Weaknesses.** No embedding store is planned. If
   one is added, it inherits the trial's zero-network rule and the local-only
   rule simultaneously.
9. **LLM09 Misinformation.** AI output is labeled in the UI as locally drafted
   and requiring review. The realistic harm is a freelancer quoting a
   hallucinated rate to a client, a labeling requirement, not a nicety.
10. **LLM10 Unbounded Consumption.** Token ceiling per draft and per session.
    A local model still spins fans and drains battery, which on a laptop is a
    denial-of-service against the user.

---

## 6. Trial: how zero-network is actually enforced

This is the claim we make most publicly, so it gets the most detail.

### 6.1 The claim

> Your data never leaves your browser. The trial makes no network requests
> after it loads.

### 6.2 The enforcement

`landing/_worker.js:395-406`:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
font-src 'self' data:; img-src 'self' data: blob:; connect-src 'none';
media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
```

The load-bearing directive is `connect-src 'none'`. It forbids `fetch`,
`XMLHttpRequest`, `sendBeacon`, `EventSource`, and `WebSocket` from the page and
from any same-origin worker the page creates. An attacker who achieves XSS in
the trial cannot exfiltrate, because the browser will refuse the request
regardless of what the injected script wants to send.

`form-action 'none'` closes the second exfiltration path, a form POST to
`https://evil.example/`, which CSP `connect-src` alone does not cover.

Verified live:

```
$ curl -sI https://lance.cuajuandiego.workers.dev/try/ | grep -i content-security-policy
content-security-policy: default-src 'self'; ... connect-src 'none'; ...
```

### 6.3 The one deliberate exception

`trial-sw.js` is served **without** the page CSP (`_worker.js:433-440`).

This is not an oversight and the comment at `_worker.js:427-432` explains why:
a service worker's own `fetch()` calls are checked against the CSP delivered
_with the worker script_. Applying `connect-src 'none'` to the SW script made
`install()` fail, which left the worker permanently "installing", which meant
every navigation fell through to an empty cache and the trial was broken
offline. The exfiltration guarantee lives on the page responses; the SW script
gets `Content-Type`, `Service-Worker-Allowed: /try/`, and
`Cache-Control: no-store`-equivalent.

The SW itself is same-origin, GET-only, `/try/`-prefixed, and `/api/`-excluded
(`trial-sw.js:25-31`), so its fetch surface is strictly the trial's own static
assets.

### 6.4 Offline support

`precacheAll()` reads `/try/asset-manifest.json`, a list the build emits, and
caches every file in batches of six. Every route therefore works offline after
a single visit, including routes never opened while online. Cache names are
versioned (`lance-trial-v0.9.9-1`) and activation deletes every other cache, so
a new release cannot serve a mix of old and new bytes.

### 6.5 Attestation

`/try/build.json` publishes a SHA-256 for every served file. It answers "are
these the bytes the build produced?", it does **not** answer "who produced
them," because anyone can serve modified bytes with matching hashes. Authorship
is the updater's job (§10), not the attestation's. Stating it the other way
round would be the actual vulnerability.

---

## 7. License system

### 7.1 Key model

Keys are `LANCE-XXXX-XXXX-XXXX-XXXX` over the 32-symbol Crockford-style
alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (I/L/O/U/0/1 excluded so a key read
aloud survives transcription). 32^16 ≈ 1.15e24 candidates, and format
validation happens before any HMAC work, so guessing is not the threat.

A key is **minted** when its stripped body HMACs to a value divisible by
`999999937`, a large prime, chosen so the modulus is one instruction.
`scripts/generate-license.cjs` pre-generates a pool; the worker hands them out.

### 7.2 Issuance

`transaction.completed` → tier resolved from a live price-ID allowlist
(`PRICE_TIERS`) → customer email resolved from the Paddle API → a pooled key
claimed and bound in KV → key emailed via Resend.

Failure modes are explicit and none of them mints a key optimistically:

| Condition                       | Behaviour                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Unrecognized price ID           | Held in `review:`, owner alerted, **no key minted**                                         |
| Customer email unresolvable     | Held in `pending:` with the txn, owner alerted                                              |
| Key pool exhausted              | Queued in `pending:`, owner alerted with remediation text                                   |
| Email delivery fails            | Key **is** issued (money was taken); owner alerted to forward manually                      |
| Lost claim race on a pooled key | Detected by post-write read-back (`worker.js:175-176`), retries the next key up to 5 times  |
| Duplicate webhook               | `txn:` marker returns the existing key; `evt:` marker dedupes the whole delivery for 7 days |

`subscription.canceled` sets `revoked: true` on every key bound to that
subscription, which is checked on every online validation.

### 7.3 Validation paths

| Path                     | Mechanism                                                                                                      | When it applies                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Online (source of truth) | `POST {worker}/validate` with the key in the JSON body; worker checks KV first, then HMAC; revocation honoured | Whenever the worker is reachable |
| Offline (grace)          | HMAC in Rust against `LANCE_LICENSE_HASH`, a SHA-256 of the secret baked in at build time by `build.rs`        | No network                       |

Rust errors are static strings or library error text. Key material is never
interpolated into an error, a log line, or a UI message.

### 7.4 Fail-open is intentional

If the worker is unreachable, the app falls back to the offline HMAC check
rather than downgrading a paying customer to Free. This is the deliberate
inversion of the usual A10 posture, and it is safe here because the offline check
is the _weaker_ path by design (§7.5), failing open loses a little revenue,
failing closed would lose a customer's access because of a Cloudflare blip.

### 7.5 Offline bypass is accepted, not defended

An offline HMAC check is bypassable by construction. The secret's SHA-256 ships
inside every binary and `check % PRIME == 0` is forty readable lines of Rust.
Anyone with a disassembler gets Pro depth.

This is accepted deliberately:

- **Pro is depth, not a gate.** Archetype docs, forecasting depth, automation
  depth. The core app, clients, projects, invoices, proposals, time, finance ,
  is free forever. There is no meaningful "locked behind Pro" experience to
  protect, so the effort belongs elsewhere.
- **Online validation is the real control.** It can revoke. Offline cannot.
- **Guessing is infeasible; extraction is accepted; worker compromise is
  monitored.** Those are the only three ways in, and the response differs for
  each: nothing, nothing, and alerts.

**Standing policy: never chase obfuscation.** Anti-tamper, string encryption,
control-flow flattening, and debugger checks were evaluated and rejected. They
tax every honest build, break on every compiler update, produce false positives
for users, and raise the cost bar by minutes while being defeated by public
tooling in hours. Spend the effort on making Pro worth paying for.

### 7.6 Hardening shipped 2026-10-02

| #   | Change                                                                           | Where                                                  |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `/validate` accepts `POST` JSON; keys no longer land in access logs              | `license-worker/worker.js:229-239`, `license.rs:27-31` |
| 2   | 30 req / 5 min per-IP limit, 429 beyond, counter map self-evicts at 2000 entries | `license-worker/worker.js:203-216`                     |
| 3   | Constant-time bearer comparison for admin routes                                 | `license-worker/worker.js:68-75,334`                   |
| 4   | Webhook replay window (10 min) + 7-day delivery idempotency                      | `license-worker/worker.js:90,271-277`                  |
| 5   | Key input length-capped before any lookup or HMAC work                           | `license-worker/worker.js:231,235`                     |
| 6   | `revoked` checked before `tier` is ever returned                                 | `license-worker/worker.js:242-245`                     |

---

## 8. Cryptography inventory

| Purpose              | Primitive                                            | Source                                            |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| Share tokens         | 32 bytes CSPRNG → 64 hex chars                       | `rand::thread_rng().fill_bytes` (`sharing.rs:42`) |
| License mint/verify  | HMAC-SHA256, then `% 999999937`                      | `crypto.subtle` (worker) / `hmac` + `sha2` (Rust) |
| Secret comparison    | Manual XOR-accumulate, length-checked                | `safeEqual` (`worker.js:68`)                      |
| Webhook verification | HMAC-SHA256 over `ts:raw`                            | `crypto.subtle` (`worker.js:79`)                  |
| Build-time secret    | SHA-256 digest at compile time, never the raw secret | `build.rs` → `LANCE_LICENSE_HASH`                 |
| Update signing       | minisign, pinned public key                          | `tauri.conf.json:51`                              |
| Hashing              | SHA-256 for build attestation only                   | `scripts/build-trial.mjs`                         |

**No cryptography is invented, and no secret is stored reversibly.** The
build-time digest means the raw license secret is never in the binary, only its
hash, which raises the bar for extraction from "read a string" to "recover a
preimage". It does not prevent it, and §7.5 says so.

**Where we deliberately use none:** the local SQLite database is unencrypted.
The threat model is a stolen laptop against the OS's own disk encryption
boundary; a freelancer's client list living in a plaintext file _inside_ an
encrypted volume is not the risk being bought with a key-management scheme. If
that assumption ever stops holding, the fix is `SQLCipher` and a passphrase
prompt at launch, a product decision, not a security patch, and it goes in
`SECURITY.md`'s out-of-scope list before it goes in the code.

---

## 9. Input handling

### 9.1 Two sanitizers, one rule

HTML has two independent sanitizers, and that duplication is a liability
unless it is managed:

- **Rust / ammonia**, `server.rs:149-158`. Allowlist: `p, strong, em, h1, h2,
ul, ol, li, blockquote, hr, br`. Strips `script, style, iframe, object,
embed, form, input` and, because ammonia escapes unknown content, everything
  else. `id_prefix(None)` so ids cannot collide with the host page.
- **TypeScript**, `utils/sanitize.ts`. `sanitizeText` strips tags, `javascript:`
  and `on*=` handlers; `sanitizeSql` neutralizes _injection sequences_ rather
  than all punctuation, because stripping every apostrophe turned
  "O'Brien & Sons; LLC" into "OBrien & Sons LLC".

**The rule: Rust is the control, TypeScript is ergonomics.** Every portal
interpolation additionally goes through `escape_html`. If the two allowlists
ever diverge, the Rust one wins and the TypeScript one is a bug.

### 9.2 Limits

| Input                        | Limit                                                          | Enforced in                     |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------- |
| JSON backup envelope         | 50 MB                                                          | import path                     |
| CSV rows / cells             | 500 / 1000 chars (truncated)                                   | `import/parsers/spreadsheet.ts` |
| CSV formula injection        | leading `=`, `+`, `-`, `@` stripped                            | same                            |
| Profile fields               | 200 (name) / 254 (email) / 3000 (notes) + DB CHECK constraints | `utils/sanitize.ts:58`, schema  |
| Attachment blobs in a backup | 2 MB per file, 8 MB total                                      | `utils/backup.ts:203-205`       |
| License key (server)         | 64 chars, hard-capped                                          | `license-worker/worker.js:231`  |
| Landing form fields          | 100 name / 200 email / 120 title / 3000 details                | `_worker.js:326-337`            |
| Admin KV value returned      | 2000 chars                                                     | `license-worker/worker.js:327`  |

### 9.3 SQL

Every statement in `db.rs` and every command module uses bound parameters. There
is no `format!`/`concat!`/string-interpolation path into a query. The client-side
`sanitizeSql` is defence-in-depth against a future query built by hand, not a
substitute for parameterization.

---

## 10. Update chain and attestation

**Updates.** The Tauri updater fetches `/api/updates/latest.json`, verifies the
bundle signature against the `pubkey` pinned in `tauri.conf.json`, and refuses
an unsigned or mis-signed bundle. That pubkey is the trust anchor; the worker is
a distribution convenience, not a trusted party. A compromised worker can serve
a malicious `latest.json` and the client will reject it.

**Attestation is a different tool.** `/try/build.json` publishes SHA-256 per
file. It lets a user verify the bytes their browser received against the build
output. It does not authenticate the builder, a compromised origin can serve
tampered bytes with matching hashes. Keeping those two claims separate is the
point; conflating them would turn a nice property into a false one.

**Local release override.** `/api/updates/download-local/*` and the `mac`
branch of `/api/download/*` serve the exact filename named in a checked-in
manifest (`_worker.js:479`) and nothing else. Arbitrary paths cannot be
requested.

---

## 11. Secrets

| Name                                                  | Used by                          | Rule                                                       |
| ----------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `LANCE_LICENSE_SECRET`                                | build.rs, license worker         | Never in a repo; only its SHA-256 reaches the binary       |
| `LANCE_LICENSE_WORKER_URL`                            | compile-time env in `license.rs` | Public URL, not a secret                                   |
| `ADMIN_TOKEN`                                         | license worker `/admin/*`        | Fails closed when unset; constant-time compare             |
| `PADDLE_API_KEY`                                      | license worker                   | Server-side only                                           |
| `PADDLE_WEBHOOK_SECRET`                               | license worker                   | Server-side only; webhook fails closed without it          |
| `RESEND_API_KEY`                                      | both workers                     | Server-side only                                           |
| `GITHUB_TOKEN`                                        | landing worker                   | Server-side only; proxied responses are public data anyway |
| `CONTACT_TO` / `CONTACT_FROM` / `LICENSE_OWNER_EMAIL` | workers                          | Config, not secrets                                        |

`license-worker/` is gitignored. CI uses `LANCE_LICENSE_SECRET: dev-ci` so that
builds never depend on a real secret, which also means CI artifacts are never
production-grade licenses. That is intentional and should stay true.

---

## 12. Privacy as a security control

Most apps treat privacy as a policy document. Here it is a set of testable
properties, and each one is checkable by a third party:

| Property                                                          | How it is enforced                                                                             | How a skeptic verifies it                                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Trial sends nothing after load                                    | `connect-src 'none'` + `form-action 'none'`                                                    | `curl -I /try/` and read the CSP                                                                 |
| Trial is offline-capable                                          | Service worker precaches the full asset manifest                                               | Load once, disable network, open a route never visited                                           |
| Trial stores nothing remotely                                     | There is no remote store                                                                       | `localStorage`/IndexedDB inspector; the in-app panel enumerates every `lance:*` key and its size |
| Desktop sends no business data                                    | No outbound request in any command module; `connect-src` lists only payment and update origins | `rg 'fetch\(' src-tauri/src`                                                                     |
| Accessibility settings are detected locally and never transmitted | `matchMedia` only; the values live in `lance:prefs` and are read by CSS class toggles          | Open Settings → Comfort; inspect `localStorage['lance:prefs']`; observe no request in devtools   |
| No analytics contradicts the claim                                | There is no analytics client in the dependency tree                                            | `npm ls` and a devtools network log on every route                                               |

The accessibility detection is worth calling out because it is the kind of
feature that usually _does_ phone home. Reading `prefers-reduced-motion`,
`prefers-contrast`, and `forced-colors` via `matchMedia` is a local read of
settings the OS already applies to every web page. We use them to match what
the user's system is already doing, store the choice under `lance:prefs`, and
tell them so in the privacy policy. No device fingerprint is derived, no signal
is combined, and nothing is transmitted, which is why it needs no consent
banner, only disclosure.

---

## 13. Supply chain (A03), current state and remediation

### 13.1 What is already sound

- `npm ci` from a committed `package-lock.json` for every CI job.
- Tauri updater signature verification with a pinned public key.
- GitHub Actions pinned to major version tags rather than floating refs.
- Two workers with handwritten, dependency-free logic, no framework, so no
  framework CVEs. `landing/_worker.js` and `license-worker/worker.js` have zero
  imports.
- A dependency-light client: no UI kit, no data-grid, no date library.

### 13.2 What is missing

**F5, no vulnerability gate.** CI runs typecheck, lint, vitest, `cargo check`,
`cargo test`, and a build. Nothing runs `npm audit` or `cargo audit`. A CVE in
any transitive dependency merges silently.

**F6, `xlsx` resolves outside the registry.** `package.json:57`:

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

SheetJS moved off npm after the 0.18 registry dispute, so this is a deliberate
and understandable choice. The consequence is that the only integrity control
is the lockfile hash: a compromised `cdn.sheetjs.com` or a DNS/TLS failure at
the wrong moment lands code in every build, and `npm audit` covers the tarball
less thoroughly than a registry package. It is the single riskiest dependency
in the project.

### 13.3 Remediation, in order

1. **Add the audit gate.** A `security` job running `npm audit --audit-level=high`
   and `cargo install cargo-audit && cargo audit` as non-blocking-to-start,
   hard-failing-to-merge. Expect an initial allowlist: Tauri and `ammonia` pull
   in transitive Rust crates that will report advisories we cannot fix from here.
   Triage each into _fix_, _upgrade path_, or _not affected_, and record the
   reason next to the allowlist entry, a bare allowlist is how audit gates rot
   into decoration.
2. **Pin actions by commit SHA**, not by major tag. `@v4` is a moving target
   that can be repointed; SHA pinning makes the build reproducible and is a
   one-line change per action.
3. **Vendor or hash-check `xlsx`.** Best option: replace it. It is used for
   spreadsheet export/import, which a small purpose-built writer can do for the
   narrow shape we emit. Second option: keep the tarball but vendor the file
   into the repo so the build never reaches the network for it, and record the
   SHA-256 in a comment next to the version.

None of these block a release. All three are worth doing before the dependency
count grows.

---

## 13a. Rust command layer audit (2026-10-02)

The command layer was the one surface nobody had examined: the agent tasked with
it was cancelled twice. It has now been swept by hand. Method and results, so the
coverage is auditable rather than asserted.

| Check                                                            | Result                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| SQL built by `format!` or concatenation into `execute`/`prepare` | **Zero.** Every statement uses `?N` or `rusqlite::params!`                                       |
| Dynamic table or column names from input                         | **Zero.** No `ORDER BY` takes a caller-supplied column                                           |
| `LIMIT` interpolation (`metrics.rs`)                             | One hit. Typed `i64`, so not injectable, but unbounded (`LIMIT -1`, `i64::MAX`). Clamped to 1000 |
| `.unwrap()`/`.expect()` reachable from a command                 | **Zero.** All 20 in `kanban.rs` are inside `#[cfg(test)]`                                        |
| Panics in `server.rs` / `lib.rs`                                 | 3, all at startup. Two were app-kill risks on the portal path                                    |
| Path traversal                                                   | **One Blocker, fixed** (F12)                                                                     |
| Transaction atomicity on money writes                            | **One High, fixed** (F13)                                                                        |
| Unbounded `Vec<u8>` file payloads                                | 2 commands, now capped (F14)                                                                     |
| Error strings leaking SQL                                        | **Zero.** Database errors collapse to a static "Database operation failed"                       |
| IDOR via `entity_type` dispatch                                  | Single dispatch site, matched against a literal                                                  |

### Fixed here

**F12 Blocker, path traversal in `save_import_file`.** `dir.join(&filename)` with a
renderer-supplied string is arbitrary file write: `../../.ssh/authorized_keys`
escapes the imports directory and `fs::write` creates or truncates whatever it
reaches. The sibling `save_asset_file` already stripped separators, which is how
this call site stood out as the odd one out. Both now require the filename to
_be_ a single path component rather than cleaning one into shape (cleaning leaves
`....//` and friends), and both re-check that the resolved path is inside the
target directory. Covered by three Rust tests.

**F13 High, non-atomic payment write.** `create_invoice_payment` inserted the
payment row, then updated the invoice status in a second statement with its error
discarded (`let _ = conn.execute(...)`). A failure between them left a recorded
payment against a still-unpaid invoice, which is the state that hides revenue
from every report and the portal. Now a single transaction. The status
comparison also moved to integer cents, matching the client-side fix: a raw f64
comparison is precisely what made a displayed balance unpayable.

**F14 Medium, unbounded file payloads.** `save_import_file` and `save_asset_file`
accepted any `Vec<u8>`. A compromised renderer could ask for gigabytes and
exhaust memory before the write was attempted. Capped at 50MB, the same ceiling
the client enforces.

**F15 Low, portal panics.** `TcpListener::from_std(...).expect(...)` and
`local_addr().unwrap()` on the bind path. With `panic = "abort"` these would kill
the app rather than merely disabling the portal server. Both now log and return.

## 14. Risk register

Open findings, ranked by exploitability × impact. **Accepted** means the
decision is deliberate and written down, not that nobody looked.

| #       | Finding                                                                                                                                                                                                                                                                                                                                          | Sev     | Status                   | Decision / fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1**  | Landing, legal, and promo pages shipped **no** security headers, no CSP, no `nosniff`, no `Referrer-Policy`, no `frame-ancestors`, on pages that run script and post forms to `/api/*`.                                                                                                                                                          | Medium  | ✅ **Closed 2026-10-02** | `landingResponse()` applies a full policy to every HTML response from the landing worker. `script-src 'self'` with **no** `'unsafe-inline'`, which is stricter than the trial: every executable script in these pages is a same-origin file, and the inline `<script>` blocks are `application/json` data that CSP does not treat as scripts. Verified live on `1f4b3b6d`: fonts load, 1081 elements render, zero console errors; same-origin `fetch` returns 200 while a `fetch` to `example.com` and a jsdelivr `<script>` are both refused by the browser. |
| **F2**  | `/api/contact` had a honeypot but no rate limit while `/api/issues` and `/api/waitlist` both had one.                                                                                                                                                                                                                                            | Low–Med | ✅ **Closed 2026-10-02** | `issueRateLimited(ip)` now gates the contact route. Unauthenticated outbound email is no longer a free relay.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **F3**  | Desktop CSP allowed `https://api.anthropic.com` while nothing in `src/` or `src-tauri/` references Anthropic, an egress allowance that contradicted the local-first claim in our own privacy policy.                                                                                                                                             | Low     | ✅ **Closed 2026-10-02** | `connect-src` is payment + update origins only. `object-src 'none'` and `base-uri 'self'` added while the line was open. The origin returns only if a first-party integration lands, and only if it is on-device.                                                                                                                                                                                                                                                                                                                                             |
| **F4**  | Portal CSP carries `script-src 'unsafe-inline'` and no `form-action`/`base-uri`.                                                                                                                                                                                                                                                                 | Low     | **Accepted**             | The portal page inlines a small `fetch()` submit block; ammonia-sanitized content cannot break out of it, and the page is loopback-only and short-lived. If untrusted third-party content ever lands on the portal, this becomes High, move to a nonce then.                                                                                                                                                                                                                                                                                                  |
| **F12** | `save_import_file` took a renderer-supplied filename straight into `PathBuf::join`, allowing arbitrary file write outside the imports directory.                                                                                                                                                                                                 | Blocker | ✅ **Closed 2026-10-02** | Filename must be a single path component (rejected, not cleaned), plus a resolved-path containment re-check. `save_asset_file` hardened the same way. 3 Rust tests.                                                                                                                                                                                                                                                                                                                                                                                           |
| **F13** | `create_invoice_payment` wrote the payment row and the invoice status in two statements with the second error discarded.                                                                                                                                                                                                                         | High    | ✅ **Closed 2026-10-02** | Single transaction. Status comparison moved to integer cents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **F14** | `save_import_file` / `save_asset_file` accepted unbounded `Vec<u8>`.                                                                                                                                                                                                                                                                             | Medium  | ✅ **Closed 2026-10-02** | 50MB cap, matching the client-side limit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **F15** | Two panics on the portal bind path would abort the whole app, not just the portal.                                                                                                                                                                                                                                                               | Low     | ✅ **Closed 2026-10-02** | Log-and-return instead of `expect`/`unwrap`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **F5**  | No `npm audit` / `cargo audit` in CI.                                                                                                                                                                                                                                                                                                            | Medium  | ✅ **Closed 2026-10-02** | `security.yml` gates prod npm at high and runs the cargo gate. Verified by injecting an advisory: it fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **F6**  | `xlsx` from a CDN tarball outside the registry.                                                                                                                                                                                                                                                                                                  | Medium  | **Open**                 | See §13.3. Replace if possible, vendor otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **F7**  | Rate-limit maps are per-isolate and in-memory, so they reset on isolate eviction and bound casual abuse rather than distributed abuse. **Observed 2026-10-02:** six back-to-back `/api/contact` POSTs from one IP returned `200 200 200 200 429 200`, the 5th hit a warm isolate and was refused, the 6th landed on a cold one and was admitted. | Low     | **Accepted**             | The limit works; it is not a hard quota. Cloudflare KV or Durable Objects if abuse ever appears, Durable Objects give one authoritative counter per key and would remove the variance entirely. Recorded with the observed response pattern so nobody mistakes an in-isolate counter for a quota. The `/validate` limit's job is to make key-guessing expensive, and it does.                                                                                                                                                                                 |
| **F8**  | Test mode ships in the codebase, gated to dev + trial builds.                                                                                                                                                                                                                                                                                    | Info    | **Open by schedule**     | `demo/testMode.ts` + `TestModePanel.tsx` + `TestModeBanner.tsx` and their call sites. Not reachable in a production desktop build. Delete when the user says so; the gating makes it a cleanup, not a security fix.                                                                                                                                                                                                                                                                                                                                           |
| **F9**  | `/api/exp-report` is unauthenticated.                                                                                                                                                                                                                                                                                                            | Info    | **Accepted**             | Aggregate counters only, no PII, `no-store`. Recorded so a future reader does not "discover" it as a leak.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **F10** | Offline license validation is bypassable.                                                                                                                                                                                                                                                                                                        | Info    | **Accepted**             | §7.5. Structural, not fixable, and not worth fixing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **F11** | Local SQLite is unencrypted.                                                                                                                                                                                                                                                                                                                     | Info    | **Accepted**             | §8. Revisit only if the threat model changes from device-theft to shared-machine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Closed this pass:**

| Finding | Change                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| F2      | `/api/contact` rate-limited (3/hr/IP)                                                                                   |
| F3      | Unused `api.anthropic.com` egress removed from the desktop CSP; `/api/contact` limit verified live on worker `f5feb8b0` |
| ,       | `/validate` rate limit added (30 req / 5 min / IP)                                                                      |
| ,       | License keys moved out of access logs: `POST` body, desktop client updated                                              |
| ,       | `/admin/kv` responses truncated to 2000 chars                                                                           |
| ,       | Webhook replay bounded: 10-minute window + 7-day delivery dedupe                                                        |

---

## 15. Verification

Everything above is re-checkable. Run these before any release:

```bash
# typecheck, lint, unit tests
npx tsc --noEmit && npm run lint && npx vitest run

# Rust: check + tests
(cd src-tauri && cargo check --lib && cargo test --lib)

# trial CSP is actually deployed
curl -sI https://lance.cuajuandiego.workers.dev/try/ | grep -i 'content-security-policy'
# expect: connect-src 'none'; ... form-action 'none'

# landing CSP is deployed on pages AND absent on assets
curl -sI https://lance.cuajuandiego.workers.dev/privacy | grep -ci 'content-security-policy'  # 1
curl -sI https://lance.cuajuandiego.workers.dev/style.css | grep -ci 'content-security-policy' # 0
# and it is actually enforced, not just present:
#   in the page console, fetch('https://example.com/') -> "Failed to fetch"
#   injecting <script src="https://cdn.jsdelivr.net/..."> -> blocked

# trial rejects writes
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://lance.cuajuandiego.workers.dev/try/
# expect: 405

# no sourcemaps in the shipped trial
ls landing/try/assets/*.map 2>/dev/null && echo 'LEAK' || echo 'clean'

# attestation covers every file
curl -s https://lance.cuajuandiego.workers.dev/try/build.json | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["files"]), "files", d["version"])'

# license worker hardening is live
curl -s -X POST -H 'content-type: application/json' -d '{"key":"LANCE-AAAA-AAAA-AAAA-AAAA"}' \
  https://<license-worker>/validate          # 200 + {valid:false}
for i in $(seq 1 35); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST -H 'content-type: application/json' \
    -d '{"key":"LANCE-AAAA-AAAA-AAAA-AAAA"}' https://<license-worker>/validate
done                                        # expect a 429 in the run

# worker logic has no dependencies to compromise
grep -c '^import' landing/_worker.js license-worker/worker.js   # expect 0 0
```

Plus the standing manual checks: load the trial once, kill the network, open a
route you never visited; open devtools and watch for zero requests; and read
the trial's storage panel and confirm every key is one we wrote.

---

## 16. Change log for this document

- **2026-10-02**, Rebuilt against OWASP Top 10:2025 (was 2021). Added trust
  boundaries, full attack-surface inventory, cryptography inventory, input-limit
  table, secrets inventory, privacy-as-control table, supply-chain section,
  risk register, and a verification script. Fixed `/validate` rate limit, POST
  body migration, webhook replay window, `/api/contact` rate limit (F2), and
  removed the unused `api.anthropic.com` egress allow (F3), and gave every
  landing-page response a real CSP (F1). F5 (audit gates) and F6 (`xlsx`
  pinning) remain open.
- **2026-10-01**, API Top 10 2023 and LLM Top 10 2025 mappings added;
  license-cracking posture written down so it stops being re-litigated.
