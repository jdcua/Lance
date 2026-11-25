# Handoff

## What changed

Lance was transformed from a public but loosely structured codebase into a
repository with explicit standards and deterministic quality gates. The work
followed four phases:

1. **Research** (`RESEARCH_REPORT.md`) — metrics, design principles,
   agent-friendly patterns and tooling, with thresholds and concessions.
2. **Audit** (`AUDIT_REPORT.md`) — structure, dependency graph, complexity
   hotspots, smells/test gaps and GitHub Actions waste, with a prioritized
   backlog.
3. **Standards** (`STANDARDS.md`, `AGENTS.md`) — complexity budgets, naming,
   boundaries, documentation and testing rules, plus explicit non-goals.
4. **Execution** (`REFACTORING_LOG.md`) — Rust caching and job bounds in CI,
   cognitive complexity warning, Clippy `cognitive_complexity`/
   `too_many_arguments`/`type_complexity` as errors, `cargo fmt --check`,
   deterministic command delivery instead of `setTimeout(..., 350)`, removal
   of the `db/index.ts` self-import and dead code, and characterization tests
   for commands and store CRUD.

No business behavior changed. Documentation that contradicted the code
(archetype configs, Node version, profession counts) was corrected.

## Verification

- `npm run verify` — typecheck, lint (0 errors), 244 tests, Vite build,
  OSS audit — passes.
- `npm run complexity` — 0 functions above cyclomatic 15; 0 cognitive
  warnings (warn-first backlog).
- `npm run check:boundaries` — 0 warnings (enforced in verify).
- Rust: `cargo test --lib` (13 tests), `cargo fmt --check`, and the Clippy
  quality gate pass.
- Branch protection requires six CI checks; main is protected against force
  pushes and deletions.

## Remaining technical debt (tracked, not hidden)

| Debt | Where | Plan |
|---|---|---|
| 177 hand-rolled trackers instead of `RecordTracker` | `src/components/features/` | migrate one domain per PR; mandatory for new entity screens |
| Large screen/store/db files | `Clients.tsx`, `store/index.ts`, `db/index.ts`, `App.tsx` | extract helpers/components/group actions; one transformation per PR |
| 0 cognitive-complexity warnings | `npm run complexity` | rule now promoted to ESLint error at 15 |
| 0 boundary warnings | `npm run check:boundaries` | enforced in `npm run verify`; keep UI behind the tauri seam |
| ~22 untested screens, ~125 untested Tauri commands | `src/screens/`, `src-tauri/src/commands/` | characterization tests before touching each area; parsers/exports/polling now covered |
| Cloudflare Workers Builds check still posts failures | external GitHub App | disable in the Cloudflare dashboard; not a required check |

## How to extend the system

1. Read `AGENTS.md` (short rules) and `STANDARDS.md` (thresholds and why).
2. Find the domain area in `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.
3. New features go in `src/features/<domain>/` with colocated tests; new
   entity screens use `RecordTracker`; app-wide actions go in
   `src/lib/commands.ts`.
4. Add a characterization test before refactoring legacy behavior; keep tests
   behavior-based.
5. Run `npm run verify`, plus `cargo test --lib`, `cargo fmt --check` and the
   Clippy gate when Rust is touched. Optionally run `npm run complexity` and
   `npm run check:boundaries` to avoid adding debt.
6. Open one small PR, use the PR template, and record the change in
   `REFACTORING_LOG.md`. Update docs in the same PR when a convention changes.

## Non-goals (do not reintroduce)

- Accounts, cloud sync, network telemetry, license keys or paywalls.
- New UI frameworks, state libraries, DI frameworks, or class hierarchies
  for SOLID's sake.
- SaaS analysis services; the repository stays low-dependency and self-contained.
- Bulk directory rewrites; migrate incrementally when a file is already touched.
