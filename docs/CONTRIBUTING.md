# Contributing to Lance

## Commit convention

All commits to `main` must follow this convention:

| Prefix | Description | Version bump |
|--------|-------------|-------------|
| `feat:` | New feature | Minor |
| `fix:` | Bug fix | Patch |
| `chore:` | Maintenance, deps, docs | None |
| `security:` | Security fix | Patch |
| `breaking:` | Breaking change | Major |

Examples:
```
feat: add archetype-specific dashboard widgets
fix: correct invoice aging calculation for partial payments
chore: update tauri dependencies to v2.1
security: sanitize CSV import against formula injection
breaking: migrate auth tokens to v2 format
```

## Branch protection

The `main` branch is protected. To configure (repo admin only):

1. Go to https://github.com/jdcua/lance/settings/branches
2. Add rule for `main`:
   - **Require a pull request before merging**: enable, require 1 approval
   - **Require status checks to pass before merging**: enable
     - `Typecheck`
     - `Lint`
     - `Rust (check + clippy + fmt)`
   - **Require branches to be up to date before merging**: enable
   - **Do not allow bypassing the above settings**: enable (admins included)

This guarantees nothing broken can ever land on `main`. Release tags on `main` are always from clean code.

## CI pipeline

On every push and PR to `main`, three checks run:

1. **Typecheck**: `npx tsc --noEmit` ensures no TypeScript errors
2. **Lint**: `npx eslint src/ --ext .ts,.tsx --max-warnings 0`
3. **Rust**: `cargo check`, `cargo clippy -- -D warnings`, `cargo fmt --check`

All three must pass before merging. See `.github/workflows/ci.yml`.

## Release process

See `docs/RELEASE.md` for the full release workflow. Summary:

```
node scripts/bump-version.cjs 1.2.0
git add -A
git commit -m "chore: bump version to v1.2.0"
git tag -a v1.2.0 -m "<changelog summary>"
git push origin main --tags
```

The release workflow verifies CI passed on the tagged commit before building.

## Dependency updates

A weekly issue is created every Monday with outdated npm and Cargo dependencies. These are surfaced for manual review. No automatic updates. See `.github/workflows/deps.yml`.

## Code of conduct

- Write self-documenting code. Comments are for "why", not "what".
- Follow existing patterns in the codebase. Look at neighboring files.
- All user-facing strings must be in English (i18n is v2).
- No telemetry, no analytics, no tracking. Ever.
