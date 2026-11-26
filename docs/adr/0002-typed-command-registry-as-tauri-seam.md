# ADR-0002: Route app-wide actions through a typed command registry

Status: Accepted
Date: 2026-11-25
Deciders: project owner

## Context

The implicit `lance:...` CustomEvent bus had 32 dispatch sites across 15 files.
It was replaced by `src/lib/commands.ts`, which declares a typed `CommandDetail`
map and a `CommandRegistry` with `on`, `off`, `dispatch` and
`dispatchAfterMount`. `dispatchAfterMount` replaced five
`setTimeout(..., 350)` deep-link hacks so a queued intent is delivered
deterministically when its screen mounts. UI code is forbidden to import
`@tauri-apps/*` directly and uses typed wrappers in `src/utils/tauri.ts`.

## Decision

The registry is the single app-wide action/Tauri seam. New actions add a typed
command key plus a handler; do not add new `lance:...` CustomEvents and do not
import Tauri APIs directly into UI code.

## Consequences

Payloads are checked at compile time, deep links no longer depend on timing
races, and there is a stable seam between screens and the Rust command handlers
in `src-tauri/src/lib.rs`.
