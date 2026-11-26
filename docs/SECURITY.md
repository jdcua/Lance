# Lance Security Model

## v1 Threat Model (Local Desktop App)

### In scope

- Malicious import files (JSON backup, CSV)
- Local network attacks against the client portal server
- Path traversal via asset filenames
- XSS in rendered HTML content (proposals, contracts)
- Formula injection in CSV imports

### Out of scope for a local-first app

- Remote code execution via network
- Account takeover (no accounts)
- Data breach via remote server (none; the client portal binds 127.0.0.1 only)
- Man-in-the-middle on update download (mitigated by Tauri's signature verification).
  Bundles are signed and verified with the pinned public key; the manifest is not signed, so rollback to an older signed build is blocked by a client-side version high-water mark in localStorage.

### Mitigations implemented

| Vulnerability                                          | Severity | Fix                                                                                                                                                        |
| ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
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

## Local-first foundations present today

- `user_id INTEGER DEFAULT 1` column added to all tables
- `app_events` audit trail table created
- Sensitive fields are stored locally without encryption; there is no user-held key and no sync.
- Tauri CSP `connect-src` allows only the app origin and the public GitHub API for release notes.

## Network access & privacy

Lance makes three kinds of network request by default: an unauthenticated GET to `api.github.com` for public release notes (at startup, cached for one hour); a silent update check to `github.com/jdcua/Lance/releases/latest/download/latest.json` (3 seconds after launch, then every 4 hours), with signed bundles downloaded only if you choose Install; and a loopback-only HTTP server on `127.0.0.1` ports 39821–39830 that serves client share links while the app is open. No request carries your business data, account, or telemetry. No accounts or remote storage exist. The release-notes GET and the update check are enabled by default and can be turned off together with the "Release and update checks" switch in Settings → General; the loopback share server is not affected. The switch takes effect for future checks only: release notes already cached stay visible until the one-hour cache expires or the app is remounted, and the updater picks up the change on its next scheduled check.

## Responsible Disclosure

Please **do not open a public issue** for an unpatched vulnerability. Report it
privately via GitHub's security advisory form:
https://github.com/jdcua/Lance/security/advisories/new

We aim to acknowledge within 48 hours. See the root [SECURITY.md](../SECURITY.md)
for supported versions and the full disclosure policy.
