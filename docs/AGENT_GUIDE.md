# Guide for AI agents

This guide is for automated contributors. Humans can read it too. The rules
live in [AGENTS.md](../AGENTS.md); this file describes the workflow around them.

## Before starting

1. Read `AGENTS.md`, `CONTRIBUTING.md` and `docs/ROADMAP.md`.
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
  extract helpers rather than growing a branch tree. `npm run complexity`
  lists any offenders. `npm run check:boundaries` reports layer violations.
- Use the PR template. State what changed, why, what you deleted, and what you
  deliberately left untouched.
- After opening the PR, re-read the diff as a reviewer. Check for secrets,
  personal paths, dead imports, and docs that contradict the code.

## Useful commands

```bash
npm run doctor                       # environment check
npm run verify                       # typecheck + lint + test + build + OSS audit
gh issue list --repo jdcua/Lance     # find work
gh pr create --repo jdcua/Lance      # open a PR (or use your GitHub MCP tool)
```

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

- All checks pass, no secret or personal path is present, docs match behavior,
  the PR is small and described, and the final report lists deletions,
  changes, and deliberate non-changes.
