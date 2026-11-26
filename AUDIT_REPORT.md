# Audit Report — Phase 1 (refreshed 2026-11-25)

Read-only audit of `jdcua/Lance`. This refresh was produced by three parallel
subagents (legal/security/hygiene, code quality, contributor experience) and
re-measures the repository after the earlier Phase 3 work. **No application
code was changed by this phase.** The prior audit's backlog is re-checked
below: most P0 items are now **DONE**, and the remaining work is P1/P2.

**Scope note:** public `main` has 24 commits; the local clone has 318 commits
across all refs/reflog (evidence of a past local rewrite,
`.git/packed-refs` → `refs/original/refs/heads/main`). Earlier documents
describing "one squashed commit" or "318 commits" without qualification were
both imprecise. 593 files are tracked.

---

## 1. Current state and measurements

**These are Phase 1 audit-time snapshots.** Final post-transformation numbers
are in §7 and `HANDOFF.md`; do not read later counts as regressions.

| Area | Current | Prior audit |
|---|---:|---:|
| `src/` TS/TSX files / LOC | 407 / 88,185 | 400 / ~88,000 |
| Rust files / LOC | 16 / 4,822 | ~23 / ~6,600 |
| Frontend tests | **64 files / 273 tests** (all pass) | 57 / 241 |
| Rust `#[test]` | **22** (4 modules) | 13 (3 modules) |
| `npm run lint` | 0 errors, **32 warnings** | 95 warnings |
| Cyclomatic >15 / cognitive >15 | **0 / 0** (both ESLint errors) | 0 / warn-first |
| Complexity >10 / >12 / >14 | 144 / 60 / 21 | 156 / 72 / — |
| `check:boundaries --strict` | **0 warnings** | 27 |
| Import cycles | **0** | 1 (`db/index.ts` self-import) |
| Functions >60 lines / depth >3 | 318 / 15 | 317 / 34 |
| Explicit `any` type sites | 4 (was 24) | 24 |
| One-line `catch { console.error }` | 151 | 151 |
| Feature `.tsx` files / calling `getDb()` | 179 / 150 | 180 / 151 |
| Tracked files passing `audit:oss` | 593 | — |

`npm run verify` is green: typecheck, lint (0 errors), 273 tests, build,
OSS audit, strict boundaries. Rust `cargo test --lib`, `cargo fmt --check`
and the Clippy gate also pass. **No P0 build or correctness blockers remain.**

### Structure and boundaries

- All five AGENTS.md boundary rules are enforced by
  `scripts/check-boundaries.mjs:36-63` and clean in `--strict` mode. No UI
  file imports `@tauri-apps/*` directly; no component imports from `screens/`;
  only `src/store/index.ts` calls zustand `create()`.
- Duplicate basenames (`index.ts` ×8, `shared.tsx` ×3) are intentional;
  the checker only flags same-folder collisions.
- The one self-import is gone: `getSchemaVersionFromDb` (`src/db/index.ts:1636`)
  calls local `getDb()` (`src/db/index.ts:593`).
- A feature-component registry exists (`src/components/features/registry.ts`,
  consumed by `Dashboard.tsx:25` and `FeatureSettings.tsx:3`), but only
  `BuildLog.tsx:16` actually renders through `RecordTracker`.

---

## 2. Done vs open backlog (from the previous AUDIT_REPORT.md)

| # | Prior backlog item | Status | Evidence |
|---|---|---|---|
| 1 | Remove `db/index.ts` self-import | **DONE** | `src/db/index.ts:1636` |
| 2 | Fix stale docs | **DONE**, minor drift left | `docs/ARCHITECTURE.md:97-99`; `HANDOFF.md:28` |
| 3 | Characterization tests: store CRUD + Rust modules | **PARTIAL** | client-only CRUD; Rust 13→22; `archetypes.rs` 0 |
| 4 | Replace five `setTimeout(..., 350)` | **DONE** | `src/lib/commands.ts:33,49`; zero 350 ms timers |
| 5 | Remove unused imports / `OrbitField` from `App.tsx` | **DONE** | 32 warnings remain elsewhere |
| 6 | Lintable boundary rules | **DONE** | 0 warnings; wired into `verify` |
| 7 | Cognitive complexity + size budgets | **DONE** | errors at 15; 0 offenders |
| 8 | Group store actions into factories | **OPEN** | `src/store/index.ts:155-1822` single closure |
| 9 | Split `runMigrations` | **OPEN** | `src/db/index.ts:609-1631` (~1023 lines) |
| 10 | Migrate one tracker to `RecordTracker` | **DONE** | `BuildLog.tsx` |
| 11 | Type `any`s / normalize catches | **PARTIAL** | 24→4 `any`; 151 catches remain |
| 12 | Exporter/parser/polling tests | **PARTIAL** | parsers + polling covered; PDF/DOCX not |
| 13 | Quarterly hotspot review | **OPEN** | this report is the first |
| 14 | CI caching / timeouts (PR #30) | **DONE** | verified merged 2026-11-25 |
| 15 | Secret scan of history | **DONE** | no live hits in tracked files or commits |

---

## 3. Open-source / legal / security findings

### P0

1. **Contradictory vulnerability disclosure channel.**
   `docs/SECURITY.md:58` tells reporters to open a **public issue**, while
   root `SECURITY.md:9-12`, `CONTRIBUTING.md:102`,
   `CODE_OF_CONDUCT.md:39` and `.github/ISSUE_TEMPLATE/config.yml` require
   private GitHub security advisories. A reader could publicly disclose an
   unpatched vulnerability. Fix the line, then enable private vulnerability
   reporting in repository settings.

### P1

2. **Third-party license obligations are not discharged.** No NOTICE or
   third-party license bundle exists. `package.json:64` pins SheetJS `xlsx`
   0.20.3 (Apache-2.0) from `cdn.sheetjs.com`; `package-lock.json` records
   28 Apache-2.0, 13 dual MIT-or-Apache, 13 MPL-2.0, 2 LGPL-3.0-only and
   1 CC-BY-4.0 entries (all strong/weak copyleft are dev-only; the only
   production dual-license is `jszip` MIT OR GPL-3.0-or-later, so no
   copyleft contaminates the shipped binary). `src/fonts.css:1-3` declares
   nine SIL OFL 1.1 families, but `public/fonts/` holds 27 `.woff2` files
   with no OFL text or per-family copyright notices. Generate
   `THIRD_PARTY_NOTICES.md` (`license-checker` + `cargo-about`), ship the OFL
   notices, include them in Tauri bundle resources, and add a CI drift check.

3. **The xlsx integrity gate has a dead control.**
   `.github/security/check-xlsx-pin.mjs:21-22` defines `EXPECTED` but never
   compares it; `:49-50` compares only the recorded file to the lockfile.
   `security.yml:134-140` claims a hash is duplicated "in package.json (via
   the overrides-adjacent comment convention)" — no such comment exists and
   the script enforces none. The "two independent places" claim is false; a
   single-commit edit of `package-lock.json` + `xlsx-integrity.txt` passes.

4. **`verify`-only gates are not enforced in CI.** `package.json:26` adds
   `audit:oss` and `check:boundaries --strict` to `verify`, but no workflow
   runs either; `.github/PULL_REQUEST_TEMPLATE.md:18` relies on
   self-attestation. Secret scanning exists only as a local pre-commit hook
   (`.git/config` hooksPath). Complexity is likewise a local-only gate.
   Add these to CI so PRs cannot bypass them.

### P2

5. Legacy licensing fields (`license_key`, `licensed_at`, `license_tier`,
   `license_expires_at`, `trial_started_at`, …) survive in
   `src-tauri/src/commands/finance.rs:53-54,66-70,186,246-252`,
   `src-tauri/src/db.rs:166-180,517-521`, `src/db/schema.ts:8-9,31-35` and
   `src/types/index.ts:143-144,158-161`, while `CHANGELOG.md:11` claims all
   gating infrastructure was removed. **RESOLVED 2026-11-25:** compatibility-only
   decision recorded in `STANDARDS.md` and `docs/ARCHITECTURE.md`; columns
   intentionally retained because dropping them would break existing databases.
6. `scripts/audit-oss.mjs:13-23,45` is a regex, not a license or secret
   scanner, and misses legacy licensing identifiers; it excludes `.md` from
   proprietary-string checks.
7. Copyright mismatch: `LICENSE.md:3` says "Juan Diego Cua and Lance
   contributors"; `src-tauri/tauri.conf.json:36` says "Copyright © 2026
   Lance. All rights reserved."
8. Personal Gmail addresses in public commit metadata; `TRANSFORMATION_LOG.md`
   referenced a stale branch (now removed). Use GitHub noreply addresses going forward.

**Explicitly clean:** SPDX is consistent for first-party code; no live
credential, private key, private URL or active breach was found in tracked
files or all public commits; fixture emails are `example.com`.

---

## 4. Code quality findings

**No P0.** The god modules are a maintainability risk, not a defect.

### P1

1. **God modules remain.** `src/store/index.ts:155` opens a single
   `create<UnifiedStore>` closure to line 1822 (~1667 lines);
   `src/db/index.ts:609-1631` is one ~1023-line `runMigrations`;
   `src/App.tsx:339` is an 854-line component. Fifteen functions still nest
   to depth 4. Behavior-preserving first moves: group store actions into
   factories imported by the one `create()`; convert migrations to an
   ordered array of per-version functions; move shell effects into hooks.
   Characterization tests first.
2. **Rust threshold/config conflict.** `src-tauri/Clippy.toml:4` (operative)
   sets cognitive 20, but the stale **root** `Clippy.toml:3` sets 30 and
   neither sets `too-many-lines`. `STANDARDS.md:14` and `AGENTS.md:98`
   require ≤20. Upstream now marks Clippy's `cognitive_complexity` as a
   *restriction* lint that should not be used as a measurement tool; prefer
   `excessive_nesting` + `too_many_lines`, delete the root duplicate, and
   make docs/CI agree.
3. **`src/features/` does not exist.** `AGENTS.md:113` and
   `STANDARDS.md:45-47` mandate new code in `src/features/<domain>/`, but all
   179 trackers live in `src/components/features/`. Either create the
   directory for genuinely new domains or amend the rule to the existing
   path. Keep `RecordTracker` mandatory for new entity screens.
4. **Clear the 32 lint warnings:** 17 unused declarations (e.g. `ICON_MAP`,
   `showArchetype`, `pendingFollowUps`), 7 hook-dependency warnings
   (`Sidebar.tsx:596,633,636`, `Dashboard.tsx:119,250`, `FollowUps.tsx:172`,
   `demo/assetStore.ts:257`), 8 fast-refresh warnings. Cheap, low-risk, and
   removes real dead code. Four `any` sites remain (`src/router.tsx:36`,
   `src/export/index.ts:17,30,42`) despite the log claiming all 24 removed.
5. **Thin test coverage.** ~12 of 38 screens are referenced by a test;
   `screenSmoke.test.tsx` asserts one text node per screen;
   `KanbanBoard.test.tsx` asserts only "Kanban Board";
   `storeCrud.test.ts` covers client create/update/delete only (2 cases).
   `export/pdf.tsx` (10.5k) and `export/docx.ts` (19k) have no direct tests;
   `src/import/parsers/image.ts` has none. 13 of 17 Rust command modules
   have zero tests (notably the 821-line `commands/archetypes.rs`). No
   Playwright specs despite `playwright.config.ts`.

### P2

6. Normalize the 151 `catch { console.error }` blocks into a typed error
   helper; replace the 4 `any` sites.
7. Reduce 144 functions above complexity 10 and 318 over 60 lines
   opportunistically — never extract solely to satisfy a metric.
8. Replace generic identifiers (`item` 917, `data` 567, `info` 165) in
   touched code only.

---

## 5. Contributor experience findings

**P0** — the disclosure contradiction above (§3.1) is the single most
consequential doc defect.

### P1

1. **README front-door claim is false.** `README.md:15` says profession
   trackers are "registered in a single registry and rendered by one generic
   component." A registry does exist, but only `BuildLog` uses
   `RecordTracker`; ~180 trackers are hand-rolled.
2. **Broken command:** `docs/DEVELOPMENT.md:13` says `cd lance` (lowercase);
   cloning creates `Lance`, so this fails on case-sensitive filesystems.
3. **`verify` is under-documented:** `CONTRIBUTING.md:45`,
   `AGENTS.md:130/133`, `docs/DEVELOPMENT.md:27`, `docs/AGENT_GUIDE.md:37`,
   `copilot-instructions.md:14` and `RESEARCH_REPORT.md:393` omit the strict
   boundary gate. `CONTRIBUTING.md:48` claims CI runs the same checks, which
   is false (see §3.4).
4. **`doctor` over-promises:** `CONTRIBUTING.md:20` says it tells you
   "exactly what is missing", but `scripts/doctor.mjs` checks only Node, npm,
   rustc, cargo, `node_modules/` and the Tauri CLI — not the WebKit/GTK
   system libraries.
5. **`HANDOFF.md:28`** reports 244 tests; actual is 273 / 64 files.

### P2

6. Missing `SUPPORT.md` and `GOVERNANCE.md`; CoC
   (`CODE_OF_CONDUCT.md:39`) routes conduct complaints to the *security
   advisory* form and omits Covenant 2.1 enforcement tiers; README has no
   CI badge or screenshot.
7. `STANDARDS.md:12` recommends `npm run complexity 10`; the correct syntax
   is `npm run complexity -- 10`.
8. Count drift: `CHANGELOG.md:17` said 41 professions vs 6 in
   `Onboarding.tsx:43-48` (fixed in this transformation); tracker counts
   180+/177/~187 across four files. Re-check of `docs/ARCHITECTURE.md:32,54`
   found its 39 UI components and 16 command modules are accurate — the
   audit's "~36 / 15+mod.rs" claim was itself imprecise.
9. `docs/ARCHITECTURE.md` schema table lists `follow_up_settings` and
   `portal_activity` (no `CREATE TABLE`) and omits `kanban_boards`,
   `kanban_columns`, `kanban_cards`, `project_template_milestones`.
10. `CHANGELOG.md:14,19` uses `## [0.9.9] — 2026-10` instead of Keep a
    Changelog `YYYY-MM-DD` with comparison links, and omits the shipped
    `0.9.9-5` prerelease.

---

## 6. Prioritized remediation roadmap

**P0 — do first (safe, small, high value)**

1. Fix `docs/SECURITY.md:58` to private advisories; enable private
   vulnerability reporting; add a CoC-specific contact and enforcement tiers.
2. Fix the false README architecture claim, `cd lance` → `cd Lance`, and
   stale `HANDOFF.md` test counts.
3. Make the xlsx gate honest (remove `EXPECTED` or actually compare it;
   correct `security.yml:134-140`).

**P1 — structured cleanup**

4. Generate `THIRD_PARTY_NOTICES.md`, ship OFL notices, add a CI drift check.
5. Move `audit:oss`, strict boundaries and complexity into CI; add gitleaks
   and a license checker; document what `doctor` does and does not check.
6. Resolve the Clippy conflict: delete/align the root `Clippy.toml`, replace
   `cognitive_complexity` with `excessive_nesting` + `too_many_lines`, fix
   the `npm run complexity -- 10` syntax.
7. Decide the `src/features/` rule; keep `RecordTracker` mandatory for new
   entity screens.
8. Clear the 32 lint warnings; add characterization tests for
   `archetypes.rs`, PDF/DOCX exporters, `image.ts` parser, and strengthen the
   thin smoke tests.
9. Split `runMigrations` into per-version functions — the most isolated
   god-module move.

**P2 — continuous**

10. Group store actions into factories; move App shell effects into hooks.
11. Normalize catches and remaining `any` sites; reconcile all drifted
    counts from a canonical source; migrate the CHANGELOG format; add
    SUPPORT.md and a light BDFL GOVERNANCE.md.

Record every change in `TRANSFORMATION_LOG.md`; keep `AGENTS.md`,
`STANDARDS.md` and `docs/ARCHITECTURE.md` in sync.

---

## 7. Post-transformation measurements (end of Phase 4)

The P0/P1 items above were addressed during Phase 3. Final state:

| Metric | At audit | At handoff |
|---|---:|---:|
| Frontend tests | 273 / 64 files | **309 / 69 files** (+ 42 Playwright E2E, all passing) |
| Rust tests | 22 | **38** |
| Lint warnings | 32 | **7** (fast-refresh DX only, documented concession) |
| Complexity offenders | 0 | **0** (strict CI gate) |
| Boundary warnings | 0 | **0** (CI gate) |
| `audit:oss` in CI | no | **yes** |
| Secret scanner / license checker in CI | no | **yes** (gitleaks + `check:licenses`) |
| Hand-rolled trackers | ~177 | ~144 (6 migrated) |
| `run_migrations` size | ~563 lines | 26-line runner, 13 SQL stages |
| `App.tsx` size | ~1,192 lines | 751 lines (4 hooks extracted) |

A fresh clone (`git clone` + `npm ci` + `npm run verify`) and a copy of the
final working tree both pass end to end. See `HANDOFF.md` for the complete
release checklist and remaining debt.

---

## 8. Iteration 2 audit (2026-11-26) — new gaps

Three parallel audits re-checked only the new items from `RESEARCH_REPORT.md` §9.
No new live secret or P0 legal defect was found.

### P0 — code quality

1. **The Rust nesting gate cannot fire.** `excessive-nesting-threshold = 0`
   makes Clippy's lint return immediately (verified empirically at 0 vs 3).
2. **`src-tauri/Clippy.toml` is never read on Linux CI.** Clippy only looks for
   `.clippy.toml` / `clippy.toml` (lowercase); proven on a case-sensitive
   volume. Harmless today only because all configured values equal defaults.
   Renaming is a prerequisite for any threshold change. At threshold 3 there
   are 3 offenders, all in `src/server.rs` (279, 281, 894).

### P1

3. `CONTRIBUTING.md:53-55` claims CI does **not** run three gates it actually
   runs. Also `npm install` vs CI's `npm ci` drift in all quickstarts.
4. ADRs promised by `GOVERNANCE.md` and Tier 3 are absent.
5. Network disclosure is broadly right but omits endpoints, timing, data sent
   and opt-out status (release notes, silent updater, loopback portal).
6. `CONTRIBUTING.md:3` has no inbound MIT contribution statement; no SPDX
   header exists in any first-party source file.
7. No clone, dead-code or cycle detection; no CI job runs the 65 E2E tests;
   `playwright.config.ts` has no CI retries.
8. GitHub Secret Protection, push protection and validity checks remain
   disabled. Discussions and private vulnerability reporting are already
   enabled (verified). Dependabot alerts/security updates unverified.

### P2

9. `src/store/toastStore.ts` / `updaterStore.ts` are typed accessors over the
   single store (31 importer files), not second stores; document, do not rename.
   The unused `toastStore` object has zero importers and can be deleted.
10. Eight `index.ts` and three `shared.tsx` basenames need a path map, not renames.
11. Stale `UpdaterModal` comment claims no caller exists; `useAutoUpdater` does.
12. Signed git commits are already satisfied (20/20 recent commits verified);
    research §9.1 rationale should say "already satisfied", not "skip".

### Implementation order

Fix the Rust gate (rename + threshold + 3 local refactors), enable GitHub
security settings, add the privacy/disclosure/docs fixes and ADRs, add narrow
zero-dependency structural ratchets and CI-only E2E retries, then re-verify.

**Status:** implemented in iteration 2. See `HANDOFF.md` "Iteration 2 refresh"
and `TRANSFORMATION_LOG.md` for exact changes and final verification. Validity
checks remain off (Advanced Security-gated); the `e2e` job is not a required
check (branch protection intentionally unchanged).

---

## 9. Iteration 3 audit (2026-11-26)

Three audits checked only what remained after iteration 2. No new secret,
license defect, or exploit path was found; risk is LOW–MODERATE.

### P0

1. **All 26 pinned `actions/checkout@v4` / `setup-node@v4` lines declare
   `node20`**, which GitHub removed from hosted runners on 2026-09-23.
   Verified replacements: checkout `d23441a48e516b6c34aea4fa41551a30e30af803`
   (v6.1.0) and setup-node `949feb2413d6458794dcd2491c4babbbce0c15c1`
   (v7.1.0), both `node24`. Keep `node-version: 22` inputs.

### P1

2. **Persisted privacy preference:** one default-on `networkChecksEnabled`
   preference in the meta slice, gating only `fetchReleaseEntries()` and
   `doCheck()`; leave caches, fallbacks, timers, `navigator.onLine`, the 24h
   "Later" deferral and rollback high-water mark untouched. Add a Settings
   switch and update the network-disclosure docs.
3. **Stale v2 cloud roadmap** in `docs/SECURITY.md:40-47` contradicts the
   project's non-goals; delete it and relabel the surrounding headings while
   keeping real `user_id`/`app_events`/CSP facts.
4. **Hand-rolled CRUD ratchet:** 141 current offenders (135 DB-based + 6
   store-based) among 179 feature components. Extend `check-boundaries.mjs`
   with `--trackers` + a committed 141-path baseline; fail only on new files.
5. **Golden DB-schema test** in the existing in-memory migration test,
   snapshotting `sqlite_master` + key `PRAGMA table_info` into
   `src-tauri/tests/schema_golden.txt`.

### P2

6. Six `fast-check` properties over pure `forecast.ts`/`currency.ts` math;
   `metrics.ts` is DB-bound and excluded. No score gate.
7. AI-assistance disclosure convention (`Assisted-by:`) in CONTRIBUTING and a
   PR checkbox — convention only, no CI gate.
8. Definition of Done missing from AGENTS.md §7; PR template lacks
   complexity/Rust/format/evidence checkboxes.
9. Contributor docs wrongly say E2E is not in CI and require a manual preview;
   stale HANDOFF anchor; five conflicting tracker counts.
10. Make the jscpd/knip/Stryker skip explicit in `STANDARDS.md`.

### Implementation order

Bump action pins, add the privacy toggle + docs, add the tracker ratchet and
schema golden test, add property tests, then apply the contributor/agent doc
fixes and re-verify all gates.

**Status:** implemented in iteration 3. See `HANDOFF.md` "Iteration 3 refresh"
and `TRANSFORMATION_LOG.md`. Validity checks, SBOM, FUNDING, provenance,
jscpd/knip/Stryker, generated indexes and ADR code links remain explicit skips.

### Iteration 4 follow-up

- The critical `zip` waiver's revisit condition was met: stable
  `tauri-plugin-updater` 2.14.1 requires `zip ^9`. Bumped (zip 9.8.2) and
  deleted the waiver.
- React Router already resolves patched 6.30.6; the two remaining moderate
  advisories are unreachable in this declarative SPA — **no v7 migration**.
- Added `format:check` and `typecheck:e2e` to `verify`/CI, fixed the tracker
  ratchet's `*.test.*` false positive (141 → 140), hardened the golden-schema
  path, and removed the surviving v2 roadmap from `docs/ARCHITECTURE.md`.
- Dependabot config and a required `e2e` check remain intentional skips
  (redundant with `deps.yml`; required checks need a branch-protection admin).
