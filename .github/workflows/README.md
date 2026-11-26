# Workflows

| File | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push and PR to `main` | Typecheck, lint, Vitest, Rust check and tests, Vite build |
| `security.yml` | Schedule and PR | npm audit, cargo audit, xlsx integrity pin |
| `deps.yml` | Weekly schedule | Opens one issue listing outdated npm and Cargo dependencies |
| `release.yml` | `v*` tags | Builds signed installers for macOS, Windows and Linux; publishes a GitHub release |
| `scheduled-release.yml` | Manual dispatch | Creates a release tag from `main` |
| `community.yml` | New issues and PRs | Welcomes first-time contributors and adds path-based labels |

`main` requires the six CI checks to pass and disallows force pushes. See
`CONTRIBUTING.md` for the contribution flow.

## Adding a workflow

- Keep `permissions` minimal; default to `contents: read`.
- Pin third-party actions to a full commit SHA with a version comment.
- Do not run code from a fork in `pull_request_target`. Jobs that only comment
  on an issue or PR should not check out any code.
- Never add a new secret for a normal contribution; release signing is the only
  credential used here.
- Validate the YAML locally, then open a PR. Workflow files are not linted by
  the lint job, but every workflow runs on its own triggers; review the Actions
  tab after merge. The `e2e` job starts the built preview automatically via
  Playwright's `webServer` config and is not a required check yet.
