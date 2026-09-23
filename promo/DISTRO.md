# Lance — Distribution queue (v1 launch)

Status: `todo | ready | submitted | live`. Human posts everything (draft-only).
Refresh via `npm run promo:build`. Primary goal: **download clicks**.

| # | Channel | Status | Asset checklist | Copy source | Link (UTM) |
|---|---------|--------|-----------------|-------------|------------|
| 1 | Product Hunt | todo | hero30s.mp4, 3 GIFs, 1280×800 shots, tagline | `promo/drafts/<date>/ph-kit.md` | `?utm_source=producthunt&utm_medium=launch&utm_campaign=launch-v1` |
| 2 | Show HN | todo | 1 GIF, fact sheet | `promo/drafts/<date>/hn-show.md` | `?utm_source=hn&utm_medium=social&utm_campaign=launch-v1` |
| 3 | X thread | ready | OG image, 1 GIF | `promo/drafts/<date>/x-thread.md` | `?utm_source=x&utm_medium=social&utm_campaign=launch-v1` |
| 4 | LinkedIn | ready | hero still, shots | `promo/drafts/<date>/linkedin.md` | `?utm_source=linkedin&utm_medium=social&utm_campaign=launch-v1` |
| 5 | r/freelance | todo | none (text-first, rules check) | `promo/drafts/<date>/reddit-freelance.md` | link in comments only |
| 6 | Indie Hackers | todo | milestone post, shots | reuse linkedin + numbers | `?utm_source=indiehackers&utm_medium=community&utm_campaign=launch-v1` |
| 7 | TikTok/Reels/Shorts | todo | Short9x16 mp4 ×3 | `promo/drafts/<date>/tiktok-script.md` | bio link |
| 8 | AlternativeTo | todo | shots ×4, description 200ch | press-kit/fact-sheet | `?utm_source=alternativeto&utm_medium=directory&utm_campaign=launch-v1` |
| 9 | BetaList | todo | tagline + shots | ph-kit short | `?utm_source=betalist&utm_medium=directory&utm_campaign=launch-v1` |
| 10 | Uneed / Slant / SaaSHub | todo | logo + shots | fact sheet | directory UTM each |

## T-0 runbook

- 08:00 merge launch-mode PR (`mode: live`), verify countdown off + video embed poster present.
- 09:00 PH live + X thread post 1 → HN Show → Short #1.
- 10:00 Reddit (max 2 subs, spaced, value-first) → LinkedIn.
- 12:00 IH milestone + newsletter (if list exists).
- 15:00 quote-tweet wins, reply to every comment (human).
- 18:00 check `promo/exp-report.md`, kill losers (`?ab_*` override to verify).
- T+1 recap cutdown + testimonial asks (post-`First invoice paid` prompt).
