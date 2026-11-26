# Transformation Log

Behavior-preserving changes made during the open-source readiness and code
quality transformation. Each entry records what changed, why, and which
standard it satisfies. Earlier entries were recorded as `REFACTORING_LOG.md`.

## 2026-11-25 — CI caching and job bounds (PR #30)

- Added pinned `Swatinem/rust-cache` to CI, security, dependency and release
  jobs. **Why:** Rust toolchain/dependency compilation was repeated in five
  places. **Standards:** fast verification loops, low-dependency tooling.
- Added `concurrency` cancellation and `timeout-minutes` to workflows; removed
  unnecessary apt installs from audit jobs; scoped scheduled-release write
  permission. **Why:** avoid redundant runs and 360-minute runaways.

## 2026-11-25 — Phase 0 and Phase 1 reports (PRs #29, #31)

- `RESEARCH_REPORT.md` and `AUDIT_REPORT.md`. **Why:** evidence before action.
- **Standards:** research before action; documented audit trail.

## 2026-11-25 — Standards and enforced lints (PR #32)

- `STANDARDS.md`; tightened `AGENTS.md` to 165 lines with boundary rules and
  definition of done. **Why:** make expectations explicit for humans/agents.
- Cognitive complexity as warn-first ESLint rule; `npm run complexity` reports
  both kinds. **Why:** warn first, then error after backlog burns down.
- Rust Clippy config repaired; three quality lints enforced with `-D`; `cargo
  fmt --check` in CI; Rust sources formatted; one type-complexity alias.
  **Why:** deterministic enforcement without new services.
- Corrected stale docs (archetype fiction, Node 20→22, profession counts).
  **Why:** stale agent instructions are bugs.

## 2026-11-25 — Phase 3 P0 fixes (branch `refactor/phase3-p0`)

- Removed the `src/db/index.ts` self-import: `getSchemaVersionFromDb` now calls
  the local `getDb()` directly. **Why:** eliminate the only import cycle.
  **Standard:** no self-import; stable → volatile dependency direction.
- Replaced five `setTimeout(..., 350)` deep-link dispatches with
  `commands.dispatchAfterMount`, which delivers a queued command when its
  owning screen registers a handler. **Why:** AGENTS §4 forbids wait-and-hope
  timing. **Standard:** deterministic behavior; no timing races.
- Removed unused imports and the unused `OrbitField` component from
  `src/App.tsx`. **Why:** surplus code; lint warnings dropped from 95 to 74.
  **Standard:** delete surplus, keep the shell thin.
- Added characterization tests for command delivery and store entity CRUD.
  **Why:** pin behavior before further store/shim refactoring.
  **Standard:** characterization tests before legacy refactors.

## Deferred (explicit)

- Job consolidation and path-gating in CI: changes required-check names, needs
  a branch-protection update in the same PR.
- Bulk tracker migration: migrate one domain at a time; new screens use
  `RecordTracker`.
- Cognitive complexity promotion from warning to error: after the 19-warning
  backlog is cleared.
- SonarCloud/CodeScene: out of scope, keep the repository self-contained.

## 2026-11-25 — Boundary cleanup (branch `refactor/boundaries`)

- Moved `sanitizeShareHtml` and its helper constants out of
  `src/screens/ShareView.tsx` into `src/utils/shareHtml.ts`, updating the
  component, `DocPreview` and the sanitizer tests. **Why:** remove a
  component → screen import. **Standard:** stable → volatile direction.
- Replaced direct `@tauri-apps/api/core` imports in `KanbanBoard` with
  `tauriInvoke` from `src/utils/tauri.ts`. **Why:** UI should not import Tauri
  internals directly. **Standard:** typed seam via the browser shim.
- `npm run check:boundaries` warnings dropped from 27 to 16. **Why:** warn-first
  backlog is visible and shrinking.

## 2026-11-25 — Cognitive complexity pass on utilities

- Extracted pure helpers in `clientImport.ts`, `paymentBehavior.ts`,
  `useAutoUpdater.ts` and `followUpTemplates.ts`. **Why:** cut the warn-first
  cognitive backlog. **Standard:** cognitive complexity <=15; extract named
  helpers, never change behavior to satisfy the metric.
- Cognitive warnings dropped from 19 to 15; lint warnings from 73 to 69.

## 2026-11-25 — Cognitive complexity pass on lib/import utilities

- Extracted pure helpers in `forecast.ts`, `heatmap.ts`, `voice.ts`,
  `classifier.ts`, `document.ts`, `searchRank.ts` and `checker.ts`.
  **Why:** continue burning down the warn-first backlog. **Standard:** cognitive
  complexity <=15 by extracting named helpers, no behavior change.
- Cognitive warnings dropped from 15 to 8; lint warnings from 69 to 62.

## 2026-11-25 — Complexity gates promoted

- Final extraction pass removed the last cognitive warnings in `Assets.tsx`,
  `App.tsx`, `RateBenchmarking.tsx`, `tauri.ts`, `seedData.ts` and `db/index.ts`.
- `sonarjs/cognitive-complexity` promoted from warning to **error** at 15, as
  agreed in Phase 0. `npm run complexity` now reports no offenders at all.

## 2026-11-25 — Boundary debt cleared

- Added typed plugin wrappers (`saveFileDialog`, `openFileDialog`,
  `readTextFile`, `writeFileBytes`, `joinPath`, `openPath`, `relaunchApp`,
  `Database`/`DownloadEvent` type re-exports) in `src/utils/tauri.ts`.
- Rewired `ClientImportModal`, `UpdaterModal`, `Contracts`, `Dashboard`,
  `Settings` and `DataSection` to use that seam; no direct `@tauri-apps/*`
  imports remain in UI/screens.
- Scoped duplicate-basename detection to same-folder duplicates (cross-folder
  `index.ts`/`shared.tsx` are intentional).
- `npm run check:boundaries -- --strict` now runs inside `npm run verify`.
  Boundary warnings: 16 → 0.

## 2026-11-25 — Characterization tests for parsers/exports/polling

- Added `documentParser.test.ts`, `spreadsheetParser.test.ts`,
  `exportCommon.test.ts` and `usePortalPolling.test.tsx` (17 assertions).
  **Why:** pin previously untested behavior before further refactoring.
  **Standard:** behavior tests, no DOM internals; no new dependencies.
- Test suite: 246 → 263 tests, 59 → 63 files.

## 2026-11-25 — Type-safety cleanup

- Replaced all 24 explicit `any` usages with concrete types, `unknown` +
  narrowing or typed helpers across 12 files. **Why:** type safety is the
  cheapest invariant for agents. **Standard:** no `any` without reason.
- Lint warnings: 57 → 32 (0 errors). Tests still 263 passing.

## 2026-11-25 — Large-file split

- Moved `UnifiedStore`/`AppStore` declarations to `src/store/types.ts`
  (store/index.ts 2242 → 1829 lines) and static SQL arrays to
  `src/db/schema.ts` (db/index.ts 1744 → 1640 lines). **Why:** reduce file
  size without moving logic. **Standard:** one reason to change per module;
  single `create()` remains in `store/index.ts`.

## 2026-11-25 — Rust command tests

- Added 9 unit tests for pure helpers in `sharing.rs`, `kanban.rs` and
  `server.rs`. **Why:** cover command-adjacent behavior without AppHandle/DB.
  **Standard:** behavior tests; no new dependencies. Rust tests 13 → 22.

## 2026-11-25 — Phase 0 research refresh

- Three parallel research subagents (`opencode-go/hy4-flash-free`) completed the
  missing open-source readiness section and validated the complexity,
  agent-pattern and tooling guidance in `RESEARCH_REPORT.md`. **Why:** the
  first report had no license/CLA/secret/license-hygiene section and contained
  several stale tooling claims. **Standard:** research before action; audit
  trail. Key corrections: keep MIT; no CLA/dual licensing; Clippy's
  `cognitive_complexity` is a restriction lint, not a measurement tool;
  `eslint-plugin-sonarjs` is already an error at 15; `audit:oss` is a regex,
  not a license/secret auditor; one AI-study sample size was misattributed.

## 2026-11-25 — Phase 1 audit refresh

- Three parallel audit subagents re-measured legal/security/hygiene, code
  quality and contributor experience. `AUDIT_REPORT.md` was rewritten with a
  current-metrics table, a done-vs-open backlog and a P0/P1/P2 roadmap.
  **Why:** the prior audit predated several refactors and contained stale
  claims (squashed history, operative Clippy config, exact counts).
  **Standard:** evidence before action; no behavior changed.

## 2026-11-25 — Phase 2 standards and community files

- `STANDARDS.md` and `AGENTS.md`: corrected `npm run complexity -- 10`, the
  operative Rust Clippy config, the verify gate list, and retired the dead
  `src/features/<domain>/` rule in favour of the existing
  `src/components/features/` tree. **Why:** rules must point at real paths
  and real commands. **Standard:** invariants in docs must match tooling.
- Fixed the P0 disclosure contradiction: `docs/SECURITY.md` now points to
  private advisories. Added Contributor Covenant 2.1 enforcement tiers to
  `CODE_OF_CONDUCT.md`. **Why:** public issue reports can leak unpatched
  vulnerabilities; enforcement needs a documented ladder.
- Added `SUPPORT.md` (help channels and explicit non-goals) and a short BDFL
  `GOVERNANCE.md`. **Why:** standard open-source contributor pathways.
- Corrected the README architecture claim, added a CI badge, fixed `cd lance`
  → `cd Lance` in `docs/DEVELOPMENT.md`, and aligned `CONTRIBUTING.md` with
  what `verify` and CI actually run. **Why:** the front door must be truthful.
- Renamed `REFACTORING_LOG.md` to `TRANSFORMATION_LOG.md` to match the
  transformation workflow. **Why:** one canonical log, no duplicate history.

## 2026-11-25 — Phase 3 Track A (legal/security/hygiene)

- Generated `THIRD_PARTY_NOTICES.md` from `package-lock.json` via a new
  `scripts/generate-notices.mjs` (`npm run notices:generate`) and added bundled
  SIL OFL 1.1 notices for all nine font families (`public/fonts/OFL.txt`).
  Both are included in Tauri bundle resources. **Why:** Apache-2.0 and OFL
  attribution obligations were previously unmet. **Standard:** legal hygiene.
- Fixed the xlsx gate's dead `EXPECTED` constant and the inaccurate
  "hash duplicated in package.json" claim in `security.yml`. **Why:** the
  gate claimed two independent controls but had one. **Standard:** no dead
  controls, honest docs.
- Aligned the Tauri copyright string with `LICENSE.md`. **Why:** SPDX/copyright
  consistency.

## 2026-11-25 — Phase 3 Track B (code quality and tests)

- Cleared 25 of 32 lint warnings (all 17 unused vars and all 7 hook-dependency
  warnings, plus one fast-refresh case). **Why:** real dead code and stale
  dependencies. **Standard:** surplus deletion, no behavior change.
- Added 9 frontend tests (PDF/DOCX exporters, image parser) and 6 Rust tests
  (archetype payload contracts). **Why:** characterize previously untested
  surfaces before future refactors. **Standard:** behavior tests first.
- Frontend suite: 64 files / 273 tests → 67 files / 282 tests. Rust: 22 → 28.

## 2026-11-25 — Phase 3 Track D (CI and release hygiene)

- Added `audit:oss`, `npm run complexity -- --strict` and strict boundaries to
  the existing CI lint job; no new job names, so branch protection is
  untouched. **Why:** local `verify` gates were bypassable by PRs.
- Made `scripts/complexity.mjs` honour `--strict` (non-zero exit on offenders).
  **Why:** a report-only step cannot be a gate.
- Replaced the misleading Clippy `cognitive_complexity` gate with
  `excessive_nesting`, `too_many_lines`, `too_many_arguments` and
  `type_complexity`; deleted the stale root `Clippy.toml`. Three legacy
  `too_many_lines` offenders carry scoped `#[allow]` ratchets rather than
  weakening the gate. **Why:** upstream no longer treats that lint as a
  measurement tool.
- Rewrote `CHANGELOG.md` in Keep a Changelog format with SemVer comparison
  links and corrected version dates from git tags. **Why:** release hygiene.

## 2026-11-25 — Phase 4 (verification and handoff)

- Final verification: `npm run verify` green (0 lint errors, 7 fast-refresh
  warnings, 282 tests); strict complexity and boundaries clean; Rust 28 tests,
  `cargo fmt --check` and Clippy gate clean; xlsx pin check passes; no secrets
  in tracked files or commits. Rewrote `HANDOFF.md` with the release checklist
  and remaining debt. **Why:** a newcomer or agent can clone, build, test and
  contribute with only the documented commands.

## 2026-11-25 — Debt closeout (all remaining tracked items)

Six parallel subagents closed the handoff backlog:

- **CI secret/license gates:** pinned gitleaks action (`e0c47f4…`) with
  full-history checkout, least-privilege permissions and a narrow allowlist for
  eight known false positives; pre-commit hook uses the same config; new
  `check:licenses` gate covers 189 shipped npm packages and 650 Rust crates and
  is part of `verify` and CI. **Why:** `audit:oss` is only a regex grep.
- **Rust migration split:** `run_migrations` split into 13 ordered SQL stages
  after a DB characterization test; best-effort ALTER error semantics
  deliberately preserved. **Why:** 563-line function; no behavior change.
- **Store factories:** extracted generic simple-invoke CRUD (milestones,
  expenses) and archetype log CRUD into `src/store/factories/`; one `create()`
  remains. Four characterization tests added first. **Why:** edit locality.
- **App hooks:** modal state, keyboard shortcuts, follow-up engines and
  changelog notice moved into four hooks; App.tsx 1,192 → 751 lines.
  **Why:** thin shell, per AGENTS.md §4.
- **Tests:** +13 screen tests, KanbanBoard strengthened to 5 tests, 9 Rust
  tests in `mailto.rs`/`invoices.rs`. Frontend 282 → 303; Rust 28 → 38.
- **Trackers:** 5 more migrated to `RecordTracker` with two optional props
  (`addLabel`, `showCount`); ~144 custom-UI trackers remain by design.
- **Formatting:** `npm run format` applied to `src/`; `format:check` clean.
  **Why:** remove pre-existing ~300-file Prettier drift.
- **External:** enabled GitHub private vulnerability reporting via the REST
  API (verified enabled).
- **Decisions:** legacy license columns are compatibility-only (documented);
  the 7 fast-refresh DX warnings and Vite chunk-size warnings are deliberate
  concessions documented in `STANDARDS.md`/`HANDOFF.md`.

Final verification: `npm run verify` green (303 tests, 0 errors), strict
complexity/boundaries clean, `format:check` clean, 38 Rust tests + fmt +
Clippy clean. Everything is staged but not committed or tagged.

## 2026-11-25 — Playwright QA and final fixes

- Ran a full Chromium QA pass against the built preview: 9 E2E specs / 42
  tests under `e2e/`. Initial result 40/42 exposed a first-run onboarding
  ship-blocker (profile-save effect reset the step; finish buttons required a
  name input that was never rendered). **Why:** verify the refactor end to end
  in a browser. Fixed with a one-time hydration ref, an optional name field,
  and `onClose()` on finish; verified 3/3 fresh contexts.
- The archetype surface is intentionally disabled (`ArchetypeFeatureTabs`
  returns null), so migrated trackers cannot be exercised via routes. Added six
  component-level tests (`src/test/recordTrackerMigration.test.tsx`) and
  changed the E2E spec to assert the disabled surface does not leak panels.
  **Why:** verify the migration without re-enabling a deliberately disabled UI.
- Mocked the GitHub release-notes endpoint in E2E so rate-limit 403s no longer
  produce false console errors. **Why:** deterministic QA harness.
- Final gates: `npm run verify` green (309 tests / 69 files), strict
  complexity/boundaries clean, Rust 38 tests + fmt + Clippy clean, and
  `npx playwright test` **42 passed / 0 failed**.

## 2026-11-25 — Marketing/history audit and edge-case QA

- Audited the deleted marketing site, promo workflows and license worker. They
  are absent from the working tree and current CI; no live secret or payment
  credential was found anywhere in git history. The 16 old tags still reference
  the pre-OSS commercial lineage (prices, Paddle IDs, owner subdomains).
  **Owner decision: keep tags and history as-is** — no rotation, no rewrite.
  Recorded in `HANDOFF.md`. **Why:** flag high-risk history changes for review.
- Removed stale landing/orbit comments and dead orbit CSS from `tokens.ts`,
  `prefs.ts` and `index.css`. **Why:** no consumer remains after the landing
  site was deleted.
- Corrected the README/SECURITY "no server" claims (the portal binds
  127.0.0.1) and the "never read or written" claims about legacy license
  columns (the Rust profile command round-trips them).
- Expanded Playwright to 18 specs / 65 tests covering nine edge-case groups.
  Fixed four real defects surfaced: onboarding ignored the stored step on
  reload, Escape closed both a dialog and the command palette, focus was not
  returned to the dialog trigger, and a serious contrast violation on
  `/settings`. **Why:** verify behavior under edge cases before release.
- Final gates: `npm run verify`, strict complexity/boundaries, `format:check`,
  Rust 38 tests + fmt + Clippy, and `npx playwright test` **65 passed / 0 failed**.

## 2026-11-26 — Mission iteration 2 (research → audit → standards → execution)

- Phase 0: three research subagents found remaining 2026 gaps; recorded as
  `RESEARCH_REPORT.md` §9 with explicit add/skip decisions. **Why:** re-check
  settled decisions against current guidance rather than re-litigating them.
- Phase 1: three audit subagents verified the gaps with evidence (empirical
  Clippy scratch-crate test, GitHub API state, docs/config diff). **Why:**
  evidence before action; discovered the capitalized Clippy config was never
  read on Linux CI.
- Phase 2: STANDARDS/AGENTS now distinguish CI gates from review targets and
  document the store accessors and duplicate basenames. **Why:** honest,
  machine-checkable standards.
- Phase 3:
  - `git mv src-tauri/Clippy.toml src-tauri/clippy.toml`; nesting threshold 3;
    `rate_label` helper + one scoped allow in `server.rs`. **Why:** the gate
    was a no-op and the config was ignored on Linux.
  - Enabled GitHub secret scanning, push protection and Dependabot security
    updates via authenticated API (validity checks are Advanced-Security-gated
    and remain off). **Why:** complement gitleaks with push-time blocking.
  - Added CI-only duplicate-function advisory and import-cycle baseline (one
    known cycle), an `e2e` job with CI retries and automatic preview server,
    and a note that the job is not a required check. **Why:** structural
    ratchets without slowing the local loop or changing branch protection.
  - Added 3 ADRs + index, inbound MIT contribution statement, gradual SPDX
    note, network/privacy disclosure, `npm ci` quickstarts, corrected CI and
    architecture docs, and E2E instructions. **Why:** contributor/agent clarity.
  - Deleted unused `toastStore` object and stale UpdaterModal comment.
- Final gates all green: verify (309 tests), complexity/boundaries/cycles,
  format, Rust 38 tests + fmt + Clippy with live nesting gate, Playwright 65.
