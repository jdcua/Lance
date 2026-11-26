# Contributing to Lance

Lance is open source under the MIT license. Contributions of code, docs, tests,
bug reports and design fixes are welcome — no prior context required.

By submitting a pull request, you agree that your contribution is licensed under
the MIT License, and that you have the right to license it under those terms. No
CLA or DCO is required. New source files should start with
`SPDX-License-Identifier: MIT` (`//` in TS/TSX and Rust files, `#` in YAML);
existing files are not retrofitted. JSON cannot carry comments.

## Get set up

Requirements: Node.js 22+, Rust stable, and the Tauri 2 system libraries for
your platform ([prerequisites](https://v2.tauri.app/start/prerequisites/)).
No account, API key or environment variable is needed.

```bash
git clone https://github.com/jdcua/Lance.git && cd Lance
npm ci                 # exact lockfile install (what CI uses)
git config core.hooksPath .githooks   # opt in to the gitleaks pre-commit hook
npm run doctor         # read-only toolchain check; does not check OS libs
npm run verify         # typecheck + lint + test + build + audit:oss + licenses + boundaries
npm run tauri dev      # requires Tauri 2 OS libraries on Linux
```

`npm run doctor` is read-only and checks Node, npm, Rust, installed npm
dependencies and the Tauri CLI. It does **not** check the Tauri OS libraries;
on Linux, install `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
patchelf` separately. After setup, see [Browser E2E tests](#browser-e2e-tests)
for the Playwright suite, which also runs in CI.

## Find something to work on

- [docs/ROADMAP.md](docs/ROADMAP.md) lists good first contributions and areas
  that need owners.
- Issues labeled `good first issue` are scoped for a first PR.
- For anything larger, open an issue first so we can agree on the approach.

## Make a change

1. Fork the repo (or ask to be added as a collaborator) and create a branch:
   `git checkout -b fix/invoice-aging`.
2. Keep the change small and focused on one behavior. If you touch five or
   more files for one feature, stop and check the design with an issue.
3. Follow the codebase rules in [AGENTS.md](AGENTS.md). The short version: one
   Zustand store, command registry for app-wide actions, `RecordTracker` for
   new entity screens, glass chrome for UI chrome, near-solid surfaces for
   content, no gradients/glows/emoji icons. Keep new functions at cyclomatic
   complexity <= 15 (enforced by ESLint); extract helpers rather than growing
   a branch tree.
4. Add or update a test that describes the behavior, not the implementation.
5. Run the full check suite before pushing:

```bash
npm run verify                  # typecheck + lint + tests + build + audit:oss + check:licenses + format:check + strict boundaries
npm run complexity -- --strict  # cyclomatic/cognitive offenders (CI gate)
npm run check:trackers          # no new hand-rolled CRUD outside RecordTracker (CI gate)
npm run format:check            # Prettier check (in verify and CI); `npm run format` writes
```

`npm run audit:oss` rejects stray secrets, personal paths and junk files; the
strict boundary check enforces the architecture rules in `AGENTS.md`. CI runs
typecheck, lint, tests, build, Rust check/fmt/clippy/test, npm and Cargo audits,
xlsx integrity, `audit:oss`, `check:licenses`, `format:check`,
`complexity -- --strict`, `check:trackers` and strict boundaries
(`.github/workflows/ci.yml:48-61`), so run the same gates locally before
pushing. All gates must pass.

`npm run check:trackers` is a zero-dependency ratchet: it fails on any new
hand-rolled CRUD component under `src/components/features/` that does not use
`RecordTracker`. Existing offenders are enumerated in
`scripts/tracker-baseline.json`; CI runs the same gate
(`.github/workflows/ci.yml:56-57`). The baseline excludes `*.test.*` files.

Database schema compatibility is protected by a golden fixture at
`src-tauri/tests/schema_golden.txt`. If you intentionally change the schema,
regenerate it from `src-tauri/` with
`UPDATE_GOLDEN=1 cargo test --lib db::tests::schema_golden` and commit the
updated fixture; a plain `cargo test --lib` fails on drift with that command in
its message. Pure forecast and currency math is additionally covered by
`fast-check` properties in `src/lib/*.property.test.ts` (e.g. conversion
reciprocity, forecast telescoping, scenario monotonicity). A failed property
prints a replayable seed — keep it in the bug report or test.

## Browser E2E tests

Browser E2E tests run in CI in the `e2e` job of `.github/workflows/ci.yml` on
pull requests and pushes to `main`; they are separate from `npm run verify`.
`playwright.config.ts` starts the built preview on port 4173 automatically, so
no manually started server is needed. To run the same suite locally:

```bash
npm run build                       # CI builds before Playwright
npx playwright install chromium     # first time only
npx playwright test                 # 18 specs / 65 tests
```

The `e2e` job is informational, not a required branch-protection check.

## Open a pull request

- Use the PR template and explain **what changed and why**. Link the issue.
- Include a screenshot or short recording for visible UI changes.
- Keep commits clean and descriptive:

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `test:` | Tests only |
| `chore:` | Maintenance, dependencies, tooling |
| `security:` | Security fix |

- We squash-merge PRs into `main`, so your commit messages do not need to tell
  a long story — the PR description does.
- A maintainer reviews within a few days. Review comments are about the code,
  never the person. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Architecture orientation

- [README.md](README.md#how-it-works) — what the app is and why.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layers, routes, tables, engines.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — commands and project tree.
- [docs/SECURITY.md](docs/SECURITY.md) — local-first threat model.
- [docs/adr/README.md](docs/adr/README.md) — ADR index: single Zustand store,
  typed command registry, MIT license and pre-OSS history decision.

## For AI agents and automated contributors

- `AGENTS.md` is the canonical rulebook; `.github/copilot-instructions.md`
  and `CLAUDE.md` point to it. Do not duplicate its rules in new files.
- [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) describes the PR loop, how to
  add workflows safely, and what to include in the final report.
- Disclose AI assistance with an `Assisted-by:` trailer in the PR description or squash commit; this is a convention, not a CI gate.
- Start with `npm run doctor`, then `npm run verify` after every change.
- Prefer one small PR per task. Never change core business logic to satisfy a
  failing test, never skip tests, and never commit secrets or personal paths.
- Report what you deleted, changed, and deliberately left untouched.

## Maintainer-only tasks

Releases are tagged from `main`:

```bash
node scripts/bump-version.cjs 1.2.0
git add -A && git commit -m "chore: bump version to v1.2.0"
git tag -a v1.2.0 -m "<changelog summary>"
git push origin main --tags
```

The `.github/workflows/deps.yml` workflow opens a weekly issue with outdated
npm and Cargo dependencies for manual review; it replaces Dependabot *version*
updates, not Dependabot *security alerts and updates*, which are enabled in repo
settings without a config file. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#dependency-updates).

Pre-OSS tags (`v0.9.0`–`v0.9.9-5`, `v1.1.0`–`v1.2.6`) are deliberately retained
per [HANDOFF.md](HANDOFF.md#pre-oss-tagged-history--owner-decision):
a full scan found no live credentials and a rewrite would break SHAs, tags,
forks and CI pins. Do not delete them.

Security issues should be reported privately via
[GitHub security advisories](https://github.com/jdcua/Lance/security/advisories/new),
not in public issues.
