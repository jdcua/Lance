# ADR-0001: Keep one Zustand store, extracting factories and slices in place

Status: Accepted
Date: 2026-11-25
Deciders: project owner

## Context

The Constitution/AGENTS rule (`AGENTS.md` §3, `STANDARDS.md`) requires a single
store. `src/store/index.ts` holds the only `create<UnifiedStore>()` call in
`src/`; the sole other mention is the invariant comment in
`src/store/factories/shared.ts`. Domain slices (`slices/meta.ts`,
`slices/toasts.ts`, `slices/updater.ts`) are spread into that one call. Generic
CRUD and archetype actions were extracted into `src/store/factories/` without
introducing a second store, and store type declarations moved to
`src/store/types.ts` without moving logic. `src/store/toastStore.ts` and
`src/store/updaterStore.ts` are typed accessors over `useStore`, not parallel
stores.

## Decision

Keep one Zustand store. Add domains by spreading slices into the existing
`create()` call, extracting shared logic into factories, and exposing typed
accessors where a narrowed surface is useful. Never add a second `create()`.

## Consequences

There is one state surface to reason about, CRUD stays locally editable in the
factories, and the second-store boundary is lintable via
`scripts/check-boundaries.mjs`. No per-domain store may be introduced.
