# Refactoring Log

Behavior-preserving changes made during the readability transformation.
Each entry records what changed, why, and which standard it satisfies.

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
