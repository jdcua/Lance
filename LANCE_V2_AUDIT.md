# LANCE V2 FULL AUDIT (READ-ONLY)

> Mission: scan everything, change nothing. Date: 2026-10-09 (UTC).
> Workspace: `/Users/juandiegocua/Projects/Developer/Lance`
> Method: direct file reads + 6 parallel read-only subagents (frontend, Rust, landing/workers, CI/CD, legal, tests). No code modified. Claims below cite `path:line`. "Confirmed" = read in file. "Suspect" = inferred, needs runtime check.

Stack (confirmed `package.json:31-60`, `src-tauri/Cargo.toml:10-31`):
React 18 + react-router 6 + Zustand 4 + Tauri 2 + Vite 8 + Tailwind 3 + SQLite (`@tauri-apps/plugin-sql`, `rusqlite bundled`) + Paddle hosted checkout + 2 Cloudflare Workers.

Version drift (confirmed, launch blocker):
`package.json:4` = `0.9.9-3`, `src-tauri/tauri.conf.json:4` = `0.9.9-3`, `src-tauri/Cargo.toml:5` = `0.9.9-3`, but `landing/index.html:41-42` JSON-LD says `0.9.9-1 · 2026-10-02`, `CHANGELOG.md:27` latest dated entry is `0.9.3 (2026-08-07)` + `[Unreleased]`. No single source of truth at launch.

---

## 1. INVENTORY — every feature/offering, completeness, location

Legend: REAL = end-to-end working code read. PARTIAL = works but gated/thin/no backend. STUB = UI only. All routes lazy in `src/router.tsx:91-123`, basename `/try` in trial (`src/router.tsx:89`).

### 1.1 App shell & routes (confirmed `src/router.tsx:7-24,97-113`, `src/App.tsx:1174-1200` per subagent)

| Route | File (size) | Verdict |
|---|---|---|
| `/` Dashboard | `src/screens/Dashboard.tsx` (723 lines) | REAL, archetype-driven greeting/metrics/widgets |
| `/archetype` picker | `src/screens/ArchetypePicker.tsx` (258) | REAL |
| `/proposals`, `/proposals/new` | `src/screens/Proposals.tsx` (723), `NewProposal.tsx` (324) | REAL, expiry engine |
| `/contracts` | `src/screens/Contracts.tsx` (702) | REAL, presets + PDF/DOCX |
| `/projects` | `src/screens/Projects.tsx` (783) | REAL + Kanban/sprint tabs |
| `/time` | `src/screens/Time.tsx` (920) | REAL timer + quick-log |
| `/invoices` | `src/screens/Invoices.tsx` (2266, largest) | REAL full lifecycle |
| `/follow-ups` | `src/screens/FollowUps.tsx` (573) | REAL dunning queue |
| `/clients` | `src/screens/Clients.tsx` (1307) | REAL CRM |
| `/finance` | `src/screens/Finance.tsx` (2063) | REAL forecast/cashflow/expenses |
| `/insights` | `src/screens/Insights.tsx` (360) + `ProInsights.tsx` (276) | REAL, gated panels |
| `/settings` | `src/screens/Settings.tsx` (3241, largest — god screen) | REAL profile/license/theme/templates |
| `/achievements` | `src/screens/Achievements.tsx` (75) | REAL thin view |
| `/assets` | `src/screens/Assets.tsx` (981) | REAL attachments library |
| `/search` | `src/screens/Search.tsx` (272) | REAL global search (`searchRank.ts`) |
| `share/:token` (no shell) | `src/screens/ShareView.tsx` (459) | REAL public portal, sanitized |
| `*` | `src/screens/NotFound.tsx` (23) | STUB |

Shell engines (confirmed `src/App.tsx:550-944`): recurring auto-gen (`550-697`, catch-up capped), follow-up checker 30min (`722-827`), proposal expiry hourly (`830-898`), portal-open polling 30s (`208-252` per subagent), global timer toggle (`956-1063`), drag-drop import (`903-944`), auto-backup via `requestIdleCallback` (`700-719`), Cmd+K `CommandPalette` (`1086`), `QuickTimeLogModal`, `UpdaterModal`, `UpgradeModal`, `Walkthrough/SpotlightTour`, `SplashScreen`, changelog modal.

State (confirmed `src/store/index.ts:242-660` interface, `664-889` impl): single Zustand `UnifiedStore` with flat arrays for every entity (`243-280`). Delete-guards prevent orphans: `deleteClient:912-970`, `deleteProject:993-1057`, `deleteInvoice blocks if payments:1263-1273`, `deleteTimeEntry blocks if billed:1201-1223`. Toast queue inside store (`778-835`, capped `slice(-2)` = max 3). Updater slice (`838-851`).

Storage (confirmed `src/db/index.ts:498-560` `getDb()+runMigrations()`, `src/utils/tauri.ts:15,198-820`):
- Tauri REAL: SQLite `lance.db` in `app_data_dir` (`src-tauri/src/db.rs:8-24`, `PRAGMA foreign_keys=ON;journal_mode=WAL:20`), `sql.preload:[sqlite:lance.db]` (`tauri.conf.json:50-52`). ~20 core tables + ~80 frontend-only archetype aux tables (`src/db/index.ts:579-1162`).
- Browser REAL shim (not stub): `MockDatabase:128-496` + `tauriInvoke` shim backed by `localStorage lance:store:*` + `lance:profile` singleton (`tauri.ts:216-224`). Supports SELECT/INSERT/UPDATE/DELETE subset, aggregates, cascades.
- Backup: `src/utils/backup.ts`, trash bin `src/utils/trash.ts` (snapshot before delete, restore path).
- No cloud sync. `auto_backup_state`, `app_events` tables exist but no Rust commands reference them (confirmed by backend subagent). Sync = manual JSON export/import.

### 1.2 Money engine

- **Invoicing REAL** (`Invoices.tsx:1-2266`, `recurringEngine.ts`, auto-gen on boot `App.tsx:609-697`, numbering `invoiceNumber.ts`, overdue auto-mark `App.tsx:793-799`, PDF/DOCX `export/pdf.tsx`, `export/docx.ts:236`). Recurring with catch-up cap, payments + partials (`store loadPayments/createPayment`), line-item `time_entry_ids` linkage (unmark on delete `store/index.ts:1279-1298`).
- **Payments REAL but manual**: `create_invoice_payment` records money; no Stripe/Paddle in-app collection. Profile `payment_instructions` print on PDFs (`CHANGELOG:16`). Lance never takes cut (confirmed `README:12,46`).
- **Aging REAL (derived, no dedicated screen)**: `sent→overdue` transition (`App.tsx:793-799`), `getUnpaidInvoices/getFinanceSummary:628-646`, overdue styling in exports. Suspect: no aging buckets UI (30/60/90) — verify in Finance screen.
- **Follow-ups / smart dunning REAL**: `FollowUps.tsx:1-573`, templates 3 stages + tone variants (`followUpTemplates.ts:18-227`), engine (`App.tsx:722-827`), late-fee engine Pro `% per 30d` (`lateFees.ts:1-40`), auto-resolve on pay/accept (`store/index.ts:1107-1262`).
- **Forecasting REAL**: `lib/forecast.ts:1-388` (recurring/milestone/sent/baseline, expense forecast, cashflow, scenarios, runway `338-388`), 3-mo + 6-mo planner (`CHANGELOG:5`). "Can I afford this month" = cashflow + runway; no tax set-aside calculator found (grep: only `taxPack.ts`, `tax_rate` field — PARTIAL).
- **Expenses REAL**: categories + receipts + year summary + records CSV (`taxPack.ts`, `yearSummary.ts`).
- **Multi-currency REAL (manual rates only)**: `lib/currency.ts:1-126` (`CAD/USD/EUR/GBP/AUD`, `getInvoiceCurrency:35-41`, `sanitizeRates/normalizeRates/convertAmount/convertByCurrency`), profile `exchange_rates` (`types/index.ts:152-156`, `store:1384-1478`, `db/index.ts:556`). Stale `TODO(v1.5): add exchange rate API or manual rate input` at `Finance.tsx:851` — comment predates the manual-rates feature; rates ARE manual today (confirmed). No live FX API.
- **CSV import REAL**: `import/index.ts:1-84` router by ext, `parsers/spreadsheet.ts` (xlsx/csv via SheetJS CDN tgz `package.json:58`), `classifier.ts` scoring, `mappers.ts`, `ImportModal.tsx + ColumnMapper.tsx`, `clientImport.ts`, `bankCsv.ts` (alias detection, expenses-only, income skipped — PARTIAL for bank reconciliation). Competitor import Bonsai/HoneyBook/FreshBooks/Wave claimed (`CHANGELOG:14`) — confirmed `clientImport.ts` exists, depth unverified (suspect: header-mapping only).

### 1.3 Client portal

REAL, two implementations kept in sync (confirmed):
- Desktop: Axum on `127.0.0.1:39821-39830` else ephemeral (`src-tauri/src/server.rs:837,922-951`), `GET /share/:token` + `POST /share/:token/respond`, rate-limit 60/60s, token-lookup-fail 10/300s, 30s timeout, 16KB body limit, sema 64, `X-Lance-Client:portal` CSRF check (explicitly not auth vs local process), `ammonia` + `escape_html` sanitize, `DENY/nosniff/CSP/form-action none` headers.
- Browser: `ShareView.tsx:1-459` with own allowlist sanitizer (`16-116`: `ALLOWED_TAGS`, `OPAQUE_TAGS` drop script/style/iframe+text, `a[href]` scheme-gated http/https/mailto, images banned anti-pixel, `MAX_DEPTH 100` anti-stack-blowup).
- Tokens revoked on entity delete (`store:196-212` loop 10), activity polling (`portalActivity.ts`, `App.tsx:208-252` toasts). No account system, no hosted portal URL — client must receive link + have network path to sharer's machine (suspect: localhost-only means remote clients can't open it unless port forwarded — biggest portal caveat, verify before marketing "send link").

### 1.4 Time tracking

REAL (`Time.tsx:1-920`, global timer `App.tsx:956-1063`, `QuickTimeLogModal.tsx`, billable/unbilled, invoice linkage `types/index.ts:93-105`). Keyboard shortcut claimed (`README:25`) — `shortcuts.ts` exists but untested (see §1.7).

### 1.5 Archetypes — 44 total, not 21 (confirmed `registry.ts:46-96`, `types.ts:95-138`)

List: `default, animator, developer, designer, photographer, writer, consultant, filmmaker, illustrator, 3d-artist, game-developer, ux-designer, marketing, social-media, copywriter, musician, architect, virtual-assistant, translator, seo, data-analyst, custom, advertiser, project-manager, accountant, event-planner, voice-actor, tutor, wellness, legal, fashion-designer, devops, cybersecurity, ai-engineer, embedded, blockchain, product-manager, growth, cx-strategist, recruiter, trainer, nutritionist, real-estate`.

Depth per archetype — honest verdict: **config REAL, workflow SHALLOW**:
- Schema `types.ts:47-86`: `dashboard{greeting, metricCards[4], widgets[1-2], quickActions[3]} + sidebar[~9] + insights{mode, headline, panels[5], hidePanels} + archetypeFeatures[3-5] + proposalTypes + contractPresets[2] + aiPrompts[3] + deposit/paymentTerms/maxRevisions`.
- Example `developer.ts:1-91`: 4 metricCards (all `query:null` — labels only, computed in JS not SQL), 1 widget, 5 insight panels (component names only), 4 features, 2 contract presets (full HTML bodies with variables — deepest part), 3 aiPrompts (prompt strings, no backend).
- Most files ~90 lines, same shape. Runtime: 186 feature components in `components/features/` (e.g. `SprintBoard.tsx:453`), metric SQL in `archetypes/queries/index.ts:1-331`, 7 core work-log tables in store (`758-764`) + ~80 aux tables in `db/index.ts`.
- Gating: `archetypeDepth` flag (`constants.ts:306` free=false, pro/trial=true) via `useFeatureGate.ts:1-30`. Free still gets picker + sidebar; Pro unlocks presets/features/panels.
- Copy mismatch (blocker): `README:16`, `landing/index.html:287,757`, `press.html:34` say **41**; `CHANGELOG:80` says **42**; code has **44**. Pick one number before launch.

Workflows/contracts/pricing-models per archetype: contracts = 2 HTML presets each (real text, `{variables}`); proposals = `proposalTypes` string list only (e.g. `['hourly','flat','project']` — no per-type pricing logic found); pricing models = `defaultRateLabel` + `maxRevisions` + rate calculator component (generic, not per-archetype math). **No per-archetype tax, payment terms enforcement, or workflow state machines found.** A cloner copies the *shape* in a weekend; the *content* (88 contract bodies + 186 widgets) is the real depth.

### 1.6 Offerings & pricing (confirmed)

- Core free forever (`README:58`, `landing/index.html:811-823`). Pro `src/lib/pricing.ts:6-10`: `$14/mo, $99/yr (−41%), $249 lifetime`. Landing `#pricing` (`index.html:791-867`): Free $0 / Pro $99/yr toggle / Lifetime $249; CTAs point to `#download`, "Checkout opens after you download." JSON-LD offers match. Terms (`terms.html:38`) + refunds (30-day via Paddle) match.
- Trial: 30d full + soft to 37d hard (`constants.ts:293-297` `FULL_DAYS:30, SOFT_DAY:30, HARD_DAY:37`), one-time amnesty (`store:1591-1614`), countdown + expired + "what Pro earned you" screen (`CHANGELOG:12`).
- Checkout: Paddle hosted, in-app only (not on landing). `openCheckout(tier)` builds `${BASE}?price_id=${id}`, `openUrl()` else `window.open` (`tauri.ts:856-871`), toast "not configured" if env missing (`Settings.tsx:905-906`). Live price IDs public in `.env.example:7-9`; `VITE_PADDLE_CHECKOUT_URL=` **empty** (`:14`) — per-build secret via GH Secrets (`release.yml:93-98`). Status: `promo/launch.json:6` = "PAUSED Sept 2026 pending Paddle hosted-checkout approval" (per subagent — suspect, verify file). Do not launch paid traffic until checkout approved + env wired.
- Fulfillment (confirmed `license-worker/worker.js:341-479`): `transaction.completed` → `tierForItems()` → email via Paddle API → pop `pool:` key → write `key:/txn:/sub:` → Resend "Your Lance license key" email. Failure modes 503-retry (unknown price→`review:`, no email→`pending:`, empty pool→`pending:`+owner alert). Revocation: `subscription.canceled→revoked`, `refunded/chargebacked/disputed→revokeKey`. Renewals reuse key + move `expires_at`.
- License validation (confirmed `license.rs:9-54`, `store:1499-1551,1633-1746,1757-1808`, `worker.js:275-339`): offline HMAC (mint origin only) → online worker (tier/revocation/expiry authoritative). 7-day revalidate + 7-day grace. Browser has no offline path (must have `online.valid`).

### 1.7 Tests, lint, types (confirmed configs)

- Vitest: 61 files / 276 `it|test` / 76 `describe` (grep count). `vitest.config.ts`: `src/**/*.test`, jsdom, `__TEST_MODE__='true'`. Setup mocks IO/matchMedia/idle.
- Playwright e2e: 4 files / 821 lines / 19 tests (`qa-first-run/edge/regression/trial`) — all first-run/onboarding/tour/trial/edge; **zero coverage of authenticated core CRUD, import/export, portal, backup, multi-currency, background engines**. `playwright.config.ts`: no `webServer`, no browser matrix, no retries/reporter. No `e2e` npm script.
- Untested dirs: `archetypes/ 0/47`, `components/ 5/224`, `screens/ 1/18` (only ShareView), `db/ 0/1`, `ai/ 0/2`, `export/ 0/4`, `hooks/useFeatureGate.ts` untested, `store/index.ts` core untested (only financeSummary/licenseGrace/trialStart).
- Lint: `eslint src/` only; ignores `dist,node_modules,src-tauri,landing,*.config`. `no-explicit-any:warn`, `no-unused-vars:warn`. No `lint:fix`.
- Types: `strict:true` but `noUnusedLocals/Params:false`, `skipLibCheck:true`, `include:["src"]` only; no `typecheck` script (types only via `npm run build` = `tsc && vite build`). Rust: `cargo check/test --lib` in CI only.
- A11y gate `scripts/axe-gate.mjs` exists (8 routes + 2 dark spots) but not wired to CI.

---

## 2. PREMIUM GAP AUDIT — what feels cheap/rough/inconsistent

Rated by perceived-quality damage. CONFIRMED = read in code. SUSPECT = needs eyes-on run (no UI run this pass).

| # | Issue | Evidence | Hurt |
|---|---|---|---|
| P1 | **God screens**: Settings 3241 lines, Invoices 2266, Finance 2063. One file = one route = slow edits, inconsistent section rhythm, regression risk. | `Settings.tsx`, `Invoices.tsx`, `Finance.tsx` sizes | HIGH — velocity + consistency killer |
| P2 | **Stale comments lying about wiring**: `UpdaterModal.tsx:12-17` "intentionally dormant — nothing calls setUpdateAvailable yet" but `App.tsx:900` mounts `useAutoUpdater()` which calls it (`useAutoUpdater.ts:112`). Future dev will "unwire" a live path. | `UpdaterModal.tsx:12-17`, `App.tsx:900`, `useAutoUpdater.ts:97-112` | HIGH (correctness) + MED (premium) |
| P3 | **Generic route fallback**: every lazy route shares one 4-bar skeleton (`router.tsx:63-84` `skeleton-pulse`). No per-screen skeletons, no empty/error art called out. Finance empty = one-line "No expenses recorded yet." (`Finance.tsx:859`). | `router.tsx:63-84`, `Finance.tsx:858-859` | HIGH — first paint feels template-y |
| P4 | **Toast cap = 3** (`slice(-2)` + new). Recurring auto-gen + achievement + import-draft toasts on first boot (`App.tsx:560-586`) will evict each other. | `store:800`, `App.tsx:576-584` | MED-HIGH |
| P5 | **Finance TODO shipped in comment**: `TODO(v1.5): add exchange rate API or manual rate input` (`Finance.tsx:851`) sits next to working manual rates (`currency.ts`). Copy/code disagree; a reviewer sees unfinished. | `Finance.tsx:851`, `currency.ts:54-78` | MED (signal) |
| P6 | **Trial-seeding flash**: trial seeds sample business async then reloads 9 lists (`App.tsx:559-574`); "first screen can stay empty until navigate away" is commented as fixed via reload — suspect flicker/double-load on slow disks. | `App.tsx:559-586` | MED-HIGH (suspect, verify with cold-boot profile) |
| P7 | **Keyboard**: Cmd+K palette + global timer shortcut exist, but `shortcuts.ts` untested, no shortcut cheatsheet found, `UpgradeModal`/changelog focus fixes noted (`CHANGELOG:22`) — verify Esc/focus-trap/arrow-nav on every modal. | `App.tsx:1086`, `shortcuts.ts` (untested) | MED |
| P8 | **Design tokens**: CSS vars (`--bg-primary`, `--accent`, 7 themes in `themes.ts:4-60`, Syne+Inter via Bunny) are consistent; but screens use ad-hoc Tailwind arbitrary values (`text-[10px]`, `rounded-[12px]` in `router.tsx:73`, `Finance.tsx:840`) + `text-[var(--text-tertiary)]` everywhere. Spacing scale not enforced. Suspect: 1100×680 min 900×600 window (`tauri.conf.json:15-22`) will cramp Finance/Invoices tables — verify at min size. | `themes.ts:12-44`, `router.tsx:67-74`, `tauri.conf.json:15-22` | MED |
| P9 | **Motion**: `motion/` (Fade/Stagger/Magnetic/AnimatedNumber) + `blur-in --d` on landing pricing (`index.html:794-807`) — real animation infra. Suspect: no `prefers-reduced-motion` audit found; `prefs.ts:1-70` has motion/contrast/textScale/glow toggles — verify they actually gate all animation. | `prefs.ts`, `components/motion/` | LOW-MED |
| P10 | **Onboarding**: splash + onboarding + tour + walkthrough + first-run checklist + trial banner + test-mode banner all mount in shell. `CHANGELOG:21` "Splash no longer vanishes mid-read; modals layer in sane order" suggests past z-order pain. Suspect: first-run modal stack still heavy — count modals on cold boot. | `App.tsx` shell, `CHANGELOG:21` | MED |
| P11 | **Copy tone**: in-app placeholders neutral (`Filter…`, `e.g. Monthly retainer`, `555-0000`, `you@example.com` in Invoices/Clients/Contracts) — no lorem, no dark patterns (confirmed sample). Landing hero absolutes ("never touches cloud / 100% offline / nothing to breach" `index.html:271-273,578-580,908-911`) overclaim vs license/Paddle/Resend/Bunny/Cloudflare flows — needs qualifier (see §5). AI present-tense "AI features are optional…" (`index.html:568-570`) implies v1 AI that doesn't exist ("coming v2" elsewhere). | `index.html`, `README:40` | MED (trust) |
| P12 | **Dead ends**: MSI/DEB have no in-app update path (worker serves only `.app.tar.gz`/`.AppImage`/`-setup.exe`); share-modal in browser was dead-end, now fixed (`CHANGELOG:59`); `NotFound.tsx` 23-line stub. | Worker `UPDATER_BUNDLES`, `NotFound.tsx` | MED |
| P13 | **Interaction latency**: `initialize()` awaits 26 parallel loads (`store:858-887`); follow-up checker reloads proposals+invoices+clients+logs every 30min (`App.tsx:733-737`); delete-guards reload 8-12 lists before checking (`store:925-934,999-1012`). Fine on SSD, suspect jank on large DBs — needs `EXPLAIN` + pagination audit (not done this pass). | `store`, `App.tsx` | MED (suspect) |

What already feels premium (don't regress): delete-guards with honest errors, corrupt-row degradation (`parseLineItems`, `parseStringList`), updater rollback high-water mark (`useAutoUpdater.ts:10-22`), portal sanitizer depth, license comments narrating past bugs (e.g. `store:1500-1504` "{} is truthy" fix).

---

## 3. CRACK AND CLONE EXPOSURE

### 3.1 Pro bypass — CONFIRMED, all client-side

1. **Advisory-only validators.** `validate_license` returns `bool`, `validate_license_online` returns struct; nothing in Rust enforces (`lib.rs:185-186` registers, no command gates). Frontend may ignore `false` or skip the call. Patch = 1 JS line. CONFIRMED (`license.rs:10-54`, backend subagent + direct read).
2. **Unvalidated persistence.** `upsert_user_profile` writes arbitrary `license_key/tier/expires_at` with no validation call (`finance.rs:211-244` per subagent; `store:saveProfile:1424-1498` also writes `paidTierActive(sanitized)` locally). Attacker: devtools `invoke`, `sql` plugin `UPDATE user_profile SET license_tier='lifetime'`, or edit plaintext `lance.db` in `app_data_dir`. Tier/expiry/grace/trial cols (`db.rs:176-180`) never read/written by Rust — frontend-only. CONFIRMED.
3. **Direct DB/file access.** `capabilities/default.json:7-14` grants `sql:default` + `fs:allow-write-file/text-file`; DB unencrypted SQLite. No signature on `user_profile`. CONFIRMED.
4. **Offline forgeability.** `HMAC(hash(secret),msg)%999999937==0` (~1/1e9), algorithm + prime + hash in binary (`strings`). Brute-force offline, no revocation. Dev fallback `dev-secret-do-not-use-in-production` (`build.rs:4`) if CI secret unset — universally known hash. CONFIRMED (`license.rs:64-117`, `build.rs:1-16`).
5. **Air-gap = licensed.** `validate_license_online` errors when worker URL unset (`license.rs:23-30`); frontend falls back to offline (`store:1531-1537`). Blocking POST (offline/DNS/firewall) forces grace path; grace keeps Pro 7d and re-pings only every 7d (`LICENSE_REVALIDATE_MS`, `LICENSE_GRACE_DAYS`). Stay offline → stay Pro. CONFIRMED logic; exploit duration suspect (verify ping-on-boot cadence).
6. **`__TEST_MODE__` literal.** `vite.config.ts` defines it `command==='serve' || VITE_TRIAL==='1'`; `store:1404,1749,1818` gates test-mode rehydrate/tier/actions on it. Trial builds (`/try`) intentionally enable it. If any production desktop bundle is built with `VITE_TRIAL=1` or the literal leaks, `localStorage` write = permanent Pro (`store:1404-1413` comment says exactly this). CONFIRMED gate shape; leak status SUSPECT (verify build envs in `deploy-landing.yml:59-66`, `release.yml:79-98` — release does not set `VITE_TRIAL`, good sign).
7. **Which Pro value runs purely on client? ALL of it.** `FEATURE_FLAGS` (`constants.ts:300-360`): Pro vs Free differ only in `archetypeDepth, scopeCreepProtection, advancedInsights, smartDunning` booleans; `contractPdf/docxExport/clientPortal/recurringInvoices` are `true` for every tier including expired. `useFeatureGate` reads `getActiveTier()` (local profile) → `getFeatureFlags()` (local map). No server check per action. CONFIRMED.

### 3.2 Weekend-clone threat model

- **Replicable in a weekend (don't moat on these):** CRUD + SQLite + PDF/DOCX export, timer, recurring invoices, Kanban, themes, Cmd+K, global search, CSV import shell, landing pricing page, Paddle hosted checkout link. All commodity libs (`@react-pdf`, `docx`, `xlsx`, `dnd-kit`, `tiptap`).
- **Hard to copy (moat candidates):** 88 contract bodies with per-craft variables + 186 feature widgets + 44 archetype configs (content volume); follow-up stage engine + tone variants + auto-resolve wiring; forecast/scenario/runway math on own data; bank-CSV alias + dedupe; portal hardening (rate-limit, ammonia, CSRF, allowlist sanitizer both stacks); updater rollback guard; import classifier scoring; delete-guard/trash/corrupt-row resilience (invisible reliability). A vibe-coder demos the former; the latter is months of edge cases.

---

## 4. MOAT OPPORTUNITIES — ranked by (impact × difficulty-for-cloners) / effort

| Rank | Bet | Why it moats | Effort | Score |
|---|---|---|---|---|
| 1 | **Money engine: invoice → pay → reconcile → tax set-aside → "can I afford this month"** | Every freelancer's panic question; needs real payment records + forecast + expenses joined. Cloners ship invoice PDFs, not cash truth. Add: bank-CSV reconcile (match payments↔invoices), per-invoice tax set-aside %, affordability banner ("covered / tight / short $X"). | M (reconcile matcher + 2 Finance panels) | Highest |
| 2 | **Server-side entitlements for Pro (portal-sync-payments-AI gate)** | Fixes §3.1 AND creates moat: hosted portal links, cross-device sync, payment webhooks, AI drafts all require worker-verified tier. Pure-client Pro can never moat. | M (Rust gate + worker session; see §6) | Highest |
| 3 | **Client portal as spreading loop** | Every share link puts Lance in front of a buyer. Today localhost-only (see §1.3 caveat) — if hosted relay, "Powered by Lance → start trial" on every portal view is viral. Add: hosted relay + approve/comment + open alerts (proposal radar exists per CHANGELOG:9 — surface it in portal). | M-L (relay worker + `respond_share_token` already exists) | High |
| 4 | **Intelligence on own data (no AI needed)** | Late-payer prediction (days-overdue per client history), pricing advice (effective vs stated rate per archetype), scope-creep flags (revision count vs `maxRevisions` → one-click change-order invoice — CHANGELOG:7 claims it, verify depth), auto-drafted invoices from time + calendar/email (calendar/email ingest doesn't exist yet — position as v2 teaser, ship time→invoice first). All local compute, no privacy cost. | S-M (queries over existing tables) | High |
| 5 | **Archetype depth (content, not framework)** | Framework is done; depth is thin (§1.5). 2 contract presets + string proposalTypes per craft won't survive comparison. Add: per-archetype invoice defaults, milestone templates, rate bands, 1 killer widget each for top 5 crafts (dev/photo/design/writer/consultant). Don't add archetype #45. | M (content sprint) | Med-High |

Deliberately deprioritized: live FX API (manual rates suffice), AI drafting (announce, don't ship this weekend — no backend, privacy story risk), mobile apps, team/multi-user.

---

## 5. LAUNCH BLOCKERS — must fix before public

**Build/signing/updater (ship-stoppers):**
- B1. **No macOS signing/notarization.** `release.yml:76-98` passes only updater minisign; no `APPLE_*`, no keychain/notary/staple, no `.entitlements`, no `minimumSystemVersion`. DMG ships ad-hoc → Gatekeeper blocks on stock macOS. CONFIRMED.
- B2. **Updater pubkey double-encoded.** `tauri.conf.json:59` decodes to the whole minisign `.pub` file (2 lines incl. `untrusted comment:`), Tauri expects raw key (`RWR…`). Every signature check fails. CONFIRMED.
- B3. **Missing capability ACLs.** `capabilities/default.json:6-17` lacks `updater:default` (needed `useAutoUpdater.ts:97-98`, `UpdaterModal.tsx:41`) and `process:allow-restart` (needed `UpdaterModal.tsx:52`). Plugins registered (`lib.rs:18-19`) but IPC denied → silent no-update. CONFIRMED.
- B4. **macOS universal/Intel broken.** `release.yml:77` runs bare `npm run tauri build` (universal target lives in unused `build:mac` script `package.json:13`); manifest maps both `darwin-aarch64` + `darwin-x86_64` to one ARM artifact (`generate-latest-json.cjs:88-95`, `_worker.js:89`). Intel Macs get ARM bundle. CONFIRMED.
- B5. **Worker `GITHUB_TOKEN` SPOF.** `_worker.js:62-63,148-150` 500s all downloads+updates when unset; `wrangler.jsonc` declares no vars, `deploy-landing.yml` doesn't check it. CONFIRMED.
- B6. **No Windows signing.** No EV/Azure/signtool anywhere → SmartScreen "Unknown publisher". At minimum ship documented copy. CONFIRMED (grep negative).

**Checkout/money:**
- B7. **Checkout approval + env.** `VITE_PADDLE_CHECKOUT_URL=` empty (`.env.example:14`); live approval reportedly PAUSED (`promo/launch.json:6` — suspect, verify). Every buy button toasts "not configured" without env (`Settings.tsx:905-906`, `tauri.ts:858-860`). Test end-to-end with real $1 price before launch. CONFIRMED code path; approval status to verify.

**Legal/privacy/copy:**
- B8. **`support@example.com` live in 5 landing files** + TODO comments shipped (`privacy.html:191-237`, `index.html:1091-1103`, `terms/refunds/thanks footers`). Dead inbox for DSR/refund contact. CONFIRMED.
- B9. **`PRIVACY.md` stale vs `privacy.html`.** Claims updater fetches GitHub directly (`PRIVACY.md:7`) but worker proxies (`_worker.js:20-46`); omits license fields, Resend/GitHub-issues intake, Bunny/Cloudflare, A/B cookies. `README:46` + FAQ "only outbound request is updater" false after license/Paddle/Resend. CONFIRMED.
- B10. **Absolutes vs reality.** "Never touches cloud / 100% offline / nothing to breach" needs `privacy.html` qualifier. Telemetry contradiction: `CHANGELOG:18` "Local-first telemetry: on-device activity… nothing uploaded" vs "No telemetry" everywhere else — rename to "on-device activity log" + point to panel. CONFIRMED.
- B11. **Counts/dates/pricing copy.** 41 vs 42 vs 44 archetypes; platform matrix README (Intel+MSI+deb) vs landing FAQ (Silicon-only/AppImage-only); JSON-LD `0.9.9-1` vs bundle `0.9.9-3`; `$149` launch ribbon (`press.html:35`, `index.html:188`) undisclosed; AI present-tense (`index.html:568-570`); retention "30 days" vs "as needed"; `terms.html` no last-updated, `refunds.html` no date. CONFIRMED.
- B12. **Missing pages.** No public `/cookies` (3 A/B cookies + theme LS exist: `cookie-policy-draft.md:14-17`, `ab-activator.js:6-10`) or `/disclaimer`; no DPA/subprocessor page (acceptable for sole-prop, gap for B2B). Decision parked in `resolved-defaults.md:33`. CONFIRMED.
- B13. **Legal identity blanks.** Name/address/inbox required before Termly publish (`docs/legal/README.md:25-30`); drafts contain `__________`/`[SUPPORT INBOX]` — must stay internal. `LICENSE.md` thin (5 rules only, no warranty/cap — cap lives in `terms.html:39` $20 CAD). CONFIRMED.

**Privacy exposure:** clean by design — no personal name/street/phone in public files (grep negative except `cuajuandiego.workers.dev` handle + `github.com/jdcua/Lance`). Custom-domain pass planned (`resolved-defaults.md:44`). CONFIRMED.

**Test/release hygiene (soft blockers):** no core-flow e2e, axe gate not in CI, `tag regex v[0-9]+.[0-9]+.[0-9]+` unescaped dots (`release.yml:6`), `bump-version.cjs` doesn't touch `Cargo.lock`, no tag↔version gate, `scheduled-release.yml` paused with hardcoded `v1.0.0`, no `landing/downloads/` commit guard, `docs/RELEASE.md:65-81` stale (old feed path, lowercase repo, old artifact names), single-failure fan-in (one red platform blocks all).

---

## 6. V2 PLAN FOR THIS WEEKEND (~2 days) — prioritized build order

**Principle:** launch-blockers first, then one money moat + one intelligence moat. No new frameworks, no archetype #45, no AI backend, no live FX.

### Saturday — "Ship it without shame" (blockers + trust)

1. **Fix updater triple (B2+B3+B4).** IN: single-line `pubkey`, add `updater:default` + `process:allow-restart`, universal mac build (or drop `darwin-x86_64` knowingly). OUT: Windows EV signing (document SmartScreen copy instead). GATE: `check()`→`downloadAndInstall`→`relaunch` on signed local build per OS; `latest.json` verifies against cites. WHY: without updates, every later fix never lands.
2. **macOS Gatekeeper story (B1).** IN: Apple signing/notarization secrets + CI step OR explicit "unsigned preview, right-click open" download copy + reduced mac rollout. OUT: pretending DMG is clean. GATE: fresh-VM Gatekeeper pass on stock macOS. WHY: #1 refund/1-star vector.
3. **Checkout end-to-end (B7).** IN: approve hosted checkout, wire `VITE_PADDLE_CHECKOUT_URL` + price IDs in release secrets, test monthly+yearly+lifetime with real transactions → key email → activate → revoke/renew paths. OUT: landing checkout (keep in-app only). GATE: paid $1 test key activates Pro; refunded key hits 7-day grace then downgrades. WHY: money must work before traffic.
4. **Legal/copy sweep (B8-B13).** IN: real inbox, strip TODOs, sync `PRIVACY.md`+README+FAQ to `privacy.html`, fix 44 count + platform matrix + version + AI tense + retention, qualify hero absolutes, date terms/refunds. OUT: Termly publish of cookie/disclaimer/DPA (explicitly defer with "controls in browser" wording). GATE: `grep -r example.com landing/` empty; counts consistent; `sitemap lastmod` ≥ ship date. WHY: dead inbox + overclaims are the fastest trust loss.

### Sunday — "Why it's premium" (moat slices sized for a day)

5. **Money engine slice (moat #1).** IN: payment↔invoice reconcile view (unmatched payments + overdue with one-click receipt match), tax set-aside % per invoice with "set aside $X" banner, affordability header in Finance ("covered/tight/short"). Uses existing `payments`, `forecast.ts`, `currency.ts`. OUT: live bank sync, auto-charge. GATE: seeded business shows matched + set-aside + affordability correctly; multi-currency rollup with missing rate shows honest "rate needed" (not silent misconvert). WHY: highest (impact×hardness)/effort.
6. **Intelligence slice (moat #4).** IN: late-payer score per client (avg days late from history), effective-vs-stated rate alert, scope-creep flag (revisions vs `maxRevisions` → one-click change-order draft — verify CHANGELOG:7 wiring, finish if stub). OUT: calendar/email ingest, AI prose (ship templates only). GATE: seeded late payer + over-revision project both flag; change-order creates draft invoice. WHY: "knows my business" is what cloners can't fake.
7. **Portal honesty + teaser (moat #3 starter).** IN: document localhost scope in share modal + portal UI ("client opens on your network; hosted links v2"), add open/click activity + "Powered by Lance" trial CTA in `ShareView`. OUT: hosted relay (spec it, don't build). GATE: share→open→respond round-trips locally; copy sets correct expectation. WHY: stops 1-star "link doesn't work" + plants loop.

**Explicitly OUT this weekend + why:** server-side entitlement enforcement (needs Rust gate + worker sessions — right, but >1 day and risky pre-launch; mitigate with §3 monitoring + fast-follow); AI drafting (no backend, privacy review needed); live FX (manual rates fine); new archetypes/widgets (content sprint post-launch); MSI/DEB updater paths (Tauri limitation — steer to NSIS/AppImage/tarball); mobile/team.

**Verification gates (run before tagging):** `npm run build` (tsc) clean; `npm test` green; axe gate on 8 routes; Playwright trial+edge specs; cold-boot profile (seed flicker, toast eviction, modal stack); min-window 900×600 pass on Finance/Invoices; fresh-VM install per OS; checkout $1 live test; `grep` hygiene (example.com, TODO(owner), 41/42 counts, `TODO(v1.5)` resolution).

---

### Confirmed vs Suspect log

- Confirmed by direct read: versions, routes, store shapes, license HMAC + online flow + grace constants, feature flags, pricing constants, 44 archetypes + uniform config shape + `query:null` metricCards, currency manual rates + Finance TODO comment, portal sanitizers both stacks, updater wiring + pubkey + capabilities + release matrix, checkout builder + empty base URL, legal placeholders + stale privacy + count mismatches, test/lint configs + counts.
- Suspect (needs runtime): portal remote reachability, seed-flicker jank, toast eviction frequency, modal stacking order, min-window cramp, FX不用, competitor-import depth, change-order wiring completeness, `promo/launch.json` PAUSED status, `__TEST_MODE__` leak in shipped bundles, large-DB latency. Verify with a run before promising in copy.
