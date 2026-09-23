// Lance design tokens — port of landing/styles.css :root + app.js THEME_VARS.
// Single source for video so renders match the site exactly.
export const TOKENS = {
  green: '#1EC98A',
  bg: '#0A0A0B',
  s1: '#131315',
  s2: '#1A1A1D',
  bd: 'rgba(255,255,255,.08)',
  t1: '#FAFAF8',
  t2: '#A1A1AA',
  t3: '#5B5B62',
  fontD: "'Space Grotesk',sans-serif",
  fontB: "'Inter',sans-serif",
  fontM: "'JetBrains Mono',monospace",
} as const;

export const THEME_ACCENTS: Record<string, string> = {
  default: '#1EC98A',
  studio: '#C4622D',
  terminal: '#3FB950',
  craft: '#4A7FA5',
  motion: '#8B5CF6',
  lens: '#D97706',
  scale: '#1E40AF',
};

export const FPS = 30;
