# Roadmap and contribution areas

Lance is feature-complete for a solo freelancer. The work below is about
hardening, accessibility and making the codebase easier to extend. Pick any
item, open an issue, and say you are working on it.

## Good first contributions

- Run `npm run test:axe` and fix the accessibility violations it reports, one
  screen per PR. Add a regression test with Testing Library.
- Update the counts and paths in [ARCHITECTURE.md](ARCHITECTURE.md) — several
  were written before the archetype cleanup.
- Add missing tests for pure utilities in `src/utils/` (formatting, recurring
  dates, currency conversion). Behavior tests only.
- Improve empty states for Invoices, Proposals and Follow-ups. Keep copy plain,
  no exclamation marks, no emoji icons.
- Replace hand-rolled list/create/delete screens with
  `src/components/ui/RecordTracker.tsx` where the data shape allows it.

## Areas that need owners

| Area | Starting point | What helps |
|---|---|---|
| Accessibility | `scripts/axe-gate.mjs`, `src/components/ui/` | Keyboard paths, focus order, reduced motion, contrast |
| Export | `src/export/`, `docs/ARCHITECTURE.md` | PDF/DOCX layout tests, template coverage |
| Local database | `src/db/index.ts`, `src-tauri/src/db.rs` | Migration tests, upgrade from older databases |
| Client portal | `src-tauri/src/server.rs` | Security review, session handling, docs |
| Performance | `vite.config.ts` chunk groups | Split the large PDF/import chunks, measure cold start |
| Packaging | `.github/workflows/release.yml` | Verify Linux/Windows build matrix on every PR |
| Docs | this folder | Keep architecture, security and development docs accurate |

## Explicitly out of scope

- Accounts, cloud sync, or network telemetry/analytics. Lance is local-first; the on-device activity log has no network calls.
- Payments, subscriptions, license keys or paywalls. Every feature is free in
  every build; adding gating back is not a contribution we will accept.
- New UI frameworks, state libraries, or hand-rolled feature trackers that
  duplicate `RecordTracker`.

## How decisions are made

Open an issue with the problem, the proposed approach and the tests you would
add. Small, reversible changes land quickly. Schema changes and changes to the
single Zustand store need a short design discussion first because every
feature reads from that store.
