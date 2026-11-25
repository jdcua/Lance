# Audit Report — Phase 1

Read-only audit of `jdcua/Lance` at the public MIT release (2026-11-25).
Evidence from three parallel subagents plus the GitHub Actions optimization
research. Findings inform `STANDARDS.md` and the Phase 3 refactoring queue.
**No application code was changed by this phase.**

---

## 1. Scale and structure

| Area | Files | LOC |
|---|---:|---:|
| `src/` (TS/TSX) | 400 | ~88,000 |
| `src-tauri/src/` (Rust) | ~23 | ~6,600 |
| `scripts/` | 8 | 565 |
| `docs/` | 5 | 487 |
| `.github/` | 17 | 1,046 |

`src/components/` holds 233 files (~47k LOC), of which **180 are feature
trackers**; `src/screens/` holds 39 files (~18k LOC). Tests: 57 frontend test
files, 241 cases; 13 Rust `#[test]` functions in `imports.rs`, `kanban.rs`,
`server.rs`.

### Largest files (mixed responsibilities)

| File | LOC | Mixes |
|---|---:|---|
| `src/store/index.ts` | 2,242 | all entity CRUD + single store creation + 30+ invoke paths |
| `src/db/index.ts` | 1,738 | browser DB + mock + 136 archetype table migrations |
| `src/screens/Clients.tsx` | 1,637 | CRM + communications + metrics + inline modals |
| `src/types/index.ts` | 1,292 | every domain type |
| `src/utils/backup.ts` | 1,285 | backup/restore + asset blobs + migration |
| `src/App.tsx` | 1,206 | shell + 17 direct component imports + engines + modals |
| `src/utils/tauri.ts` | 1,198 | browser shim mirroring nearly every Rust command |
| `src/screens/Invoices.tsx` | 1,179 | list + editor + payments + recurring |
| `src/screens/settings/DataSection.tsx` | 1,092 | data/backup/import settings |
| `src/screens/Settings.tsx` | 1,036 | shell + profile |
| `src-tauri/src/server.rs` | 1,021 | Axum portal + HTML + security |

## 2. Dependency graph and boundaries

Import edges (rows → columns): `components → db` 152, `components → store` 56;
`screens → components` 143, `→ utils` 64, `→ store` 40, `→ lib` 36;
`lib → utils` 4, `lib → store` 2 (only `engines/usePortalPolling.ts`).

**Findings**

- One self-cycle: `src/db/index.ts` dynamically imports `./index` in
  `getSchemaVersionFromDb`.
- Layer violations: `src/components/ui/DocPreview.tsx` imports
  `sanitizeShareHtml` from `src/screens/ShareView.tsx`; seven UI/screen files
  import `@tauri-apps/*` directly; `src/lib/metrics.ts` imports a
  `@tauri-apps/plugin-sql` type.
- **Entity triad:** adding an entity requires synchronized edits to
  `store/index.ts`, `db/index.ts` and `utils/tauri.ts` — a hidden link with no
  single source of truth.
- **Tracker duplication:** 151 feature components call `getDb()` directly and
  hand-roll CRUD; only two use `RecordTracker` (AGENTS §5 violation).
- Parallel store access paths: `store/toastStore.ts` (29 importers) and
  `store/updaterStore.ts` alongside the single store.
- Duplicate basenames: `index.ts` ×9, `shared.tsx` ×3. Themes split types
  (`themes/index.ts`) from values (`themes/themes.ts`).
- Stable modules: `types/`, `lib/constants.ts`, `lib/currency.ts`,
  `lib/commands.ts`, `utils/format.ts`, `utils/sanitize.ts`, base UI,
  `store/slices/base.ts`. Volatile: store/db/tauri shim, screens, trackers.

## 3. Complexity hotspots

- Cyclomatic: **0 functions above 15** (hard gate working), 72 above 12,
  156 above 10, 25 sitting exactly at 15. Max score 15.
- The real problem is **size/nesting**: `max-lines-per-function > 60` fires 317
  times (mostly JSX-heavy screens), `max-depth > 3` fires 34 times, and 38 files
  exceed 400 lines.
- Worst combined signals (score = function length + depth hits):

| Location | Lines | Notes |
|---|---:|---|
| `src/store/index.ts:573` (`create` closure) | 1,670 | single giant closure |
| `src/db/index.ts:530` (`runMigrations`) | 1,198 | one migration function |
| `src/screens/Settings.tsx:66` | 965 | depth 4 |
| `src/screens/Invoices.tsx:215` | 965 | depth 4, cc 15 |
| `src/screens/Assets.tsx:67` | 928 | single component |
| `src/App.tsx:353` | 853 | depth 4 |
| `src/screens/Time.tsx:112` | 845 | single component |
| `src/components/ui/ImportModal.tsx:71` | 608 | depth 4, cc 14 |
| `src/utils/tauri.ts:270` | 34 `&&` in file | cc 15 |

- JSX conditional density: `Clients.tsx` 38, `Sidebar.tsx` 38,
  `tauri.ts` 34, `ImportModal.tsx` 32, `Proposals.tsx` 31.
- Rust: `archetypes.rs` 805 lines (`get_sessions` ~75), `sharing.rs` 451
  (`get_portal_activity` ~77, `respond_share_token` 6 args, no tests),
  `lib.rs` `run` ~176 lines.
- **Churn limitation:** history was squashed to one initial commit, so
  `git log --numstat` is a size/age proxy, not true change frequency. Hotspot
  ranking therefore combines size, complexity and partial churn.

### Top 10 hotspots and first move

| # | Hotspot | Risk | First behavior-preserving move |
|---|---|---|---|
| 1 | `screens/Clients.tsx` | high | extract detail/edit panels + row; pure status filter helper |
| 2 | `store/index.ts` | high | group entity actions into factories imported into the one `create()` |
| 3 | `db/index.ts` | high | ordered array of per-version migration functions + thin runner |
| 4 | `ui/ImportModal.tsx` | medium | step components + state reducer |
| 5 | `screens/invoices/InvoiceModals.tsx` | medium | split create/edit modals + shared form |
| 6 | `App.tsx` | high | move follow-up checks/keyboard/engine wiring into hooks |
| 7 | `utils/tauri.ts` | medium | split browser shim by domain module |
| 8 | `screens/Invoices.tsx` | medium | pure filter/sort helpers + row component |
| 9 | `screens/Settings.tsx` | medium | move remaining inline sections into `settings/*` |
| 10 | `commands/archetypes.rs` | medium | extract long commands into helpers; add tests first |

## 4. Smells, dead code and tests

**P0 smells**

- Wait-and-hope timing banned by AGENTS §4: `setTimeout(..., 350)` in
  `screens/Dashboard.tsx:337,430,433,659` and `screens/Pipeline.tsx:240`.
- Unused imports in `App.tsx` (20 symbols), including an import-only
  `OrbitField` (`components/motion/OrbitField.tsx:11` even says "Never used").
- Legacy `license_key`/`licensed_at`/`trial_started_at` remain in
  `types/index.ts` and `db/index.ts` migrations, unused by app code. Keep for
  database compatibility but document explicitly, or drop with a migration.

**P1 smells**

- 24 `any` sites (notably `RecordTracker.tsx:76-77`, `Dashboard.tsx:337`,
  `Sidebar.tsx:170,173`, `lib/commands.ts:29,37,41`).
- 151 one-line `catch (e) { console.error(...) }` blocks; many empty catches in
  `demo/assetStore.ts` and `demo/importToolDraft.ts`.
- 177 hand-rolled trackers duplicating `RecordTracker` behavior.
- Generic identifiers (`item` 917, `data` 565, `info` 165) and magic values.

**Test gaps**

- ~22 of 26 screens untested; store CRUD almost untested; 125 of ~138 Tauri
  commands untested; exporters, import parsers and portal polling untested.
- Weak tests: `KanbanBoard.test.tsx` asserts only a text node; several tests
  have 2 expects or spy on command-registry internals.
- No Playwright specs despite `playwright.config.ts`.

**Documentation staleness**

- `docs/ARCHITECTURE.md` and `README.md` describe a config-driven archetype
  system (`ArchetypePicker`, `getArchetype`, per-profession configs) that does
  not exist; professions are hardcoded in `screens/Onboarding.tsx`.
- `docs/DEVELOPMENT.md` says Node 20+, while `doctor.mjs`/CI require Node 22.
- `CONSTITUTION.md` says 41 archetypes and 37 tables; code has 6 hardcoded
  professions and 136 browser-only archetype tables.

## 5. GitHub Actions audit (optimization research)

**Already good:** npm cache via `setup-node cache: npm`; least-privilege
permissions; pinned action SHAs; least-privilege `pull_request_target` comment
jobs; release artifacts handled correctly.

**Waste found:** no Rust cache anywhere; Linux apt deps installed in 5 places;
`npm ci` repeated in 6 places; Rust toolchain installed 5 times; `cargo install
cargo-audit`/`cargo-outdated` from scratch each run; no `concurrency` in CI,
no `timeout-minutes` on any job; docs-only PRs pay for all six CI jobs;
macOS universal build is necessary but expensive (10× minute multiplier).

**Implemented in PR #30:** pinned `Swatinem/rust-cache` in CI, security, deps
and all release legs; CI concurrency cancellation; job timeouts everywhere;
removed unnecessary apt installs; scoped scheduled-release write permission.

**Deferred:** job consolidation and a `changes` path-gate (both change required
check names and need a branch-protection update); frontend-once release artifact
(medium risk); SonarCloud/CodeScene deliberately out of scope.

## 6. Prioritized audit backlog

**P0 — do first**

1. Remove `db/index.ts` self-import.
2. Fix stale docs (archetypes, Node version, counts) — agent instructions
   currently misdescribe the code.
3. Add characterization tests for store CRUD and the three untested Rust
   command modules (`archetypes.rs`, `sharing.rs`, `server.rs`).
4. Replace the five `setTimeout(..., 350)` timing hacks.
5. Remove unused imports/`OrbitField` from `App.tsx`.

**P1 — structured cleanup**

6. Lintable boundary rules (stable → volatile; no UI `@tauri-apps` imports;
   no component → screen imports; no self-import).
7. Add cognitive complexity as a **warning** (`eslint-plugin-sonarjs`, TS 15,
   Clippy 20) and size budgets as warnings.
8. Group store actions into factory functions while preserving the single store.
9. Split `runMigrations` into ordered per-version functions.
10. Migrate one more tracker to `RecordTracker` as a documented pattern.

**P2 — continuous**

11. Type the `any` sites; normalize catch blocks.
12. Add exporter/parser/polling tests; expand thin tests.
13. Quarterly hotspot review once real churn history accumulates.

## 7. Refactoring roadmap (behavior-preserving)

1. **Characterize** — tests for store CRUD, exporters, parsers, Rust commands.
2. **Fix deterministic defects** — self-import, timing hacks, dead imports.
3. **Enforce standards** — AGENTS/STANDARDS, warn-first cognitive complexity,
   boundary lint rules, size budgets, Actions caching already landed.
4. **Break up the top hotspots one at a time**, highest churn/complexity first,
   one transformation per PR, `npm run verify` after each.
5. **Record** each change in `REFACTORING_LOG.md`; keep `AGENTS.md` and
   `ARCHITECTURE.md` in sync with the new structure.
