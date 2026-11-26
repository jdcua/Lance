# Guide for AI agents

This guide is for automated contributors. Humans can read it too. The rules
live in [AGENTS.md](../AGENTS.md); this file describes the workflow around them.

## Before starting

1. Read `AGENTS.md`, `STANDARDS.md`, `CONTRIBUTING.md` and `docs/ROADMAP.md`.
2. Run `npm run doctor`. If it fails, report the missing tool instead of
   working around it.
3. Pick one issue or one roadmap item. Open an issue first for anything that
   changes the store, the database schema, or more than five files.

## The loop

```text
read → plan → branch → change → npm run verify → PR → self-review → merge
```

- One task per branch, one PR per task. Name the branch `fix/...`, `feat/...`
  or `docs/...`.
- Keep unrelated cleanups out of the PR. Report them instead.
- `npm run verify` must pass before you open the PR. Never skip or weaken a
  test, and never change business logic to make a test green. Keep new
  functions at complexity <= 15 (the `complexity` ESLint rule is an error);
  extract helpers rather than growing a branch tree.
  `npm run complexity -- --strict` is the CI gate; use it locally.
  `npm run check:boundaries -- --strict` fails on layer violations (CI does).
- `npm run check:trackers` fails on any new hand-rolled CRUD component outside
  `RecordTracker` (baseline: `scripts/tracker-baseline.json`; CI step).
- `npm run format:check` is part of `verify`; `npm run format` fixes drift.
- Schema change? Regenerate `src-tauri/tests/schema_golden.txt` with
  `UPDATE_GOLDEN=1 cargo test --lib db::tests::schema_golden` from `src-tauri/`.
- Pure math change? Add or update a `fast-check` property in
  `src/lib/*.property.test.ts`; failed seeds are printed for replay.
- Use the PR template. State what changed, why, what you deleted, and what you
  deliberately left untouched.
- Disclose AI assistance with an `Assisted-by:` trailer in the PR description
  or squash commit. This is a convention, not a CI gate.
- After opening the PR, re-read the diff as a reviewer. Check for secrets,
  personal paths, dead imports, and docs that contradict the code.

## Useful commands

The command sequence is in [`AGENTS.md` §7](../AGENTS.md#7-before-every-commit)
and [`CONTRIBUTING.md`](../CONTRIBUTING.md#make-a-change); this guide adds no
new commands. Use `gh issue list --repo jdcua/Lance` to find work and
`gh pr create --repo jdcua/Lance` (or a GitHub MCP tool) to open the PR.

## Adding or changing GitHub workflows

- Keep `permissions` at the minimum needed; default to `contents: read`.
- Pin third-party actions to a full commit SHA and a version comment.
- Workflows that only comment on issues or PRs should not check out code and
  should use `pull_request_target` carefully — never run untrusted code in
  that context.
- Secrets are only for release signing. No new secret should be needed for a
  contribution.
- Validate YAML locally, then confirm the workflow appears under
  `.github/workflows/` in CI before reporting done.

## Definition of done

See [`AGENTS.md` §7](../AGENTS.md#7-before-every-commit) and the
[PR template](../.github/PULL_REQUEST_TEMPLATE.md): all checks pass, no secret
or personal path is present, docs match behavior, and the final report lists
deletions, changes and deliberate non-changes. Disclose AI assistance with
`Assisted-by:` in the PR or commit (convention only).
