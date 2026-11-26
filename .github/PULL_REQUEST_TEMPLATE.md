## What changed

<!-- One or two sentences. What does a reviewer need to know? -->

## Why

<!-- Link the issue: Closes #123. If there is no issue, explain the problem. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Docs / tests / tooling
- [ ] Refactor (no behavior change)

## Verification

- [ ] `npm run verify` passed locally
- [ ] `npm run complexity -- --strict` shows no regression
- [ ] `npm run check:trackers` clean (no new hand-rolled CRUD outside `RecordTracker`)
- [ ] `npm run format:check` clean
- [ ] `npm run typecheck:e2e` clean when Playwright specs change (CI step)
- [ ] Rust touched: `cargo test --lib`, `cargo fmt --check` and the Clippy gate pass
- [ ] Added or updated a behavior test
- [ ] Checked UI changes in the app (attach a screenshot if visible)
- [ ] Evidence attached for non-UI claims (test/CI output or command transcript) when requested
- [ ] Linked an ADR for decisions that outlive this PR (docs/adr/)
- [ ] AI assistance disclosed (`Assisted-by:` trailer or note in this PR)

## For reviewers

<!-- Anything unusual, risky, or deliberately left out. AI agents: list what
     you deleted and what you deliberately left untouched. -->
