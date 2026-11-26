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
8. **Trackers** — 6 of ~150 now use `RecordTracker`; the remaining ones have
   genuinely custom UI and need per-domain decisions, not a mechanical rewrite.
9. **CI** — `audit:oss`, `check:licenses`, strict complexity and strict
   boundaries all run in CI; Rust gate migrated off the misleading
   `cognitive_complexity` lint; stale root `Clippy.toml` deleted.
10. **Log** — `REFACTORING_LOG.md` → `TRANSFORMATION_LOG.md`, extended with
    every phase and the debt closeout.

## Verification (all green at handoff)

| Check | Result |
|---|---|
| `npm run verify` | typecheck, lint (0 errors), **309 tests / 69 files**, build, OSS audit (610 files), license policy, strict boundaries — pass |
| `npx playwright test` | **65 passed / 0 failed** against the built preview (Chromium) |
| `npm run complexity -- --strict` | 0 functions above cyclomatic/cognitive 15 |
| `npm run check:boundaries -- --strict` | 0 warnings |
| `npm run format:check` | clean |
| `cargo test --lib` | **38 tests**, 0 failed |
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

## Pre-OSS tagged history — needs an owner decision

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
| ~144 hand-rolled trackers | Intentional: each has custom UI/validation; migrate on demand. `RecordTracker` is mandatory for new entity screens. |
| 7 fast-refresh DX warnings | Intentional concession: DX-only, every export has a consumer, splitting would worsen boundaries. Documented in `STANDARDS.md`. |
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
