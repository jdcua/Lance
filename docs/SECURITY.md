# Lance Security Model

## v1 Threat Model (Local Desktop App)

### In scope

- Malicious import files (JSON backup, CSV)
- Local network attacks against the client portal server
- License key bypass attempts
- Path traversal via asset filenames
- XSS in rendered HTML content (proposals, contracts)
- Formula injection in CSV imports

### Out of scope in v1 (addressed in v2)

- Remote code execution via network
- Account takeover (no accounts)
- Data breach via server (no server)
- Man-in-the-middle on update download
  (mitigated by Tauri's signature verification)

### Mitigations implemented

| Vulnerability                                          | Severity | Fix                                                                                                                                                        |
| ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| License key validation in JS (extractable from bundle) | High     | Moved to Rust Tauri command via HMAC-SHA256; hash constant only in compiled binary                                                                         |
| Portal server lacks custom header check                | Medium   | Added `X-Lance-Client: portal` header requirement on POST endpoints                                                                                        |
| Portal HTML renders unsanitized user content           | High     | Added ammonia HTML sanitizer; allowlist: p, strong, em, h1, h2, ul, ol, li, blockquote, hr, br; strip script, style, iframe, object, embed, form, input, a |
| Portal page lacks security headers                     | Medium   | Added X-Frame-Options: DENY, CSP, X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer                                                            |
| Share tokens are 32 alphanumeric chars (non-crypto)    | Medium   | Tokens now 32 crypto-random bytes encoded as 64 hex characters                                                                                             |
| No token brute-force rate limiting                     | Medium   | Added 10-failure lockout per source IP for 5 minutes                                                                                                       |
| Asset path traversal possible                          | Medium   | Added canonical path validation before all file operations in assets directory                                                                             |
| JSON import has no size limit                          | Medium   | Added 50MB file size rejection with clear error message                                                                                                    |
| CSV formula injection not stripped                     | Medium   | Strip leading =, +, -, @ from all cell values before processing                                                                                            |
| CSV no row/cell size limits                            | Low      | Max 500 rows, max 1000 chars per cell with truncation                                                                                                      |
| CSV email field not validated                          | Low      | Added proper email regex validation before insertion                                                                                                       |
| User profile fields have no length limits              | Low      | Added maxLength on inputs + CHECK constraints in DB                                                                                                        |
| Auto-updater has no audit trail                        | Low      | Added app_events table logging for update_applied events                                                                                                   |
| No X-Frame-Options on portal pages                     | Medium   | Added X-Frame-Options: DENY                                                                                                                                |
| Only basic CSP in Tauri webview                        | Low      | Enhanced CSP with script-src, connect-src, frame-ancestors                                                                                                 |

## v2 Additions (planned)

- Supabase Auth (JWT, magic link, OAuth)
- Row-level security in Postgres (user_id column migration complete)
- End-to-end encryption for sensitive fields before sync
- Rate limiting on all API endpoints
- GDPR: data export and deletion endpoints
- Audit log for all data mutations

## v2 Foundations Set in v1

- `auth.ts` stub module: all identity queries route through `auth.getUserId()`
- `user_id INTEGER DEFAULT 1` column added to all tables
- `app_events` audit trail table created
- Sensitive fields annotated with `-- SECURITY: encrypt with user key in v2`
- Tauri CSP `connect-src` lists only the payment and update origins, no model
  provider, because v2 AI is on-device by design (see
  `SECURITY_DESIGN_NOTES.md` §5)

## Current mapping

This is the v1 desktop threat model. For the current OWASP Top 10:2025 /
API Top 10:2023 / LLM Top 10:2025 mapping, the attack-surface inventory, and
the open-findings register, see `SECURITY_DESIGN_NOTES.md`.

## Responsible Disclosure

Security issues: security@placeholderlabsincorporatedlimited.yabbadabbadoo
We aim to respond within 48 hours.
