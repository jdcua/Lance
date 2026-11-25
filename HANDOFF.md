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
| `npm run verify` | typecheck, lint (0 errors), **303 tests / 68 files**, build, OSS audit (610 files), license policy, strict boundaries — pass |
| `npm run complexity -- --strict` | 0 functions above cyclomatic/cognitive 15 |
| `npm run check:boundaries -- --strict` | 0 warnings |
| `npm run format:check` | clean |
| `cargo test --lib` | **38 tests**, 0 failed |
| `cargo fmt --check` + Clippy quality gate | clean |
| gitleaks full history | configured in CI with pinned SHA and false-positive allowlist; local scan found 0 findings after allowlisting |
| GitHub private vulnerability reporting | enabled (`true`) |

All changes are staged in git; nothing has been committed or tagged.

## Remaining items (deliberate decisions or external actions)

| Item | Status / plan |
|---|---|
| ~144 hand-rolled trackers | Intentional: each has custom UI/validation; migrate on demand. `RecordTracker` is mandatory for new entity screens. |
| 7 fast-refresh DX warnings | Intentional concession: DX-only, every export has a consumer, splitting would worsen boundaries. Documented in `STANDARDS.md`. |
| Vite chunk-size warnings (`pdf`, `import`) | Informational; dynamic imports already in place. Further splitting is behavior-riskier than the warning warrants. |
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
