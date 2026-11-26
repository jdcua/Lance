# Copilot / coding-agent instructions

Lance is an offline-first Tauri 2 desktop app written in React 18, TypeScript
and Rust. All business data stays on the user's machine.

**The canonical rulebook is [`AGENTS.md`](../AGENTS.md). Follow it exactly.**
It covers the single Zustand store, the command registry, the `RecordTracker`
component, the glass-chrome UI standard, and the testing rules.

## Before changing anything

Run the command sequence in [`AGENTS.md` §7](../AGENTS.md#7-before-every-commit)
(`npm run doctor`, `npm run verify` and the complexity/tracker gates); setup and
gate details are in [`CONTRIBUTING.md`](../CONTRIBUTING.md). Do not duplicate
those lists here.

## Local map

| Task | Start here |
|---|---|
| Add an entity screen | `src/components/ui/RecordTracker.tsx`, `src/store/index.ts` |
| Add an app-wide action | `src/lib/commands.ts` |
| Change UI chrome or surfaces | `AGENTS.md` section 2, `src/index.css` |
| Change SQLite schema | `src/db/index.ts` **and** `src-tauri/src/db.rs` |
| Add a Rust command | `src-tauri/src/commands/`, register in `src-tauri/src/lib.rs` |
| Find contribution ideas | `docs/ROADMAP.md` |
| Resolve a duplicate basename | Full paths only: `src/store/index.ts`, `src/db/index.ts`, `src/types/index.ts`, `src/screens/{finance,invoices,settings}/shared.tsx`; `src/export/common.ts` and `src/store/types.ts` are unique |

## Non-negotiables

The rules live in [`AGENTS.md`](../AGENTS.md) §§1–6 and
[`CONTRIBUTING.md`](../CONTRIBUTING.md): no accounts/cloud/telemetry/paywalls,
one store and command registry, no skipped tests, small diffs and one PR per
task. Use [`PULL_REQUEST_TEMPLATE.md`](PULL_REQUEST_TEMPLATE.md), attach
test/CI evidence for non-UI claims, link an ADR for decisions that outlive the
PR, and disclose AI assistance with an `Assisted-by:` trailer.
