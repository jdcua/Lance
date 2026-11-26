# Copilot / coding-agent instructions

Lance is an offline-first Tauri 2 desktop app written in React 18, TypeScript
and Rust. All business data stays on the user's machine.

**The canonical rulebook is [`AGENTS.md`](../AGENTS.md). Follow it exactly.**
It covers the single Zustand store, the command registry, the `RecordTracker`
component, the glass-chrome UI standard, and the testing rules.

## Before changing anything

```bash
npm run doctor   # verify Node, Rust and installed dependencies (not OS libs)
npm run verify   # typecheck + lint + tests + build + audit:oss + licenses + boundaries
npm run complexity -- --strict   # complexity gate (also runs in CI)
```

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

- No accounts, cloud, telemetry, analytics, license keys or paywalls.
- Never skip or weaken a test. Tests describe behavior, not DOM internals.
- Preserve the single store and command registry; do not add parallel systems.
- Keep diffs small and open one PR per task. Use `.github/PULL_REQUEST_TEMPLATE.md`.
