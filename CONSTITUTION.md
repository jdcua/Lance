# Lance V1 Constitution

## Stack: unchanged
Tauri 2 + React 18 + TypeScript + SQLite + Zustand + Tailwind

## What this is
A freelancer OS. 41 archetypes. One unified brain underneath.

## The law
- The existing 37-table schema is the foundation. Extend it, don't replace it
- One Zustand store, not 25 slices. One source of truth.
- Features share data. Time feeds invoicing. Invoices feed forecasting.
  Forecasting feeds follow-ups. Nothing is a silo.
- Background engines (recurring, backup, follow-up, expiry, updater) 
  stay. Clean them up, don't rewrite from scratch
- Existing UI components are the base. Improve them, don't throw them away
- 150 feature components get refactored into the unified store, not rewritten

## Build order
1. Lock the unified store shape first. Nothing else starts
2. Wire all 37 tables through it
3. Refactor screens one by one against the store
4. Archetype system stays config-driven. Improve the configs, not the pattern
5. Playwright test per screen before moving to the next

## What not to do
- No new UI frameworks
- No new state libraries  
- No feature that doesn't touch the unified store
- No untested screen gets committed

## When done
Remotion renders marketing videos. Ship.
