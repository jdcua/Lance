/**
 * Design tokens — single source of truth for radii, spacing, type scale,
 * shadows, and motion. `tailwind.config.js`, `src/index.css :root`, and the
 * primitives below must all reference these values; do not hardcode competing
 * literals (the 8/12/14/16px radius drift of v0.9.9-3 is resolved here).
 *
 * Motion follows IN-APP EXPRESSIVITY THAT DOESN'T GET OLD:
 * - FREQUENCY RULE: anything firing many times a day (taps, tabs, drags,
 *   toggles) stays subtle and under ~150ms (dur.tap / dur.ui).
 * - Rare events (first win, invoice paid, queue cleared) may use dur.hero.
 * - INTENSITY (prefs.intensity: expressive | balanced | calm, default
 *   balanced): calm disables ambient + caps hero at dur.ui; balanced allows
 *   one ambient + one hero per screen; expressive is reserved for landing +
 *   onboarding surfaces only. prefers-reduced-motion always wins (index.css
 *   + MotionConfig in main.tsx).
 * - MOTION BUDGET: at most one ambient animation + one hero moment per
 *   screen. Exceeding screens must be reported, not shipped.
 * - ORBIT / SPINNING TOOLS stay in onboarding + landing only, never the app.
 */

export const radii = {
  sm: 8, // buttons, inputs, small controls
  md: 12, // modals, dropdowns
  lg: 14, // metric cards, popovers
  xl: 16, // content cards
} as const;

export const spacing = {
  cardX: 24, // Card px-6
  cardY: 20, // Card py-5
  metric: 20, // MetricCard p-5
  modalX: 24, // Modal px-6
  modalY: 16, // Modal py-4
} as const;

export const typeScale = {
  display: 26, // MetricCard value
  title: 16, // Modal h2
  body: 14, // default UI text
  small: 12, // buttons, labels
  micro: 11, // overline labels
  tiny: 10, // compact-mode floor
} as const;

export const shadows = {
  card: 'var(--card-shadow)',
  cardHover: 'var(--card-hover-shadow)',
  pop: 'var(--shadow-pop)',
  button: '0 1px 2px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.22)',
  buttonFlat: '0 1px 2px rgba(0,0,0,0.05)',
} as const;

export const motion = {
  dur: {
    /** frequent taps — must feel instant, never block next action */
    tap: 120,
    /** tabs, toggles, hovers — the daily-motion ceiling */
    ui: 150,
    /** entrances, modal open */
    enter: 200,
    /** one hero moment per screen, rare events only */
    hero: 450,
    /** drawn-in charts (transform/width, once per view) */
    chart: 600,
  },
  ease: {
    out: [0.22, 1, 0.36, 1] as const,
    springy: [0.34, 1.3, 0.64, 1] as const,
  },
  springs: {
    /** Magnetic cursor-lean (existing, kept) */
    magnetic: { stiffness: 180, damping: 14 },
    /** AnimatedNumber count-up (existing, kept) */
    ticker: { stiffness: 90, damping: 20 },
    /** card lift / drag settle */
    lift: { stiffness: 300, damping: 30 },
    /** modal / shared-element */
    modal: { stiffness: 260, damping: 26 },
  },
} as const;

export type Intensity = 'expressive' | 'balanced' | 'calm';

export const INTENSITY_DEFAULT: Intensity = 'balanced';
