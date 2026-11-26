# Research Report — Human + Agent Readable Codebase

**Phase 0 deliverable.** Research only: no application code was changed. This
report informs the standards, audit and refactoring plan for the Lance
repository (Tauri 2 + React 18 + TypeScript + Rust desktop app, ~578 tracked
files, ~94k LOC frontend).

Research date: 2026-11-25. Sources are 2025–2026 guidance and empirical work,
listed at the end. Refreshed the same day by three independent research
subagents (open-source readiness, complexity-threshold validation, agent/tooling
validation); their findings are integrated below. Corrections are marked
**(verified 2026-11-25)** where they overturn an earlier claim.

---

## Executive summary

1. **Cyclomatic complexity is the right testability signal, not the right
   readability signal.** Keep the existing hard gate at 15, but pair it with
   cognitive complexity (nesting-aware) so a flat 20-case dispatcher is not
   treated like 20 nested branches.
2. **AI-generated code has a measurable structural signature**: long methods,
   copy-paste invocation blocks, "modular mirage" (files split by layer with no
   semantic cohesion), and volume-correlated architectural decay. Prompting
   does not fix it; structure, tests and lint do.
3. **For agents, edit locality is the design goal.** A task should resolve to
   one canonical file with one reason to change. Hidden links (two files that
   must change together) are the main cause of partial completion.
4. **AGENTS.md is context, not enforcement.** Keep it under ~200 lines, put
   commands and non-obvious invariants first, and move hard rules into
   ESLint/CI/clippy/hooks. Nested instruction files should be path-scoped.
5. **Fast verification beats comprehensive analysis.** `npm run verify` stays
   seconds-to-minutes; heavy tools (jscpd, knip, coverage) belong in CI
   with baseline ratchets, not in the local loop.
6. **Target architecture: domain-oriented vertical slices on top of stable
   seams** (single Zustand store, typed command registry, Rust command modules
   with shared logic in a services layer). Do not reorganize the whole tree in
   one pass; migrate one domain at a time.
7. **Legal posture is already sound:** keep MIT, no CLA and no commercial dual
   licensing. The remaining open-source work is operational, not legal —
   automated secret scanning, dependency-license policy, and a few community
   files (SUPPORT.md, CHANGELOG, private vulnerability reporting).

---

# 0. Open-source readiness

Adding this section closes the gap in the first draft, which covered code
quality but not licensing, contribution law, or release hygiene.

## 0.1 License decision — keep MIT

| License | Type | Patent grant | Copyleft | Fit for a local desktop app |
|---|---|---|---|---|
| **MIT** | Permissive | Implicit only | None | **Best default — keep** |
| Apache-2.0 | Permissive | **Express** | None | Strong alternative if patents matter |
| BSD-2/3, ISC | Permissive | None / implicit | None | Fine, no advantage over MIT here |
| MPL-2.0 | Weak copyleft | Express | File-level | Overkill for an application |
| GPL-3.0 / AGPL-3.0 | Strong / network copyleft | Express | Whole work | Wrong tool; AGPL §13 only bites network modification, but the license is widely banned by corporate policy and deters adoption |

**Decision: keep MIT** (`LICENSE.md`, `package.json`, `Cargo.toml` all agree).
It maximizes downstream compatibility with the overwhelmingly permissive npm
and Cargo ecosystems and imposes no attribution burden beyond the notice. If a
real patent grant is later wanted, the low-friction move is the Rust-ecosystem
convention `MIT OR Apache-2.0` — two permissive licenses, *not* commercial
dual licensing. Keep the SPDX identifier consistent in all three locations.

## 0.2 CLA, DCO, dual licensing

- **No CLA.** CLAs buy patent grants and future relicensing for companies and
  foundations; they add onboarding friction and a management workflow that a
  solo maintainer does not need.
- **No commercial dual licensing.** MIT already permits commercial use; the
  copyleft-plus-paid model requires owning all contributions (i.e. a CLA).
- **DCO is the cheap provenance option** if desired later: a `Signed-off-by:`
  line per commit, bot-checkable, "inbound == outbound" certification.

## 0.3 Secret scanning and history hygiene

- Tooling: **gitleaks** (fast regex/entropy, good for pre-commit and CI),
  TruffleHog (live verification, AGPL tool license), detect-secrets (baseline
  on legacy code), and GitHub **secret scanning + push protection** (free on
  public repos, validity checks, blocks pushes).
- **Rotate first, always.** History surgery does not undo exposure. Check auth
  logs for the exposure window, then decide about rewriting.
- **Rewrite only when justified.** Prefer `git filter-repo`; BFG for large
  bulk blob stripping. For a public repo with forks, rewriting alone is close
  to pointless — forks and archives retain the old object. If done: announce
  a window, collect pending work, rewrite, force-push, have collaborators
  re-clone, expire reflogs and GC, then ask GitHub support to purge cached
  views. Note: this repository has **318 commits** (not a single squashed
  commit, as an earlier draft claimed), so a rewrite is no longer cheap.
- A full-history regex scan on 2026-11-25 found no secrets; keep that as a
  release check, and add automated scanning rather than relying on manual runs.
  Scope note: public `main` has 24 commits; the local clone has 318 commits
  across all refs/reflog (evidence of a past local rewrite). Specify which
  scope any rewrite discussion refers to.

## 0.4 Dependency license hygiene

- Cargo: `cargo-deny` (`deny.toml`) for allow-listed licenses, bans, advisories
  and sources; `cargo-about` to generate a consolidated third-party NOTICE.
- npm: `license-checker` / `license-report` for an SPDX inventory.
- Apache-2.0 dependencies require NOTICE preservation in distributed Tauri
  bundles; commit the generated attribution file and fail CI on drift.
- Watch transitive GPL/AGPL components; isolate or replace them. Tool output
  is guidance, not legal advice.
- **Current state (verified 2026-11-25):** `npm audit` and `cargo audit` already
  run in `.github/workflows/security.yml`; **license checking and secret
  scanning do not**. The `xlsx` dependency comes from `cdn.sheetjs.com`,
  outside the npm registry audit path — document that exception.

## 0.5 Community files checklist

| File | State | Action |
|---|---|---|
| README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, AGENTS.md, issue/PR templates | Present | Keep current; fix stale claims (see AUDIT_REPORT.md) |
| SUPPORT.md | Missing | **Add** — where to get help, what is out of scope |
| CHANGELOG.md | Present | Keep Keep-a-Changelog format with SemVer releases |
| GitHub private vulnerability reporting | Unverified | **Enable** in repo settings; confirm SECURITY.md contact is monitored |
| GOVERNANCE.md | Absent | Optional now; add when contributors arrive |

## 0.6 Governance

Stay BDFL (solo maintainer) and document it lightly. Practical hardening: a
GitHub Organization rather than a personal repo, a backup admin, protected
branches, and a written path from contributor to committer. Reconsider a
fiscal sponsor or foundation only if donations or corporate contributions
materialize. No legal entity is needed to launch.

---

# 1. Core complexity & quality metrics

## 1.1 Cyclomatic complexity (McCabe)

- Measures linearly independent paths: `M = E − N + 2P`; tools count +1 per
  decision (`if`, loop, `case`, ternary, `&&`/`||`, `catch`).
- Risk bands: 1–10 simple, 11–20 moderate, 21–50 complex, 50+ untestable.
- Strengths: cheap, universal, correlates with defect density and the number
  of tests needed.
- Blind spots: counts paths, not comprehension. A flat switch and a deeply
  nested chain score the same; boolean chains inflate the score.
- **Recommendation (local policy, not a tool default):** warn at 10, error at
  15; allow up to 20 only for top-level dispatchers/route handlers. ESLint's
  core `complexity` default is 20, so the gate must be explicit — it already
  is (`complexity: ['error', 15]`). **(verified 2026-11-25)** Add
  `variant: "modified"` to match the flat-switch argument above; without it
  every `case` adds 1 even though a flat switch costs only 1 in cognitive
  complexity.

## 1.2 Cognitive complexity (SonarSource)

- Scores understandability: +1 per control structure, +1 per nesting level,
  +1 for control-flow breaks and mixed logical-operator sequences. Flat
  `switch` cases cost 1 total, not N.
- Better aligned with human (and agent) perception than cyclomatic complexity
  because it penalizes nesting — the real driver of comprehension cost.
- Thresholds: SonarQube's rule S3776 is commonly configured at 15 (the
  documented numeric default could not be re-verified — treat 15 as likely,
  not verified). **(verified 2026-11-25)**
- Blind spots: proprietary definition; local-function refactoring can inflate
  scores; thresholds are empirical, not derived.
- **Recommendation:** 15 for TS. `eslint-plugin-sonarjs@4.2.3` is **already
  installed and enforced as an error at 15** in `eslint.config.js` — the
  earlier "add it warn-first" decision is obsolete. The npm package is
  maintained in `SonarSource/SonarJS` (the standalone
  `eslint-plugin-sonarjs` repo was archived 2024-10-03); enable chosen rules
  individually, **do not spread `recommended`** (it errors on hundreds of
  rules).
- **Rust correction (verified 2026-11-25):** Clippy's `cognitive_complexity`
  is now a **restriction** lint and upstream explicitly says it "should not
  be used as a measurement tool"; prefer `excessive_nesting` and
  `too_many_lines`. The former gate `-D clippy::cognitive_complexity` used
  `src-tauri/Clippy.toml` (the operative config, threshold 20) while the
  **root** `Clippy.toml` was a stale duplicate set to 30. Both were resolved in
  Phase 3: the root file was deleted and the gate migrated. Clippy defaults are
  25 / 100 lines / 7 arguments /
  type-complexity 250, so any tighter ceiling must be set explicitly in the
  operative config.

## 1.3 Maintainability Index (MI)

- Composite of Halstead volume, cyclomatic complexity, LOC and (SEI variant)
  comment ratio; VS scale 0–100, alert below 20.
- Useful for ranking files and tracking trends; misleading for individual
  functions because LOC dominates and the composite hides what moved.
- **Recommendation:** file/module-level trend only, never a PR gate.

## 1.4 Halstead metrics

- Operator/operand counts → volume, difficulty, effort, estimated bugs.
- Historically interesting for effort estimation and defect research; weak
  modern validation, syntax-dependent, no readability signal.
- **Recommendation:** no gate; treat as an MI input only.

## 1.5 Size, nesting and parameters

These are **chosen project ceilings, not tool defaults** (ESLint's `max-depth`
defaults to 4 and `max-params` to 3). **(verified 2026-11-25)**

| Metric | Recommended ceiling | Enforcement |
|---|---|---|
| Nesting depth | 3 (2 in JSX-heavy components) | ESLint `max-depth` |
| Parameters | 4 (use a parameter object beyond) | ESLint `max-params`; Clippy needs `too-many-arguments-threshold = 4` |
| Function length | 40 logical lines, hard 60 | ESLint `max-lines-per-function`; Clippy needs `too-many-lines-threshold = 60` |
| Component length | 150–200 lines | review / `max-lines` warn |
| File length (TS) | 400 soft, 800 hard | ESLint `max-lines` warn |
| File length (Rust) | 300–500 | clippy / review |

These are ceilings, not targets: a long cohesive file is better than a short
incoherent set of files.

## 1.6 Duplication / clone detection

- Clone types: exact, renamed identifiers, near-miss, semantic.
- Thresholds (local policy heuristics, not SonarSource guidance): <3%
  duplicated lines in new code, <5% on legacy; refactor any clone ≥10 lines
  or ≥6 statements. **(verified 2026-11-25)**
- Tools: jscpd, SonarQube, PMD CPD.
- Blind spots: generated code and test fixtures inflate; similarity is not
  shared knowledge (see DRY below).

## 1.7 Coupling, cohesion, fan-in/fan-out

- Martin metrics: `I = Ce/(Ce+Ca)` (instability), `A` (abstractness),
  `D = |A + I − 1|`.
- **Recommendation:** no cycles; `D < 0.5` for core modules; fan-out ≤ 7–10;
  high fan-in only for pure utilities; core stable (`I→0`), UI volatile
  (`I→1`).
- Beware "god modules" with large fan-in that are not actually pure.

## 1.8 Modern structural signals (2025–2026)

- **Hotspots:** churn × complexity over 6–12 months predicts defects better
  than either alone (Tornhill). Tools: code-maat, CodeScene.
- **Change coupling:** files that change together reveal hidden links — the
  same concept as Lance's untangle standard.
- **LLM smell taxonomy** (arXiv 2605.02741, Zhu/Tsantalis/Rigby, May 2026):
  Long Method, God Class, Too Many Branches, Redundant Implementation, Modular
  Mirage, and a Volume-Quality Inverse Law (TLoC predicts architectural smell
  with ρ≈0.94). Functional correctness is decoupled from structural quality.
  **(verified 2026-11-25)** The "580 repos / 3M methods" sample size in the
  first draft belonged to a *different* paper (arXiv 2611.10545, about Extract
  Method limits) and has been removed. The ρ≈0.94 result is from a small,
  unrefereed preprint (90 CodeContest problems; 5 MetaGPT scenarios; Python
  only) — treat it as **preliminary**, not an established law.
- **Recommended metric gate set:** cyclomatic ≤15 (error), cognitive ≤15
  (warn → error), no cycles, no new duplication beyond baseline, hotspot top
  5% reviewed quarterly.

**Threshold table (recommended for Lance):**

| Metric | Threshold | Tool |
|---|---|---|
| Cyclomatic | warn 10, error 15; 20 for dispatchers | ESLint `complexity` |
| Cognitive | 15 TS / 20 Rust | `eslint-plugin-sonarjs`, Clippy |
| MI | file-level alert <20 | local script |
| Halstead | no gate | — |
| Nesting | ≤3 (JSX ≤2) | `max-depth` |
| Params | ≤4 | `max-params` |
| Function length | 40 (hard 60) | `max-lines-per-function` |
| File length | 400 / 800 TS | `max-lines` |
| Duplication | <3% new, <5% legacy | jscpd baseline |
| Fan-out | ≤7–10 | dependency-cruiser |
| Hotspot | top 5% quarterly | code-maat |

---

# 2. Design principles & frameworks

## 2.1 SOLID — what pays off

- **SRP** is the highest-leverage principle in React: split "god components"
  by reason to change, not by technical role. For agents this is *edit locality*.
- **DIP** pays off only at real swap seams (Tauri fs vs browser storage, mail,
  LLM clients). Inject an interface only when a second implementation exists.
- **ISP** maps to small prop/client types; avoid fat props with unused fields.
- In Rust, SRP/ISP map to small modules and focused traits. Avoid trait
  proliferation for single-implementation structs.
- **Over-applied:** OCP (interface + base + factory for one product) and LSP
  (manufactured class hierarchies). TypeScript structural typing already
  provides most of LSP.

## 2.2 Clean Code in 2026 — keep vs ignore

- Keep: intent-revealing names, small functions *when the name adds meaning*,
  guard clauses, single level of abstraction per function, tests as the safety
  net, explicit error handling (`Result<T,E>` in Rust, discriminated unions
  in TS).
- Ignore: "functions must be <5 lines", "switch is a sin", "every dependency
  behind an interface", and the claim that tests make reading code unnecessary.
- Cyclomatic ≤15 remains a useful extraction trigger, not dogma.

## 2.3 DRY, KISS, YAGNI

- **DRY = don't repeat knowledge**, not don't repeat similar lines. Two
  look-alike blocks with different reasons to change should stay separate.
- **KISS** = fewest moving parts for *evidenced* requirements.
- **YAGNI** = no speculative interfaces, config knobs or plugin systems.
- Both AI failure directions are real: duplicating logic *and* over-abstracting
  coincidental similarity. Use the **rule of three** and require a domain name
  for the abstraction.

## 2.4 Separation of concerns — vertical slices over pure layering

- Organize by behavior/feature, not by technical layer. A folder should own
  UI + hook + local data access + tests for one behavior.
- Colocate things that change together; separate only genuinely shared domain
  concepts and cross-cutting infrastructure.
- **Modular Mirage** warning: `UserService` + `UserController` +
  `UserRepository` + `UserMapper` that always change together is fake
  modularity. Prefer fewer, deeper modules.
- Avoid cycles; dependency direction must be stable → volatile (Lance's
  existing untangle rule).

## 2.5 AI-typical smells to watch

- Long methods (AI consolidates a whole prompt into one block).
- Copy-paste invocation logic instead of a helper.
- Speculative generality, unclear names (`data`, `temp`, `handle`), magic
  values, defensive null-check noise, swallowed errors, comment bloat.
- Mechanical refactors that rename/reformat without reducing coupling.

## 2.6 Comments and invariants

- Comment only what code cannot express: business rules, security constraints,
  non-local coupling, historical rationale.
- Place load-bearing comments **at point of use**, not in file headers.
- Delete paraphrase comments and stale comments; treat stale comments as bugs.
- Prefer types, names and tests over prose. Use tagged markers
  (`// INVARIANT:`, `// SAFETY:`, `// AIDEV-NOTE:`) for grep-able constraints.
- Rust: `///` for public API with `# Errors`/`# Panics`; `//!` for module
  purpose; `//` for why.

## 2.7 Safe refactoring patterns

- Safe: rename, extract well-named helper, introduce parameter object, guard
  clauses/early returns, lookup tables, move one cohesive unit.
- Risky: extracting guard-clause chains (returns cannot be lifted), extraction
  that must return ≥2 values, "knotted" methods needing >5 params, mass
  mechanical renames that preserve bad structure. A 2026 study of 580 Java
  repositories / 3,026,902 methods (arXiv 2611.10545) shows Extract Method has
  real limits — extraction is a tool, not a universal fix.
- Protocol: characterization test first → one transformation per commit →
  verify → measure metric change → review.

---

# 3. Agent-friendly codebase patterns

## 3.1 Edit locality and naming

- The agent's failure mode is *partial completion*: changing 2 of 7 affected
  files. Colocation by change reason is the mitigation.
- One canonical name per concept; file name = primary export name; no `New`,
  `Old`, `V2`, `utils.ts`, `helpers.ts`.
- Directory names should be domain nouns. New feature code goes in
  `src/components/features/` with colocated tests (the earlier
  `src/features/<domain>/` target was retired because the directory did not
  exist); keep `src/types/` stable.
- Barrels may re-export a deliberate public surface, never define behavior.
  Prefer deep imports; no duplicate entry points.

## 3.2 Boundaries and typed seams

- Dependency direction: `screens/` → `features/` → `lib/` → `types/`.
  `lib/` never imports `screens/`; `types/` imports nothing.
- UI uses the command registry and store actions; no component calls Tauri
  `invoke` directly. Enforce with lint, not prose.
- IPC command names are a public API: one registration line in `lib.rs`, one
  Rust module, one TS type in `src/types/`.
- Invariants belong in types first, tests second, AGENTS.md third, CI last.

## 3.3 AGENTS.md conventions

- Belongs: exact commands (including file-scoped test commands), pinned tool
  versions, misleading code, decisions not visible in code, protected paths
  with reasons, anti-patterns, definition of done.
- Does not belong: onboarding narrative, PR etiquette, generic advice, file
  layout derivable from the tree, content duplicated in CLAUDE.md/Copilot.
- Keep root ≤200 lines — this recommendation comes from Claude Code's
  best-practices/memory guide, **not** from agents.md, which says nothing
  about length. **(verified 2026-11-25)** Nested instruction files are
  path-scoped (`.claude/rules/ui-standards.md` for `src/**/*.tsx`,
  `src-tauri/AGENTS.md` for Rust); `agents.md` confirms nearest-file precedence
  and is now stewarded by the Agentic AI Foundation under the Linux Foundation.
- Copilot reads AGENTS.md natively (nearest wins) and also supports
  path-specific `.github/instructions/NAME.instructions.md` with `applyTo`
  globs — update the stale docs URL if that path is adopted.
- AGENTS.md is non-deterministic. Rules that must always hold go in hooks,
  ESLint, clippy or CI.
- Treat it as code: update in the same PR as a convention change; audit for
  stale paths/commands periodically.

## 3.4 Fast verification loop

```
npm run doctor                         # environment
npm run verify                         # typecheck + lint + test + build + audit:oss
npm run test -- path/to/file.test.ts   # targeted iteration
cargo test --lib                       # Rust side
cargo clippy --all-targets -- -D warnings
npm run complexity                     # no regression
```

Characterization tests before refactoring legacy modules; new behavior gets a
behavior test. Agents get a pass/fail check before opening a PR.

## 3.5 Context pressure and hallucination risk

- Failure modes: wrong-file edits and partial completion (Sourcegraph,
  1,281 runs / 40+ repos, 2026-05-08, verified), lost-in-the-middle attention
  decay (arXiv:2307.03172, TACL 2024), tool thrashing, statelessness.
  **2026 update (verified):** context overflow is no longer the primary
  driver — modern agents have 1M-token windows and automatic compaction, so
  prefer path-scoped rules, skills for procedures, hooks for determinism and
  `/clear` between tasks.
- Mitigations: small files, unique names, typed seams, subagents for
  exploration, targeted reads instead of reading directories wholesale,
  short AGENTS.md, CI gates as deterministic guardrails.
- Keep `docs/ARCHITECTURE.md` accurate, but do **not** duplicate a static file
  tree inside instruction files (Claude's current guidance: agents read the
  repo itself). Sourcegraph found code-index tooling helps only above
  ~400K LOC; at ~94k LOC Lance is better served by local grep — do not buy
  code-intelligence infrastructure on that evidence.

## 3.6 Recommended agent-facing layout (incremental target)

```
AGENTS.md                     ≤200 lines, commands + invariants
CLAUDE.md / copilot-instructions.md   thin pointers to AGENTS.md
.claude/rules/                path-scoped UI / Rust / store rules
.github/instructions/         optional path-scoped Copilot rules (applyTo globs)
.github/PULL_REQUEST_TEMPLATE.md      definition-of-done checklist
.github/CODEOWNERS            domain owners
src/components/features/      UI + math + tests colocated (new code)
src/lib/commands.ts           stable typed seam
src/store/index.ts            single store (constitution)
src/types/                    stable types, branded IDs
src-tauri/src/commands/       volatile IPC adapters
src-tauri/src/services/       shared logic (new)
docs/ARCHITECTURE.md          accurate architecture map
```

---

# 4. Static analysis & tooling landscape

## 4.1 Recommended minimal stack for Lance

**(verified 2026-11-25)** Maintenance check against npm/crates registries:
sonarjs 4.2.3, unicorn 80.0.0, import-x 4.18.1, dependency-cruiser 18.9.0,
jscpd 5.4.3, knip 6.48.0, ast-grep CLI 0.51.3 (pre-1.0 churn),
cargo-machete 0.10.1 — all active.

| Layer | Tool | Role | Mode |
|---|---|---|---|
| Local fast loop | TypeScript, ESLint, Vitest, Prettier, `npm run complexity`, `npm run audit:oss` | existing gates | error / fast |
| ESLint add-ons | `eslint-plugin-sonarjs` **already installed, `cognitive-complexity` error at 15**; optional `eslint-plugin-unicorn` (trim noisy rules), `eslint-plugin-import-x` (no-cycle warn, order) | readability + structure | cognitive: error now; others warn first |
| Size budgets | `max-lines` warn 300–400, `max-lines-per-function` warn 60 | prevent god files/methods | warn then error |
| Boundaries | **dependency-cruiser** (drop `madge`, last published 2024-08); keep the existing `scripts/check-boundaries.mjs` as the fast gate | no cycles, layer rules | CI baseline ratchet |
| Duplication | jscpd with baseline `--fail-on-new-clones` | new clones only | CI job |
| Dead code | knip with `--max-issues` budget | unused files/exports/deps | CI warn → error |
| Architecture lint | ast-grep **as an alternative to** `check-boundaries.mjs`, not an addition | ban raw `invoke`, `transition-all`, UI violations | fast CI |
| Rust | `excessive_nesting` + `too_many_lines` + `too_many_arguments` (thresholds set in `Clippy.toml`), `cargo fmt --check`, cargo-machete; **not** `cognitive_complexity` (restriction lint, upstream says it is not a measurement tool) | Rust quality | CI warn → error |
| Secrets | gitleaks or TruffleHog + GitHub push protection | prevent credential leaks | pre-commit + CI |
| Licenses | `cargo-deny` + npm `license-checker`; generated third-party NOTICE | SPDX allow-list, attribution | CI gate |
| SaaS (out of scope) | SonarCloud, CodeScene | PR decoration, hotspot/CodeHealth | not adopted; keep repo low-dependency |

## 4.2 Gates vs warnings

- **Hard fail:** typecheck, lint, tests, build, cargo check/test/fmt/clippy,
  npm/cargo audit (already in `security.yml`), xlsx integrity, complexity ≤15,
  cognitive ≤15, `audit:oss`, boundary check.
- **What `audit:oss` actually is (verified):** a regex grep over tracked files
  for proprietary strings and ~7 hardcoded secret patterns. It is **not** a
  dependency, license, or secret scanner. Do not describe it as one.
- **Missing gates to add:** real secret scanning (gitleaks/TruffleHog) and a
  dependency license policy (`cargo-deny`, npm license checker). SheetJS's
  `xlsx` tarball comes from `cdn.sheetjs.com` and is outside the npm registry
  audit path — document the exception.
- **Baseline ratchet:** new duplication, new cycles, knip issue budget — fail
  only on regressions, not on legacy debt.
- **Warn-only / scheduled:** coverage %, MI, type-aware ESLint (no SaaS analysis)
  (~30× slower), code-maat coupling, cargo coverage.
- Avoid global duplication % and global coverage % gates; they reward gaming.

## 4.3 Defer

- Oxlint/Biome migration — **not** a compatibility problem in 2026 (oxlint
  1.95.0, Biome 2.6.9 are stable); defer because neither adds rule coverage
  we actually want (sonarjs cognitive complexity, type-aware rules).
- Type-aware ESLint in the local loop (CI-only if adopted).
- Full cargo-deny license/ban policy until the dependency inventory is baselined.
- SonarCloud/CodeScene entirely — out of scope; no SaaS dependency.

---

# 5. Recommended target architecture for Lance

1. **Stable core:** `src/types/` (incl. branded IDs), `src/lib/commands.ts`,
   `src-tauri/src/error.rs`, DB schema/IPC contracts, theme tokens. Changes
   here require design discussion.
2. **Volatile edges:** screens, feature panels, copy, styles. Depend inward
   only. New features go in `src/components/features/` with their math and
   tests colocated.
3. **Single store:** keep the one `create()` in `src/store/index.ts`; domain
   actions stay there; slices only for meta/toasts/updater.
4. **Rust:** `lib.rs` is wiring only; `commands/*.rs` are thin IPC adapters;
   shared logic moves to a new `services/` module. Small focused traits only
   at real seams.
5. **Incrementality:** no big-bang move. Migrate one domain per PR, with
   characterization tests and the usual verify loop.

---

# 6. Prioritized principles we will enforce

**Tier 1 — machine-enforced, now**

1. Cyclomatic ≤15 per function (ESLint error; add `variant: "modified"`).
2. Cognitive complexity ≤15 TS (**already an ESLint error**). Rust: replace
   the misleading `cognitive_complexity` gate with `excessive_nesting` and
   `too_many_lines`, with explicit thresholds in `Clippy.toml`.
3. No empty catch blocks, no `any` without reason, no raw Tauri `invoke` in
   UI code. No real secrets in tracked files or history (rotate-first rule).
4. No dependency cycles; dependency direction stable → volatile.
5. `npm run verify` green before every PR; characterization test before
   refactoring legacy logic.
6. AGENTS.md ≤200 lines with commands, invariants and definition of done.

**Tier 2 — enforced in review/CI baseline**

7. Size budgets: function ≤60 lines (warn), file ≤400 lines (warn), params ≤4.
8. DRY = knowledge, not lines; wait for the third occurrence; name the domain
   concept before extracting.
9. One transformation per PR; no behavior change mixed with refactoring.
10. Vertical slices for new features; shared code only with ≥2 real consumers.
11. Load-bearing comments at point of use; stale comments are bugs.
12. Baseline ratchets for duplication, dead code and cycles.

**Tier 3 — cultural / scheduled**

13. Quarterly hotspot review (churn × complexity) and modular-mirage audit.
14. ADRs for decisions that outlive a PR; link from code.
15. Agent instruction staleness audit; update docs in the same PR as conventions.

---

# 7. Explicit concessions (pragmatic trade-offs)

- **No wholesale directory restructure.** Existing role-based folders stay;
  domain folders are introduced incrementally for *new* work. The migration
  cost and review risk outweigh theoretical purity.
- **Function length is a warning, not a hard error.** React/JSX and table-driven
  code legitimately exceed 60 lines; hard gating rewards meaningless splits.
- **No dependency-injection framework.** Plain functions and modules; an
  interface is added only with a real second implementation.
- **No class hierarchies for LSP/OCP.** Structural typing and discriminated
  unions are enough.
- **Keep the single Zustand store** even though domain slices are tempting;
  the constitution explicitly forbids splitting it.
- **Keep `AGENTS.md` short and cross-reference** rather than duplicating rules
  into CLAUDE.md/Copilot files.
- **No hard quality gates on MI, Halstead, global duplication or global
  coverage.** Use trends, baselines and hotspots.
- **No SaaS analysis at all.** SonarCloud/CodeScene are out of scope so the
  repository stays low-dependency and self-contained.
- **Preserve behavior even when it looks odd.** Characterization tests pin
  current behavior; "fixing" discovered bugs is a separate, explicitly
  approved change.
- **Accept known AI smells in untouched legacy files** until a hotspot or a
  task touches them; refactor on demand, not all at once.

---

# 8. Decisions recorded (reviewed and corrected 2026-11-25)

1. **Cognitive complexity: error, not warn-first (superseded).** The first
   draft planned warn-first, but the backlog was burned down and the rule is
   now an ESLint error at 15. Keep cyclomatic complexity at error 15.
2. **Feature folders: new code only.** `src/components/features/` is the
   target for new work; existing files migrate opportunistically when a task
   already touches them, never in a bulk move. The earlier
   `src/features/<domain>/` target was retired as a dead rule.
3. **Rust Clippy (corrected): replace `cognitive_complexity`** — it is a
   `restriction` lint that upstream says is not a measurement tool. Use
   `excessive_nesting` and `too_many_lines`, plus `too_many_arguments` and
   `type_complexity`, with thresholds configured explicitly in
   `src-tauri/Clippy.toml` (currently cognitive 20, arguments 7,
   type-complexity 250, no too-many-lines setting). Delete or align the stale
   root `Clippy.toml` (30). Keep `cargo fmt --check`.
4. **License and contribution law: keep MIT; no CLA, no dual licensing.**
   DCO is the optional lightweight provenance mechanism if contributors grow.
5. **Secret scanning + license policy are the remaining legal/hygiene work:**
   add gitleaks-style scanning and `cargo-deny`/npm license checking; maintain
   a rotate-first incident procedure; enable GitHub private vulnerability
   reporting; add SUPPORT.md.
6. **SonarCloud and CodeScene are out of scope.** The repository intentionally
   stays low-dependency: no SaaS analysis, no extra GitHub apps, no new tokens.
   SonarCloud (hosted bugs/smells/duplication/coverage with PR decoration) and
   CodeScene (CodeHealth, churn×complexity hotspots, change coupling) are
   useful but add external services and configuration; revisit only if a
   concrete need appears. Their capabilities are documented here for context
   and are not part of the tooling stack we will adopt.

---

# 9. Iteration 2 refresh (2026-11-25) — remaining gaps and decisions

A second research pass re-checked the transformed repository against late-2026
guidance. Only new or corrected findings are recorded here; earlier decisions
stand unless explicitly superseded.

## 9.1 Open-source readiness

| Item | Decision |
|---|---|
| Keep MIT, no CLA/dual licensing | **Already fine** — unchanged |
| GitHub Secret Protection + push protection + validity checks | **ADD / verify in settings.** Free on public repos; complements gitleaks with validity checks and push-time blocking. API check found all three **disabled**; enable in Phase 3 (Dependabot security updates enabled alongside). |
| GitHub Discussions + private vulnerability reporting | **Already enabled** (API-verified 2026-11-26), so the issue-template/security links are live |
| Network/privacy disclosure | **ADD** one short paragraph naming the unauthenticated `api.github.com` release-notes GET, the silent signed-updater check, and the loopback-only portal with capability URL token |
| SPDX IDs in new source files | **ADD gradually** (one line + CONTRIBUTING note); full REUSE compliance is overkill for a single-license MIT app |
| FUNDING.yml, SBOM, npm provenance, signed git commits, contributor-ladder doc | **SKIP** — no funding channel, no npm publish, signed updater artifacts already cover integrity, GOVERNANCE.md already defines the ladder |
| History rewrite / tag deletion | **SKIP** — owner decision to keep tags; no live secrets |

## 9.2 Code quality and complexity

- **Fix a no-op gate:** `src-tauri/Clippy.toml` sets
  `excessive-nesting-threshold = 0`; Clippy's lint returns immediately at 0,
  so `-D clippy::excessive_nesting` can never fire. Set a real threshold
  (2–3) with scoped `#[allow]` ratchets where needed.
- Reconcile Rust thresholds with STANDARDS: Clippy currently enforces 100
  lines / 7 args; the 60-line / 4-param figures are review targets, not gates.
  Make the standard say so explicitly rather than silently promising more.
- **Add narrow tooling:** jscpd advisory with `minTokens` 70–100 + baseline
  (targets the ~150 hand-rolled trackers), knip with an issue budget, and one
  dependency-cruiser `no-circular` CI rule. All with baselines; none as hard
  global gates.
- **Skip** Maintainability Index as a gate (LOC-dominated, no actionable signal).
- **Add** CI-only Playwright retries (2) with existing trace-on-failure;
  quarantine with `test.fixme()` + issue link. Do not treat retries as a fix.
- **Skip** Stryker mutation testing as a gate; if adopted at all, narrow to pure
  math on a scheduled warn-only job.
- Structural risk remains the hand-rolled feature components and high-fan-in
  `shared.tsx` seams; migrate opportunistically, never in a bulk rewrite.

## 9.3 Agent-facing patterns and tooling

- **ADD 2–3 ADRs** under `docs/adr/` (single Zustand store, typed command
  registry, MIT/no-history-rewrite). GOVERNANCE.md and Tier 3 already promise
  ADRs; the directory does not exist.
- **FIX** the stale Copilot documentation URL in §3.3/§3.6 of this report.
- **Clarify store accessors:** `src/store/toastStore.ts` and
  `updaterStore.ts` are typed accessors over the single store, **not** second
  stores. Name them as such in AGENTS.md/STANDARDS.md to prevent agents
  "fixing" a non-problem. Keep them (17+ importers).
- **SKIP** duplicated `.claude/rules/`, `.github/instructions/`, skills and
  hooks: 2026 evidence shows instruction duplication creates drift without a
  measured correctness gain. Revisit only after a repeated, observed failure.
- **SKIP** LSP plugins as repo dependencies; keep grep + typecheck.
- Repeated basenames (8 `index.ts`, generic `shared.tsx`) are mitigated by the
  existing local map in `copilot-instructions.md`; domain-prefix only on touch.
- **Watch** gitleaks 8.25+ allowlist key rename (`[allowlist]` →
  `[[allowlists]]`); pinned at 8.24.3 today. Note added to `gitleaks.toml`.
- **Correction:** signed git commits are **already satisfied** (20/20 recent
  commits verified), so this is not a "skip for burden" item.

## 9.4 Sources added

- https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/excessive_nesting.rs
- https://doc.rust-lang.org/clippy/lint_configuration.html
- https://www.emmanueldemey.dev/blog/2026-11-12-jscpd-duplicate-code-detection/
- https://rev-dep.com/docs/comparison-with-other-tools/overview
- https://arxiv.org/abs/2508.14727 · https://arxiv.org/abs/2607.22880
- https://aaif.io/blog/writing-an-effective-agents-md
- https://www.anthropic.com/research/effective-context-engineering-for-ai-agents
- https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation
- https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning
- https://spdx.dev/learn/handling-license-info/ · https://reuse.software/spec-3.3/
- https://docs.github.com/en/copilot/concepts/prompting-and-context/custom-instructions

---

# 10. Iteration 3 refresh (2026-11-26) — final gap pass

A third research pass checked only what remained after iteration 2. The repo
is at a deliberate steady state; most earlier concessions remain correct.

## 10.1 Open-source readiness

| Item | Decision |
|---|---|
| GitHub Advanced Security / secret-scanning validity checks | **SKIP** — validity checks require an org-owned repo on Team/Enterprise with Secret Protection; the free public-repo secret scanning + push protection + pinned gitleaks stack is sufficient |
| SBOM / FUNDING.yml / npm provenance | **SKIP** — no funding channel, `private: true`, no npm publish; `THIRD_PARTY_NOTICES.md` + license gates cover attribution |
| Signed git commits | **ALREADY FINE** — recent commits verified |
| Persisted network-checks preference | **ADD** — one default-on localStorage preference gating both the release-notes GET and updater check, with a Settings switch and doc updates |
| Stale "v2 cloud roadmap" in docs/SECURITY.md | **ADD (doc fix)** — remove Supabase/Postgres/GDPR/RLS roadmap that contradicts non-goals |
| AI-assisted-code disclosure | **ADD (convention only)** — recommend `Assisted-by:` trailer in CONTRIBUTING and a PR checkbox; no CI gate |

## 10.2 Code quality

- **ADD:** zero-dependency ratchet that fails on any **new** hand-rolled CRUD
  component in `src/components/features/` not using `RecordTracker`, with a
  committed allowlist for the ~138 existing files. No bulk migration.
- **ADD:** golden DB-schema test in the existing in-memory Rust migration test
  (`sqlite_master` + key `PRAGMA table_info`) to protect on-disk compatibility.
- **ADD (narrow):** property-based tests for pure pricing/forecast math with
  `fast-check` (antisymmetry, non-negativity, bounded occurrences, currency
  round-trip, monotonicity). One new devDependency, no gate on score.
- **SKIP:** jscpd (overlaps the new ratchet + SonarJS duplicate rule), co-change
  tooling (Python/SaaS, low-dependency stance), Tauri IPC contract tests
  (needs cross-language schema), Stryker mutation testing (disproportionate).
- **ALREADY FINE:** fast-refresh warnings, Vite chunk warnings, no MI gate.

## 10.3 Agent-facing patterns and tooling

- **P1:** pinned `actions/checkout@v4` / `setup-node@v4` SHAs declare `node20`,
  which GitHub removed from hosted runners 2026-09-23. Bump to pinned v6.1.0 /
  v7.1.0 SHAs (node24), keeping `node-version: 22` inputs.
- **ADD:** explicit Definition of Done in AGENTS.md §7 and evidence checkboxes
  in the PR template — both already promised by STANDARDS/RESEARCH_REPORT.
- **ADD (doc fixes):** CONTRIBUTING/DEVELOPMENT still say E2E is not in CI and
  require a manual preview; fix. Fix stale HANDOFF anchor. Replace drifting
  tracker counts with a pointer to `registry.ts`.
- **SKIP:** generated component index, code-level ADR links, path-scoped
  instruction duplicates, gitleaks CLI bump. The repo map, ADR index and
  hand-curated `registry.ts` are sufficient per 2026 AAIF/Anthropic evidence.

## 10.4 Sources added

- https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- https://docs.github.com/en/enterprise-cloud@latest/code-security/how-tos/secure-your-secrets/customize-leak-detection/enable-validity-checks
- https://keepassxc.org/privacy/ · https://gdpr-info.eu/art-25-gdpr/
- https://fast-check.dev/docs/introduction/what-is-property-based-testing/
- https://allthingsopen.org/articles/open-source-ai-contributions-assisted-by-git-trailer-standard
- https://trustedoss.github.io/en/ai-coding/legal-considerations
- https://aaif.io/blog/writing-an-effective-agents-md
- https://www.anthropic.com/research/effective-context-engineering-for-ai-agents

---

# Sources

**Metrics:** https://sonarsource.com/resources/cognitive-complexity ·
https://docs.scitools.com/metrics/CognitiveComplexity.html ·
https://eslint.org/docs/latest/rules/complexity,max-depth,max-params,max-lines-per-function ·
https://learn.microsoft.com/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning ·
https://en.wikipedia.org/wiki/Software_package_metrics ·
https://software-engineering-metrics.github.io · https://arxiv.org/abs/2605.02741 ·
https://arxiv.org/abs/2510.03029 · https://arxiv.org/abs/2307.03172 ·
https://doc.rust-lang.org/clippy/lint_configuration.html (defaults: 25 / 100 / 7 / 250) ·
https://clippy.rust-lang.org/stable/ (cognitive_complexity is restriction) ·
https://eslint.org/docs/latest/rules/complexity (`variant: "modified"`)

**Principles:** https://khalilstemmler.com/articles/solid-principles/solid-typescript/ ·
https://strapi.io/blog/solid-design-principles-javascript-typescript-guide ·
https://www.jimmybogard.com/vertical-slice-architecture/ · https://cratis.io/arc/vertical-slices ·
https://abeldebruijn.nl/posts/refactoring-ai-code ·
https://caiopizzol.com/writing/comments-matter-when-the-code-does-not ·
https://raw.githubusercontent.com/apollographql/skills/main/skills/rust-best-practices/references/chapter_08.md ·
https://arxiv.org/html/2611.10545v2

**Agent patterns:** https://agents.md/ · https://code.claude.com/docs/en/best-practices ·
https://code.claude.com/docs/en/memory (source of the ≤200-line guidance) ·
https://docs.github.com/en/copilot/concepts/prompting-and-context/custom-instructions ·
https://sourcegraph.com/blog/why-coding-agents-fail-large-codebases ·
https://zzet.org/gortex/why-ai-coding-agents-fail-large-codebases/ ·
https://arxiv.org/abs/2307.03172 ·
https://learn.microsoft.com/en-us/agents/architecture/multi-agent-orchestration-patterns

**Tooling:** https://github.com/SonarSource/SonarJS (sonarjs v4.2.3; standalone repo archived) ·
https://registry.npmjs.org/eslint-plugin-sonarjs/latest ·
https://github.com/sverweij/dependency-cruiser · https://jscpd.dev/guides/ci ·
https://knip.dev/guides/adopt-gradually · https://ast-grep.github.io/guide/project/lint-rule ·
https://embarkstudios.github.io/cargo-deny/ · https://github.com/EmbarkStudios/cargo-about ·
https://gitleaks.io/ · https://trufflesecurity.com/trufflehog ·
https://finnnannestad.com/blog/linting-and-formatting ·
https://docs.sonarsource.com/sonarqube-cloud · https://codescene.com/pricing

**Open-source readiness:** https://bestpractices.linuxfoundation.org/ip/contribution-mechanisms-cla.html ·
https://bestpractices.linuxfoundation.org/ip/contribution-mechanisms-dco.html ·
https://opensource.org/education/whats-dual-licensing ·
https://opensource.google/documentation/reference/using/agpl-policy ·
https://opensource.guide/leadership-and-governance ·
https://www.contributor-covenant.org/ ·
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository ·
https://github.com/newren/git-filter-repo · https://rtyley.github.io/bfg-repo-cleaner/
