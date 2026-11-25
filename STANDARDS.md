# Engineering Standards

These are the target standards for Lance, derived from `RESEARCH_REPORT.md` and
the findings in `AUDIT_REPORT.md`. `AGENTS.md` is the short operational
rulebook; this file explains the *why* and the thresholds. Behavior must not
change during a refactor unless explicitly approved.

## 1. Complexity and size budgets

| Metric | Standard | Enforcement |
|---|---|---|
| Cyclomatic complexity | ≤15 per function; **new code target ≤10** | ESLint `complexity: ['error', 15]`; `npm run complexity -- 10` |
| Cognitive complexity (TS) | ≤15 (ESLint error) | `sonarjs/cognitive-complexity: ['error', 15]` |
| Cognitive complexity (Rust) | ≤20 (policy; see note) | CI now uses `excessive_nesting` + `too_many_lines` + `too_many_arguments` + `type_complexity`; upstream discourages Clippy's `cognitive_complexity` as a measurement lint. Legacy size offenders are annotated with scoped `#[allow]` ratchets. |
| Function length | 40 lines target, 60 warning | review + Phase 3 lint budget |
| File length | 400 soft / 800 hard (TS); 300–500 (Rust) | review + Phase 3 lint budget |
| Nesting depth | ≤3 (≤2 in JSX-heavy components) | review |
| Parameters | ≤4; use a parameter object beyond | review |
| Duplication | <3% new code; no new clone ≥10 lines | Phase 3 jscpd baseline |

Rationale: cyclomatic complexity measures testability, cognitive complexity
measures readability. A flat dispatcher may score high cyclomatic but be easy
to read; nested branches are the opposite. Long files and deep nesting are the
dominant AI-generated-code smells in this codebase.

**Do not** extract a helper solely to satisfy a metric. If extraction needs
more than four parameters or must return two values, redesign the flow instead.

## 2. Naming

- One canonical name per concept. No `Client`/`client`/`ClientRecord`
  variants; no `New`, `Old`, `V2` suffixes.
- File name equals the primary export (`InvoiceCard.tsx` exports `InvoiceCard`).
- Domain nouns for directories and files: `recurringDates.ts`, not
  `helpers.ts` or `utils.ts`.
- Functions describe an action and return value (`computeInvoiceTotal`,
  `capRefundWindow`), not `handle`/`process` without context.
- Tests are named for behavior: `it('keeps partial payments outstanding')`.
- No generic identifiers (`data`, `item`, `info`) in new code.

## 3. Modules, files and directory structure

- **Small, single-responsibility units.** A module has one reason to change;
  an agent should find it from the task description alone.
- **New feature code goes in `src/components/features/`**, colocated with its
  pure math and tests; new cross-cutting domain code sits next to its
  consumers. Existing role-based folders stay; migrate opportunistically when
  already touching a file, never in a bulk move. (The earlier
  `src/features/<domain>/` rule referred to a directory that does not exist
  and has been retired; see §6.)
- **Barrels may re-export a deliberate public surface but never define
  behavior.** Prefer deep imports. No duplicate entry points.
- **Stable → volatile dependency direction:**
  `screens/ → features/ → lib/ → types/`; `lib/` never imports `screens/`;
  `types/` imports nothing.
- Lintable boundary rules:
  1. UI/screens must not import `@tauri-apps/*` directly — use store actions
     or `src/utils/tauri.ts`.
  2. `src/components/**` must not import from `src/screens/**`.
  3. `src/lib/**` (except `engines/`) must not import `store/`, `db/`,
     `screens/` or `components/`.
  4. Only `src/store/index.ts` may call zustand `create()`.
  5. `src/db/index.ts` must not import itself.
- `npm run check:boundaries` reports violations; `--strict` fails once clean.
- Keep the single Zustand store and the command registry; do not introduce a
  second state system or raw `lance:` events.

## 4. Comments and documentation

- Comment only what code cannot express: invariants, business rules, security
  constraints, non-local coupling, historical reasons.
- Put load-bearing comments at point of use, tagged `// INVARIANT:`,
  `// SAFETY:` or `// AIDEV-NOTE:`. Delete paraphrase comments; stale comments
  are bugs.
- Prefer types, names and tests over prose. Public Rust items use `///` with
  `# Errors`/`# Panics`; modules use `//!`.
- `AGENTS.md` stays ≤200 lines and contains commands, non-obvious invariants,
  anti-patterns and a definition of done — nothing derivable from the code.
- `CLAUDE.md` and `.github/copilot-instructions.md` are thin pointers to
  `AGENTS.md`; do not duplicate rules.
- Update documentation in the same PR as a convention change.

## 5. Testing

- Tests describe behavior, not DOM internals or implementation details.
- Add a **characterization test before refactoring** legacy behavior.
- Every new bug fix has a failing-then-passing test; every new feature has a
  behavior test.
- File-scoped iteration: `npm run test -- path/to/file.test.ts`.
- Definition of done: `npm run verify` green; `cargo test --lib`,
  `cargo fmt --check` and the Clippy gate green when Rust is touched;
  `npm run complexity` shows no regression.
- Coverage percentages are reported, not gated.

## 6. Concessions (things we explicitly will not over-engineer)

- No wholesale directory restructure; new feature code uses the existing
  `src/components/features/` tree. An empty `src/features/` placeholder is
  intentionally not created — rules must point at real paths.
- No DI framework, no interface for a single implementation, no class
  hierarchies for SOLID's sake.
- The remaining 7 `react-refresh/only-export-components` warnings are a
  deliberate concession: they are DX-only (hot reload), every export has a
  real consumer, and splitting those files would create worse module
  boundaries. Do not churn them purely to silence a warning.
- Complexity is enforced: cyclomatic ≤15 and cognitive ≤15 (TS) are errors;
  Rust uses `excessive_nesting`, `too_many_lines`, `too_many_arguments` and
  `type_complexity` gates in CI (legacy offenders carry scoped `#[allow]`
  ratchets). Function/file length stay warnings.
- `npm run complexity -- --strict` is a CI gate; plain `npm run complexity`
  is a local report.
- No SonarCloud, CodeScene or other SaaS analysis: the repo stays
  low-dependency and self-contained.
- No hard gates on Maintainability Index, Halstead, global duplication or
  global coverage.
- Preserve odd-looking behavior until a separate, explicitly approved change.
- Legacy license columns (`license_key`, `licensed_at`, `trial_started_at`, etc.)
  are retained in the database and TypeScript/Rust payload types for on-disk
  compatibility only. They are never read or written by application code; do
  not add gating logic around them. A future migration may drop them.
- Existing 177 hand-rolled trackers migrate one at a time; `RecordTracker` is
  mandatory only for new entity screens.
