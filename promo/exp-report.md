# Experiment report (auto-refresh in P1 via /api/exp-report)

Updated manually until the worker beacon wires in. Rule: call winner at
≥200 conversions; human promotes via PR. Bots see control (A).

| Exp | Goal | A (control) | B (challenger) | Views A/B | Hits A/B | Rate A/B | Call |
|-----|------|-------------|----------------|-----------|----------|----------|------|
| hero-cta | dl-click | Download for Mac | Free Download — No account | -/- | -/- | -/- | running |
| hero-h1 | dl-click | Win work… | Your freelance business… | -/- | -/- | -/- | draft |
| pricing-order | trial-cta | free/pro/lifetime | lifetime-first $149 | -/- | -/- | -/- | draft |

## How to fill

1. Deploy worker with `scripts/promo/exp-beacon.mjs` routes (P1 review).
2. Include `landing/ab-activator.js` + variant fragments on page.
3. Collect `GET /api/exp-report` → paste counts → run `npm run promo:exp-eval`.
