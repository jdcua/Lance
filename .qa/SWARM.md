# Lance · QA Swarm Briefing (read fully before starting)

You are one of **10 QA personas + 1 lead (me)** running a full exploratory QA
pass on **Lance**, a Tauri + React + TypeScript + SQLite desktop app for
freelancers (clients, projects, proposals, contracts, time, invoices, finance,
insights, achievements, client portal). Repo root: this directory.

## Running servers (already up — do NOT start or kill them)

| Server | URL | What it is |
|---|---|---|
| Desktop dev | `http://localhost:4173` | `vite` dev server, `__TEST_MODE__=true`, **no** trial flag. **Use this for everything.** |
| Trial dev | `http://localhost:1420` | same app but `VITE_TRIAL=1` (trial banner, auto-seed, test-mode panel). Use only for trial-specific checks. |

The app runs **fully in the browser**: outside Tauri every IPC command is
intercepted by `src/utils/tauri.ts`, which persists rows to `localStorage` under
`lance:store:<table>` (profile is the raw key `lance:profile`). So a browser
session is a faithful functional simulation — use it.

## Your browser: isolated headless chromium, via the shared harness

Do **not** use the shared `playwright` MCP browser (10 agents would collide).
Write your own Node script and run it with `node`. `playwright` is installed.

```js
// scripts/qa/<your-agent>.mjs
import { launch, collect, shot, go, waitApp, readStore, dismissOverlays } from './harness.mjs';

const { browser, page } = await launch({ fixture: 'seeded' }); // or 'fresh'
const log = collect(page);                 // console errors, pageerrors, failed/HTTP>=400 requests
await go(page, '/clients');                // go() waits for the app to settle
await shot(page, 'clients-list');          // -> qa-shots/swarm/
console.log(log.report());                 // MUST be clean: "no console/page errors"
await browser.close();
```

Harness exports (see `scripts/qa/harness.mjs` for details):
`launch({fixture,overrides,viewport})`, `collect(page)`, `shot(page,name)`,
`shotEl(page,sel,name)`, `go(page,route)`, `waitApp`, `readStore(page,table)`,
`storeDump(page)`, `dismissOverlays(page)`, `BASE`, `SHOT_DIR`.

* Fixtures: `scripts/qa/fixtures/seeded.json` (onboarding done + sample data:
  4 clients, 4 projects, 3 proposals, 2 contracts, 4 invoices, 12 time entries,
  5 expenses, 3 milestones, pending follow-ups) and `fresh.json` (brand-new
  user, onboarding not completed, no data).
* Change state per-test with `overrides: { 'lance:store:invoices': [...] }` or by
  driving the real UI. Reloading keeps localStorage, so `page.reload()` is safe.
* Screenshots land in `qa-shots/swarm/`. Keep them (the lead reviews them).

## Visual review (you may be text-only)

If you cannot see images, load the **`vision` skill** (skill tool, id `vision`)
and delegate screenshot analysis exactly as it describes. Do **not** guess what a
screenshot looks like. For every chart, graph, heatmap, modal, empty state and
responsive breakpoint you touch: capture it and get it visually verified.

## Hard rules

1. **File ownership is exclusive.** You may only EDIT the files in your
   "You own" list. Anything outside it → you *report* the bug with file:line and
   a proposed fix; do not edit it. This keeps 10 agents from clobbering each
   other. Shared/core files (`src/store/**`, `src/utils/tauri.ts`, `src/db/**`,
   `src-tauri/**`, `src/App.tsx`, `src/router.tsx`, `src/index.css`,
   `src/components/ui/**`) are owned by the lead or by whichever agent is listed
   as their owner — respect that even if it looks like an obvious one-liner.
2. **Never** run `git commit`, `git checkout`, `git stash`, `git reset`, or
   delete files you don't own. The working tree already has uncommitted work.
3. Keep edits **minimal, surgical, and in the existing style** (TypeScript,
   Tailwind CSS vars like `var(--text-primary)`, existing comment density that
   explains *why*). No drive-by refactors, no formatting sweeps, no new deps.
4. After editing: `npx tsc --noEmit` must be clean (run it from repo root).
   Re-run your own browser script to prove the fix (before/after screenshot).
5. Don't run `npx vitest run` (slow, lead does it) unless your fix touches
   shared logic — then run only your file: `npx vitest run src/utils/foo.test.ts`.
6. Report every bug you find, fixed or not. A "fixed" bug with no proof
   (screenshot / assertion / store dump) counts as unverified.

## What counts as a bug

Broken/blank/crashing UI · console error or unhandled rejection in a normal flow ·
data not persisting after reload · wrong math (totals, tax, currency, forecasts,
durations) · forms that accept invalid input or reject valid input · buttons
that do nothing · dead ends (no way forward/back) · broken keyboard shortcuts ·
a11y violations (labels, focus trap, roles, contrast) · layout breakage
(overflow, clipping, overlap, misalignment, unreadable contrast, broken dark
mode, broken at 1280/1440/1920 and at 125% text scale) · stale/incorrect copy ·
misleading empty states · missing loading states · race conditions · anything a
real freelancer would file a ticket about.

## Report

Write your findings to `.qa/reports/<your-archetype>.md` (create the dir if
needed) with this shape, then also print a summary in your final message:

```md
# <Archetype name> — QA report
## Fixes applied
| # | Severity | Where (file:line) | What was broken | Fix | Proof |
## Bugs reported (not mine to fix)
| # | Severity | Where | What is broken | Repro | Suggested fix |
## Checks that passed (so nobody re-tests them)
- ...
## Known limitations of this pass
- ...
```

Severity: `S1` breaks a core flow / loses data · `S2` feature broken or wrong
· `S3` visual/UX/a11y defect · `S4` polish.

Finish with a short list: `S1: n, S2: n, S3: n, S4: n` and the single most
important thing you fixed.
