# promo-video — Lance Remotion studio

Isolated package so heavy video deps never touch the Tauri app.
Design tokens mirror `landing/styles.css` + `app.js THEME_VARS`.

## Gallery (frame-driven only — never CSS transitions)

- `BlurIn` (Motion text-effect blur), `ShimmerButton` + `BorderBeam` (Magic),
  `Marquee`, `AuroraText` (gradient), `NumberTicker` (spring), `TextReveal`,
  `Particles`/`RetroGrid`/`Meteors`/`FlickerGrid` (seeded, deterministic),
  `DottedGlow` (Obsidian), `MockApp` (crisp React mock; real shots in `public/shots/`).

## Compositions (30fps)

- `Hero30s` 1920×1080, 900f: brand+headline → product tour → privacy → CTA.
- `Short9x16` 1080×1920, 450f: hook → demo → payoff → CTA.
- Next: `Walkthrough60s`, `Craft15s` (41 via props), `Stills` (OG).

## Use

```sh
cd promo-video && npm install
npm run studio          # preview
npm run render:hero     # out/hero30s.mp4 (needs install + ffmpeg)
```

Props live in `src/props/*.json` and mirror `promo/content.json`
(craft id → hook + theme accent). Copy `qa-shots/` selects into
`public/shots/` for cutaways — never fetch at render time.
