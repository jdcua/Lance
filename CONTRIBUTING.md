# Contributing to Lance

Lance is open source under the MIT license. Contributions of code, docs, tests,
bug reports and design fixes are welcome — no prior context required.

## Get set up

Requirements: Node.js 22+, Rust stable, and the Tauri 2 system libraries for
your platform ([prerequisites](https://v2.tauri.app/start/prerequisites/)).
No account, API key or environment variable is needed.

```bash
git clone https://github.com/jdcua/Lance.git
cd Lance
npm install
npm run doctor      # verifies your local toolchain
npm run tauri dev
```

`npm run doctor` is read-only and checks Node, npm, Rust, installed npm
dependencies and the Tauri CLI. It does **not** check the Tauri OS libraries
(listed above); on Linux, install those separately.

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
npm run verify      # typecheck + lint + tests + build + OSS audit + strict boundaries
npm run complexity  # cyclomatic/cognitive offenders (optional but recommended)
```

`npm run audit:oss` rejects stray secrets, personal paths and junk files; the
strict boundary check enforces the architecture rules in `AGENTS.md`. CI runs
typecheck, lint, tests, build, Rust check/fmt/clippy/test, npm and Cargo
audits, and an xlsx integrity check — it does **not** yet run `audit:oss`, the
strict boundary check or `npm run complexity`, so run them locally as above.
All gates must pass.

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

## For AI agents and automated contributors

- `AGENTS.md` is the canonical rulebook; `.github/copilot-instructions.md`
  and `CLAUDE.md` point to it. Do not duplicate its rules in new files.
- [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) describes the PR loop, how to
  add workflows safely, and what to include in the final report.
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

A weekly workflow opens an issue with outdated npm and Cargo dependencies for
manual review. Security issues should be reported privately via
[GitHub security advisories](https://github.com/jdcua/Lance/security/advisories/new),
not in public issues.
