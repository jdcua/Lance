# scripts/qa — Lance QA harness

Re-runnable QA suite for the Lance app. Every probe launches its **own** headless
Chromium with its own storage, so probes can run in parallel without colliding
(a shared browser MCP instance would not survive that).

## Setup

```bash
# Dev server (what most probes drive; has HMR + the browser-mode store)
npx vite --port 4173 --strictPort

# Production build (what the sweep and contrast checks should validate)
npm run build && npx vite preview --port 4300 --strictPort

# Regenerate fixtures after schema/seed changes
QA_BASE=http://localhost:4173 node scripts/qa/make-fixture.mjs
```

Point any script at a different server with `QA_BASE=http://localhost:4300`.

## The two workhorses

| Script | What it does |
|---|---|
| `sweep.mjs` | Every route × 8 theme/viewport/density conditions. Records console + page errors, failed requests, axe violations, horizontal overflow, clipped labels, junk values (`NaN`/`undefined`), broken images and unnamed controls. `--only=/clients` for one route, `--phase=responsive` to skip axe. |
| `redteam.mjs` | XSS (poisoned client/company/email/tags/notes across every route), corrupt storage (garbage JSON, wrong shapes, null rows, absurd numbers), hostile input (1000-char + emoji + RTL through the real form), scale (60 records), races (rapid timer toggles). |

`harness.mjs` is the shared entry point (`launch`, `collect`, `shot`, `go`,
`readStore`, `storeDump`, `dismissOverlays`); `fixtures/seeded.json` and
`fixtures/fresh.json` are captured onboarding states.

## Regression gates (exit non-zero on failure)

| Script | Guards |
|---|---|
| `scan-icon-buttons.mjs` | Every icon-only button has an accessible name. `--write` adds the labels; `tidy-labels.mjs` formats them. |
| `check-accent-on.mjs` | Every theme/mode meets WCAG AA on accent-filled labels (exits 1 otherwise). |
| `check-accent-runtime.mjs` | Same, measured from rendered pixels in the production build. |
| `check-schema.mjs` | Rust tables, JS-migration tables and backup coverage agree; no dangling FK targets. |
| `probe-browser-backup.mjs` / `probe-browser-backup-roundtrip.mjs` | Browser-mode backup discovers every table that holds rows, and restores them. |
| `probe-route-errors.mjs <routes>` | Console/page/network errors on specific routes. |

`fix-accent-contrast.mjs`, `solve-accent.mjs`, `pick-accent-on.mjs`,
`check-accent-contrast.mjs` and `use-accent-on.mjs` are the one-shot repair
tooling used to derive and apply the `--accent-on` token; they are kept so the
derivation is auditable and repeatable for a future theme.

## Alongside this harness

The behaviours above are also locked by unit tests (`src/utils/tauri.test.ts`,
`src/utils/backupTables.test.ts`, an updated `src/utils/backup.test.ts`) and by
`e2e/qa-regression.spec.ts`, so the fast gates catch regressions without a
browser. Findings and fixes: `.qa/QA-REPORT.md`; tracker: `.qa/CHECKLIST.md`.
