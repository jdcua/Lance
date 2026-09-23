# Promo machine

One source of truth → lots of distribution. Draft-only: everything generates
files for human review. Nothing auto-posts, nothing auto-merges.

## Sources

- `content.json` — brand, pillars, 41 crafts, proof, pricing, alternatives.
- `launch.json` — release date + launch `mode` (tease|countdown|live|post|evergreen).
- `experiments.json` — A/B exps, variants, goals. Bots always see control (A).

## Commands

- `npm run promo:build` — emit SEO pages, variant fragments, social drafts,
  launch snippet, DISTRO + press-kit refresh, exp-report stub.
- `npm run promo:shots` — (P1) Playwright seeded screenshots → `promo/assets/`.
- `npm run promo:video` — (P1) Remotion renders → `promo/assets/` (see `promo-video/`).

## Outputs

- `landing/craft/*.html`, `landing/alternatives/*.html`, `landing/use/*.html` (P1 full matrix; P0 = samples)
- `landing/variants/*` — A/B fragments, swapped by `app.js` via `[data-exp]`.
- `promo/drafts/<date>/` — per-channel copy (x-thread, linkedin, reddit, hn, tiktok-script).
- `promo/DISTRO.md` — directory queue with status + submission copy + UTM.
- `promo/press-kit/` — fact sheet, founder bio, outreach drafts, logo/shot checklist.
- `promo/exp-report.md` — views/hits per variant (filled by `/api/exp-*` counters).

## Privacy rule

Beacon payload is `{exp, variant, goal}` only. No IP storage, no fingerprint,
no third-party calls. Documented in `/privacy`. Bucket cookie is
`lance_ab_<exp>` (30d, SameSite=Lax).
