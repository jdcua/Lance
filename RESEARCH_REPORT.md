# Research Report — Human + Agent Readable Codebase

**Phase 0 deliverable.** Research only: no application code was changed. This
report informs the standards, audit and refactoring plan for the Lance
repository (Tauri 2 + React 18 + TypeScript + Rust desktop app, ~578 tracked
files, ~94k LOC frontend).

Research date: 2026-11-25. Sources are 2025–2026 guidance and empirical work,
listed at the end.

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
   seconds-to-minutes; heavy tools (jscpd, knip, Sonar, coverage) belong in CI
   with baseline ratchets, not in the local loop.
6. **Target architecture: domain-oriented vertical slices on top of stable
   seams** (single Zustand store, typed command registry, Rust command modules
   with shared logic in a services layer). Do not reorganize the whole tree in
   one pass; migrate one domain at a time.

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
- **Recommendation:** warn at 10, error at 15 (Lance already does error at
  15); allow up to 20 only for top-level dispatchers/route handlers.

## 1.2 Cognitive complexity (SonarSource)

- Scores understandability: +1 per control structure, +1 per nesting level,
  +1 for control-flow breaks and mixed logical-operator sequences. Flat
  `switch` cases cost 1 total, not N.
- Better aligned with human (and agent) perception than cyclomatic complexity
  because it penalizes nesting — the real driver of comprehension cost.
- Thresholds: SonarQube default 15 (JS/TS/Java), Clippy default 25.
- Blind spots: proprietary definition; local-function refactoring can inflate
  scores; thresholds are empirical, not derived.
- **Recommendation:** 15 for TS, 20 for Rust. Add `eslint-plugin-sonarjs`
  (`cognitive-complexity`, warn-first) and Clippy `cognitive_complexity`.

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

| Metric | Recommended ceiling | Enforcement |
|---|---|---|
| Nesting depth | 3 (2 in JSX-heavy components) | ESLint `max-depth` |
| Parameters | 4 (use a parameter object beyond) | ESLint `max-params` |
| Function length | 40 logical lines, hard 60 | ESLint `max-lines-per-function` |
| Component length | 150–200 lines | review / `max-lines` warn |
| File length (TS) | 400 soft, 800 hard | ESLint `max-lines` warn |
| File length (Rust) | 300–500 | clippy / review |

These are ceilings, not targets: a long cohesive file is better than a short
incoherent set of files.

## 1.6 Duplication / clone detection

- Clone types: exact, renamed identifiers, near-miss, semantic.
- Thresholds: <3% duplicated lines in new code, <5% on legacy; refactor any
  clone ≥10 lines or ≥6 statements.
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
- **LLM smell taxonomy** (arXiv 2605.02741, 580 repos / 3M methods): Long
  Method, God Class, Too Many Branches, Redundant Implementation, Modular
  Mirage, and a Volume-Quality Inverse Law (TLoC predicts architectural smell
  with ρ≈0.94). Functional correctness is decoupled from structural quality.
- **Recommended metric gate set:** cyclomatic ≤15 (error), cognitive ≤15
  (warn → error), no cycles, no new duplication beyond baseline, hotspot top
  5% reviewed quarterly.

**Threshold table (recommended for Lance):**

| Metric | Threshold | Tool |
|---|---|---|
| Cyclomatic | warn 10, error 15; 20 for dispatchers | ESLint `complexity` |
| Cognitive | 15 TS / 20 Rust | `eslint-plugin-sonarjs`, Clippy |
| MI | file-level alert <20 | Sonar / MI script |
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
  mechanical renames that preserve bad structure.
- Protocol: characterization test first → one transformation per commit →
  verify → measure metric change → review.

---

# 3. Agent-friendly codebase patterns

## 3.1 Edit locality and naming

- The agent's failure mode is *partial completion*: changing 2 of 7 affected
  files. Colocation by change reason is the mitigation.
- One canonical name per concept; file name = primary export name; no `New`,
  `Old`, `V2`, `utils.ts`, `helpers.ts`.
- Directory names should be domain nouns. New code goes in
  `src/features/<domain>/` with colocated tests; keep `src/types/` stable.
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
- Keep root ≤200 lines; nested instruction files are path-scoped
  (`.claude/rules/ui-standards.md` for `src/**/*.tsx`, `src-tauri/AGENTS.md`
  for Rust). Keep thin pointer files for compatibility, not three copies.
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

- Large/messy codebases cause: lost-in-codebase, wrong-file edits, partial
  completion, tool thrashing, context overflow/rot, statelessness.
- Mitigations: small files, unique names, typed seams, architecture map,
  subagents for exploration, targeted reads instead of reading directories
  wholesale, short AGENTS.md, CI gates as deterministic guardrails.
- A compact generated repo map (file tree + module list) gives structure
  cheaply; keep `docs/ARCHITECTURE.md` accurate.

## 3.6 Recommended agent-facing layout (incremental target)

```
AGENTS.md                     ≤200 lines, commands + invariants
CLAUDE.md / copilot-instructions.md   thin pointers to AGENTS.md
.claude/rules/                path-scoped UI / Rust / store rules
.github/PULL_REQUEST_TEMPLATE.md      definition-of-done checklist
.github/CODEOWNERS            domain owners
src/features/<domain>/        UI + math + tests colocated (new code)
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

| Layer | Tool | Role | Mode |
|---|---|---|---|
| Local fast loop | TypeScript, ESLint, Vitest, Prettier, `npm run complexity`, `npm run audit:oss` | existing gates | error / fast |
| ESLint add-ons | `eslint-plugin-sonarjs` (cognitive complexity, disable `no-commented-code`), `eslint-plugin-unicorn` (trim noisy rules), `eslint-plugin-import-x` (no-cycle warn, order) | readability + structure | warn first |
| Size budgets | `max-lines` warn 300–400, `max-lines-per-function` warn 60 | prevent god files/methods | warn then error |
| Boundaries | dependency-cruiser or `madge --circular` | no cycles, layer rules | CI baseline ratchet |
| Duplication | jscpd with baseline `--fail-on-new-clones` | new clones only | CI job |
| Dead code | knip with `--max-issues` budget | unused files/exports/deps | CI warn → error |
| Architecture lint | ast-grep (`sgconfig.yml`) | ban raw `invoke`, `transition-all`, UI violations | fast CI |
| Rust | clippy lints (`cognitive_complexity`, `too_many_lines`, `too_many_arguments`), `cargo fmt --check`, cargo-machete | Rust quality | CI warn → error |
| Optional SaaS | SonarQube Cloud OSS, CodeScene OSS | PR decoration, hotspot/CodeHealth | pilot, not gate |

## 4.2 Gates vs warnings

- **Hard fail:** typecheck, lint, tests, build, cargo check/test/fmt/clippy,
  npm/cargo audit, xlsx integrity, complexity ≤15, audit:oss.
- **Baseline ratchet:** new duplication, new cycles, knip issue budget — fail
  only on regressions, not on legacy debt.
- **Warn-only / scheduled:** coverage %, MI, Sonar/CodeScene, type-aware ESLint
  (~30× slower), code-maat coupling, cargo coverage.
- Avoid global duplication % and global coverage % gates; they reward gaming.

## 4.3 Defer

- Oxlint/Biome migration until TypeScript/toolchain compatibility allows.
- Type-aware ESLint in the local loop (CI-only if adopted).
- cargo-deny full license/ban policy after cargo-machete baseline.
- SonarCloud/CodeScene hard gates until a baseline exists.

---

# 5. Recommended target architecture for Lance

1. **Stable core:** `src/types/` (incl. branded IDs), `src/lib/commands.ts`,
   `src-tauri/src/error.rs`, DB schema/IPC contracts, theme tokens. Changes
   here require design discussion.
2. **Volatile edges:** screens, feature panels, copy, styles. Depend inward
   only. New features go in domain folders (`src/features/invoices/`, etc.)
   with their math and tests colocated.
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

1. Cyclomatic ≤15 per function (ESLint error).
2. Cognitive complexity ≤15 TS / ≤20 Rust (warn first, then error).
3. No empty catch blocks, no `any` without reason, no raw Tauri `invoke` in
   UI code.
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
- **No heavy SaaS analysis in the local loop.** Sonar/CodeScene are optional
  PR-decoration pilots, not required infrastructure.
- **Preserve behavior even when it looks odd.** Characterization tests pin
  current behavior; "fixing" discovered bugs is a separate, explicitly
  approved change.
- **Accept known AI smells in untouched legacy files** until a hotspot or a
  task touches them; refactor on demand, not all at once.

---

# 8. Review questions before Phase 1

1. Do we adopt cognitive complexity as a hard error immediately, or warn-first
   with a baseline? (Recommended: warn-first, then error.)
2. Do we permit `src/features/<domain>/` for new code only, or begin migrating
   one existing domain in Phase 3? (Recommended: new code only in this pass.)
3. Which Rust clippy lints become `-D warnings` vs warn-only in the first PR?
4. Is the optional SonarCloud/CodeScene pilot in scope for this mission, or
   deferred? (Recommended: deferred.)

---

# Sources

**Metrics:** https://sonarsource.com/resources/cognitive-complexity ·
https://docs.scitools.com/metrics/CognitiveComplexity.html ·
https://eslint.org/docs/latest/rules/complexity,max-depth,max-params,max-lines-per-function ·
https://learn.microsoft.com/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning ·
https://en.wikipedia.org/wiki/Software_package_metrics ·
https://software-engineering-metrics.github.io · https://arxiv.org/html/2605.02741 ·
https://arxiv.org/pdf/2510.03029

**Principles:** https://khalilstemmler.com/articles/solid-principles/solid-typescript/ ·
https://strapi.io/blog/solid-design-principles-javascript-typescript-guide ·
https://www.jimmybogard.com/vertical-slice-architecture/ · https://cratis.io/arc/vertical-slices ·
https://abeldebruijn.nl/posts/refactoring-ai-code ·
https://caiopizzol.com/writing/comments-matter-when-the-code-does-not ·
https://raw.githubusercontent.com/apollographql/skills/main/skills/rust-best-practices/references/chapter_08.md ·
https://arxiv.org/html/2611.10545v2

**Agent patterns:** https://agents.md/ · https://code.claude.com/docs/en/best-practices ·
https://code.claude.com/docs/en/memory · https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot ·
https://sourcegraph.com/blog/why-coding-agents-fail-large-codebases ·
https://zzet.org/gortex/why-ai-coding-agents-fail-large-codebases/ ·
https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf ·
https://learn.microsoft.com/en-us/agents/architecture/multi-agent-orchestration-patterns

**Tooling:** https://github.com/sverweij/dependency-cruiser · https://jscpd.dev/guides/ci ·
https://knip.dev/guides/adopt-gradually · https://ast-grep.github.io/guide/project/lint-rule ·
https://doc.rust-lang.org/clippy/lint_configuration.html ·
https://finnnannestad.com/blog/linting-and-formatting ·
https://docs.sonarsource.com/sonarqube-cloud · https://codescene.com/pricing
