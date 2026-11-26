# Handoff

Snapshot: 2026-11-25. All four transformation phases and the subsequent debt
closeout are complete. No business behavior changed.

## What changed

1. **Research** (`RESEARCH_REPORT.md`) — completed open-source readiness
   (keep MIT, no CLA/dual licensing, rotate-first secrets, dependency licenses,
   community files, governance) and corrected stale tooling/citation claims.
2. **Audit** (`AUDIT_REPORT.md`) — rewritten with current measurements, a
   done-vs-open backlog and a P0/P1/P2 roadmap, plus a final post-transformation
   measurement table.
3. **Standards** (`STANDARDS.md`, `AGENTS.md`) — commands and thresholds match
   the actual tooling; the dead `src/features/<domain>/` rule was retired;
   verify/CI descriptions are accurate; remaining DX warnings and legacy
   license columns are documented as explicit concessions.
4. **Community files** — `SUPPORT.md`, BDFL `GOVERNANCE.md`, Contributor
   Covenant enforcement tiers, private-disclosure fix, Keep-a-Changelog format,
   README corrections and CI badge. **Private vulnerability reporting was
   enabled on the GitHub repository** (verified `enabled: true`).
5. **Legal/hygiene** — `THIRD_PARTY_NOTICES.md` generated from the lockfile,
   bundled SIL OFL 1.1 font notices, aligned Tauri copyright, honest xlsx pin
   gate, gitleaks CI job with pinned action SHA and a narrow false-positive
   allowlist, and a `check:licenses` gate for npm + Cargo.
6. **Code quality** — Rust `runMigrations` split into 13 ordered SQL stages
   with a characterization test; store actions grouped into factories while
   preserving the single `create()`; App shell effects moved into four hooks
   (App.tsx 1,192 → 751 lines); 25 lint warnings cleared; Prettier drift fixed.
7. **Tests** — 303 frontend tests / 68 files, 38 Rust tests. Added coverage for
   exporters, image parser, archetype payloads, 20 screens, Kanban behavior,
   store CRUD across four entities, and two more Rust command modules.
8. **Trackers** — legacy archetype trackers are enumerated in
   `src/components/features/registry.ts`; some use `RecordTracker`, the rest
   have custom UI. A ratchet now blocks new hand-rolled CRUD (141-file baseline).
9. **CI** — `audit:oss`, `check:licenses`, strict complexity and strict
   boundaries all run in CI; Rust gate migrated off the misleading
   `cognitive_complexity` lint; stale root `Clippy.toml` deleted.
10. **Log** — `REFACTORING_LOG.md` → `TRANSFORMATION_LOG.md`, extended with
    every phase and the debt closeout.

## Verification (all green at handoff)

| Check | Result |
|---|---|
| `npm run verify` | typecheck, lint (0 errors), **321 tests / 72 files**, build, OSS audit (635 files), license policy, strict boundaries — pass |
| `npx playwright test` | **65 passed / 0 failed** against the built preview (Chromium) |
| `npm run check:trackers` | 0 new hand-rolled trackers (141 baselined) |
| `cargo test --lib` | **39 tests**, 0 failed |
| `npm run complexity -- --strict` | 0 functions above cyclomatic/cognitive 15 |
| `npm run check:boundaries -- --strict` | 0 warnings |
| `npm run format:check` | clean |
| `cargo test --lib` + fmt + Clippy | **39 tests**, 0 failed; clean |
| `cargo fmt --check` + Clippy quality gate | clean |
| gitleaks full history | configured in CI with pinned SHA and false-positive allowlist; local scan found 0 findings after allowlisting |
| GitHub private vulnerability reporting | enabled (`true`) |

## Playwright QA (post-refactor)

A full browser pass was added under `e2e/` (18 specs, 65 tests) and run against
the built preview. It covers cold load, first-run onboarding, 16 routes,
client/project CRUD with reload persistence, command palette/search, settings
persistence, all four dialogs, Pipeline/Follow-ups, migrated trackers, network
privacy, axe checks on three screens, plus edge cases: empty states, delete
guards, corrupt localStorage, long/negative inputs, stacked-dialog Escape and
focus return, backup export→reset→import, share-link fallback and all 7 themes.
Final result: **65 passed / 0 failed**.

Edge-case findings fixed: resuming a stored onboarding step, topmost-dialog
Escape handling, focus return to the dialog trigger, and a serious color-contrast
violation on `/settings`.

Two issues surfaced and were resolved:

- **First-run onboarding blocker:** a profile-save effect reset the wizard to
  step 1, and the finish buttons required a name input that was never rendered.
  Fixed with a one-time hydration guard, an optional name field, and closing the
  modal on finish. Verified in 3/3 fresh browser contexts.
- **Disabled archetype surface:** the six migrated trackers and `KanbanBoard`
  have no route because `ArchetypeFeatureTabs` intentionally renders nothing.
  Kept that design decision; the trackers are now verified by six component
  tests in `src/test/recordTrackerMigration.test.tsx`, and the E2E spec asserts
  the disabled surface does not leak half-rendered panels.

Release-note API calls are mocked in E2E so GitHub rate limiting (HTTP 403)
does not create false console errors. Evidence and screenshots are in the QA
report and `qa-shots/`.

All work is committed on `test/rust-commands` and pushed to `origin`; the
release itself has not been tagged or published.

## Iteration 2 refresh (2026-11-26)

A second full mission pass found and fixed remaining gaps:

- **Rust gate repaired:** `src-tauri/Clippy.toml` → `clippy.toml` (Linux CI
  only reads lowercase) and `excessive-nesting-threshold` 0 → 3. The gate was
  provably a no-op before. Three offenders in `server.rs` fixed with a
  `rate_label` helper and one narrow, documented `#[allow]`.
- **GitHub hardening:** secret scanning, push protection and Dependabot
  security updates **enabled** via API. Validity checks could not be enabled
  (Advanced Security-gated field); Discussions and private vulnerability
  reporting were already enabled. gitleaks CI remains defence in depth.
- **Standards honesty:** STANDARDS/AGENTS now separate CI gates (nesting 3,
  100 lines, 7 args, 250 type complexity) from review targets (60 lines, 4
  params, cognitive 20). `toastStore.ts`/`updaterStore.ts` are documented as
  accessors over the single store; the unused `toastStore` object was deleted.
- **Three ADRs** added under `docs/adr/` (single store, typed command registry,
  MIT/keep-history), with index and PR-template checkbox.
- **Docs:** inbound MIT contribution statement + gradual SPDX note; full
  network/privacy disclosure; `npm ci` quickstarts; corrected CI-gate and
  architecture text; Playwright E2E instructions; Dependabot vs `deps.yml`.
- **CI:** CI-only duplicate-function advisory and import-cycle baseline (one
  known cycle: `store/index.ts ↔ slices/meta.ts`), a new `e2e` job with
  CI-only retries and automatic preview `webServer`, and a note that the job
  is **not** yet a required check (branch protection unchanged).
- **Source hygiene:** removed stale UpdaterModal comment.

Final iteration-2 gates: `npm run verify` (309 tests), strict complexity and
boundaries, format check, 38 Rust tests + fmt + Clippy (with the live nesting
gate), and `npx playwright test` (65 tests, auto-started preview) all pass.

## Iteration 3 refresh (2026-11-26)

A third full mission pass closed the remaining gaps:

- **CI runtime:** all 26 pinned `actions/checkout`/`setup-node` lines moved from
  node20 v4 SHAs to node24 v6.1.0/v7.1.0 SHAs (GitHub removed node20 from
  hosted runners). Workflow job names and `node-version: 22` unchanged.
- **Privacy:** a persisted default-on `networkChecksEnabled` preference in the
  meta slice gates only the release-notes GET and updater check, with a
  "Release and update checks" switch in Settings → General. Caches, offline
  fallback, timers, the 24h "Later" deferral and rollback protection are
  untouched. Six behavior tests cover the toggle.
- **Structural ratchet:** `npm run check:trackers` (CI step) blocks any *new*
  hand-rolled CRUD component outside `RecordTracker`; 141 legacy files are
  baselined in `scripts/tracker-baseline.json`.
- **Tests:** golden DB-schema fixture (`src-tauri/tests/schema_golden.txt`,
  `UPDATE_GOLDEN=1` regeneration) plus six fast-check properties over pure
  forecast/currency math. Rust 38 → 39 tests; frontend 309 → 321.
- **Docs/agent clarity:** removed the stale v2 cloud roadmap, documented the
  privacy toggle, added `Assisted-by:` disclosure convention, fixed E2E/CI
  claims and the broken HANDOFF anchor, added the Definition of Done to
  AGENTS.md and evidence checkboxes to the PR template, and replaced drifting
  tracker counts with a pointer to `registry.ts`.
- **Skipped with rationale:** GitHub validity checks (org/Advanced-Security
  gated; repo is a personal public repo), SBOM/FUNDING/provenance, jscpd/knip/
  Stryker/MI, generated component index, code-level ADR links.

Final iteration-3 gates: verify (321 tests), strict complexity/boundaries/
trackers, format, 39 Rust tests + fmt + Clippy with the live nesting gate, and
65 Playwright tests all pass. One flaky axe contrast check caused by measuring
during an entrance animation was fixed by waiting for reduced-motion settle
in the E2E spec — not a product defect.

## Pre-OSS tagged history — owner decision

The current tree is MIT-clean, but **16 old tags** (`v0.9.0`–`v0.9.9-5`,
`v1.1.0`–`v1.2.6`) still point at the pre-OSS commercial lineage. Those tagged
commits contain the deleted `landing/`, `promo/` and `license-worker/` trees:
published paywall prices, Paddle license fulfillment (HMAC/webhook secret
*references*, no values), three account-linked price IDs, a Cloudflare KV ID,
owner-identifying `*.cuajuandiego.workers.dev` subdomains and the promo launch
playbook. A full scan found **no live credentials**, so no rotation is needed.

This is a discoverability/privacy decision, not a security compromise.
**Decision (owner, 2026-11-25): keep everything.** No live secret was found, so
there is nothing to rotate or scrub; the project's paid past stays public and
the tags/history are untouched. A full history rewrite is explicitly rejected:
it would break SHAs, tags, forks and CI pins without purging cached blobs. It
would only be reconsidered if a real secret were discovered (rotate first).

## Remaining items (deliberate decisions or external actions)

| Item | Status / plan |
|---|---|
| Legacy hand-rolled trackers (see `src/components/features/registry.ts`) | Intentional: each has custom UI/validation; migrate on demand. `RecordTracker` is mandatory for new entity screens; a ratchet blocks new offenders. |
| 7 fast-refresh DX warnings | Intentional concession: DX-only, every export has a consumer, splitting would worsen boundaries. Documented in `STANDARDS.md`. |
| `zip` RUSTSEC-2026-0548 (critical, Windows-only) | Waived in `.github/security/cargo-audit-allow.json` with `fixBlockedBy`: `tauri-plugin-updater` 2.13.1 pins `zip ^4`; patched 9.0.5 is a major bump. Not compiled on macOS/Linux, no untrusted ZIP extraction, signed update bundles. Revisit when a stable updater release accepts zip ≥ 9.0.5. |
| React Router moderate advisories (prod) | Fix requires a major upgrade to v7.18.7; deferred as a human-reviewed migration, not a silent dependency bump. `npm audit --omit=dev --audit-level=high` still passes. |
| Vite chunk-size warnings (`pdf`, `import`) | Informational; dynamic imports already in place. Further splitting is behavior-riskier than the warning warrants. |
| Negative invoice qty/rate | QA nit: values are coerced to 0 and a clear "total looks off" validation appears on submit; data integrity is preserved. Left as-is rather than changing form behavior at release time. |
| Cloudflare Workers Builds check | External GitHub App still posts failures; disable in the Cloudflare dashboard (not a required check). |
| GitHub Organization + backup admin | Human decision (needs a named collaborator); see `GOVERNANCE.md`. |
| Code of Conduct reporting channel | Advisory form works, but confirm the account is monitored; ideally add a dedicated conduct mailbox. |
| Commit + tag + publish release | Human action — see checklist below. |

## Release checklist (human actions)

1. Review the staged diff and commit it in logical chunks using the PR
   template; record each commit in `TRANSFORMATION_LOG.md`.
2. Re-run `npm run verify`, `npm run complexity -- --strict`,
   `cargo test --lib`, `cargo fmt --check` and the Clippy gate on merged `main`.
3. Confirm advisory/CoC notifications reach a monitored account (a test report
   is the only reliable way to verify this).
4. Verify built installers contain `THIRD_PARTY_NOTICES.md` and
   `public/fonts/OFL.txt` (both are in `tauri.conf.json` bundle resources).
5. Tag a SemVer release, add its date to `CHANGELOG.md`, and publish signed
   updater artifacts. Keep comparison links current.
6. Optionally move the repo into a GitHub Organization with a backup admin.

## Ongoing maintenance

- Read `AGENTS.md` then `STANDARDS.md` before changing code; use
  `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` to find the domain.
- New feature code goes in `src/components/features/` with colocated tests;
  new entity screens use `RecordTracker`; app-wide actions go through
  `src/lib/commands.ts`.
- Add a behavior/characterization test before refactoring legacy logic; keep
  the single Zustand store and typed Tauri seam.
- Run `npm run verify` plus Rust gates when Rust is touched; optionally
  `npm run complexity -- --strict`. Quarterly: review hotspots, the tracker
  backlog, the gitleaks allowlist and instruction-file staleness.
- Update docs in the same PR as a convention change.

## Non-goals (do not reintroduce)

- Accounts, cloud sync, network telemetry, license keys or paywalls.
- New UI frameworks, state libraries, DI frameworks, or class hierarchies for
  SOLID's sake.
- SaaS analysis services; the repository stays low-dependency and
  self-contained.
- Bulk directory rewrites; migrate incrementally when a file is already touched.
- History rewriting without explicitly flagging it to all collaborators —
  rotation always comes first.
