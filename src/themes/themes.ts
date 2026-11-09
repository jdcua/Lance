import type { Theme } from './index';

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Editorial serif, calm and confident',
    unlockedBy: 'Always available',
    fontDisplay: "'Playfair Display', serif",
    fontBody: "'Source Sans 3', sans-serif",
    colors: {
      '--bg-primary': '#F8F7F3',
      '--bg-secondary': '#EFEFEA',
      '--bg-card': '#FFFFFF',
      '--border-color': '#E3E2DB',
      '--text-primary': '#181716',
      '--text-secondary': '#68675F',
      '--text-tertiary': '#75756F',
      '--accent': '#FFAD00',

      '--accent-on': '#181716',
      '--accent-ink': '#0B6B4A',
      '--accent-hover': '#E89B00',
      '--accent-bg': 'rgba(255,173,0,0.14)',
      '--warning': '#F59E0B',
      '--danger': '#A32D2D',
      '--danger-bg': '#FCEBEB',
      '--info-bg': '#E6F1FB',
      '--warning-bg': '#FAEEDA',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.08)',
      '--info': '#3B82F6',
      '--info-ink': '#185FA5',
      '--info-border': '#3B82F6',
      '--warning-text': '#854F0B',
      '--danger-hover': '#8B2525',
      '--accent-active': '#C98A00',
      '--neutral-border': '#D4D4D2',
      '--medium-conf-bg': '#FDF3E7',
      '--medium-conf-text': '#B86E1C',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#111110',
      '--bg-secondary': '#1A1918',
      '--bg-card': '#222120',
      '--border-color': '#2D2C2A',
      '--text-primary': '#F0EFE8',
      '--text-secondary': '#898883',
      '--text-tertiary': '#8E8D88',
      '--accent': '#FFAD00',

      '--accent-on': '#181716',
      '--accent-ink': '#FFC24D',
      '--accent-hover': '#FFB81A',
      '--accent-bg': 'rgba(255,173,0,0.14)',
      '--warning': '#F59E0B',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#C98A00',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Warm and artisanal, for design-led freelancers',
    unlockedBy: 'Send your first proposal',
    fontDisplay: "'Playfair Display', serif",
    fontBody: "'Source Serif 4', serif",
    colors: {
      '--bg-primary': '#FDFAF5',
      '--bg-secondary': '#F5F0E8',
      '--bg-card': '#FFFFFF',
      '--border-color': '#E8E0D0',
      '--text-primary': '#2C1810',
      '--text-secondary': '#7A6255',
      '--text-tertiary': '#87705F',
      '--accent': '#B65B2A',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#8F421E',
      '--accent-hover': '#A84E22',
      '--accent-bg': 'rgba(196,98,45,0.08)',
      '--warning': '#D97706',
      '--danger': '#A32D2D',
      '--danger-bg': '#FCEBEB',
      '--info-bg': '#E6F1FB',
      '--warning-bg': '#FAEEDA',
      '--card-shadow': '0 1px 3px rgba(100,60,30,0.06), 0 1px 2px rgba(100,60,30,0.04)',
      '--card-hover-shadow': '0 4px 12px rgba(100,60,30,0.08)',
      '--info': '#3B82F6',
      '--info-ink': '#1D4ED8',
      '--info-border': '#3B82F6',
      '--warning-text': '#854F0B',
      '--danger-hover': '#8B2525',
      '--accent-active': '#159C65',
      '--neutral-border': '#D4D4D2',
      '--medium-conf-bg': '#FDF3E7',
      '--medium-conf-text': '#B86E1C',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#1C100A',
      '--bg-secondary': '#2A1810',
      '--bg-card': '#342018',
      '--border-color': '#4A2C20',
      '--text-primary': '#FDF5EE',
      '--text-secondary': '#C4A99A',
      '--text-tertiary': '#A68B7C',
      '--accent': '#B65B2A',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#DA9370',
      '--accent-hover': '#A84E22',
      '--accent-bg': 'rgba(196,98,45,0.12)',
      '--warning': '#D97706',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#1EC98A',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Dark, focused, for developers',
    unlockedBy: 'Log 10 hours',
    fontDisplay: "'JetBrains Mono', monospace",
    fontBody: "'JetBrains Mono', monospace",
    colors: {
      '--bg-primary': '#0D1117',
      '--bg-secondary': '#161B22',
      '--bg-card': '#21262D',
      '--border-color': '#30363D',
      '--text-primary': '#E6EDF3',
      '--text-secondary': '#929AA4',
      '--text-tertiary': '#868E99',
      '--accent': '#3FB950',

      '--accent-on': '#181716',
      '--accent-ink': '#3FB950',
      '--accent-hover': '#2EA043',
      '--accent-bg': 'rgba(63,185,80,0.08)',
      '--warning': '#D29922',
      '--danger': '#F85149',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.35)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#159C65',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#0D1117',
      '--bg-secondary': '#161B22',
      '--bg-card': '#21262D',
      '--border-color': '#30363D',
      '--text-primary': '#E6EDF3',
      '--text-secondary': '#929AA4',
      '--text-tertiary': '#868E99',
      '--accent': '#3FB950',

      '--accent-on': '#181716',
      '--accent-ink': '#3FB950',
      '--accent-hover': '#2EA043',
      '--accent-bg': 'rgba(63,185,80,0.08)',
      '--warning': '#D29922',
      '--danger': '#F85149',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.35)',
      '--info': '#60A5FA',
      '--info-ink': '#7DAFFC',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#1EC98A',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
  {
    id: 'craft',
    name: 'Craft',
    description: 'Calm, editorial, for writers and coaches',
    unlockedBy: 'Mark your first invoice paid',
    fontDisplay: "'Lora', serif",
    fontBody: "'Source Sans 3', sans-serif",
    colors: {
      '--bg-primary': '#FAFAF8',
      '--bg-secondary': '#F4F3EF',
      '--bg-card': '#FFFFFF',
      '--border-color': '#E8E6E0',
      '--text-primary': '#1A1A18',
      '--text-secondary': '#6B6860',
      '--text-tertiary': '#76756F',
      '--accent': '#477A9E',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#35617E',
      '--accent-hover': '#3A6A8C',
      '--accent-bg': 'rgba(74,127,165,0.08)',
      '--warning': '#D97706',
      '--danger': '#A32D2D',
      '--danger-bg': '#FCEBEB',
      '--info-bg': '#E6F1FB',
      '--warning-bg': '#FAEEDA',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.06)',
      '--info': '#3B82F6',
      '--info-ink': '#1D4ED8',
      '--info-border': '#3B82F6',
      '--warning-text': '#854F0B',
      '--danger-hover': '#8B2525',
      '--accent-active': '#159C65',
      '--neutral-border': '#D4D4D2',
      '--medium-conf-bg': '#FDF3E7',
      '--medium-conf-text': '#B86E1C',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#121210',
      '--bg-secondary': '#1C1C18',
      '--bg-card': '#262620',
      '--border-color': '#363630',
      '--text-primary': '#F0EFE8',
      '--text-secondary': '#A0A098',
      '--text-tertiary': '#9A9990',
      '--accent': '#5B9ABD',

      '--accent-on': '#181716',
      '--accent-ink': '#7AADCA',
      '--accent-hover': '#4A7FA5',
      '--accent-bg': 'rgba(74,127,165,0.12)',
      '--warning': '#D97706',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#1EC98A',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
  {
    id: 'motion',
    name: 'Motion',
    description: 'High-energy motion theme, for animators and video pros',
    unlockedBy: 'Always available for animators',
    fontDisplay: "'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    colors: {
      '--bg-primary': '#FAFAFE',
      '--bg-secondary': '#F4F2FF',
      '--bg-card': '#FFFFFF',
      '--border-color': '#E4E0F4',
      '--text-primary': '#1A1530',
      '--text-secondary': '#6B6585',
      '--text-tertiary': '#6F6987',
      '--accent': '#8457EA',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#6A3DE0',
      '--accent-hover': '#7C3AED',
      '--accent-bg': 'rgba(139,92,246,0.08)',
      '--warning': '#D97706',
      '--danger': '#A32D2D',
      '--danger-bg': '#FCEBEB',
      '--info-bg': '#E6F1FB',
      '--warning-bg': '#FAEEDA',
      '--card-shadow': '0 1px 3px rgba(80,60,140,0.04), 0 1px 2px rgba(80,60,140,0.03)',
      '--card-hover-shadow': '0 4px 12px rgba(80,60,140,0.06)',
      '--info': '#3B82F6',
      '--info-ink': '#1D4ED8',
      '--info-border': '#3B82F6',
      '--warning-text': '#854F0B',
      '--danger-hover': '#8B2525',
      '--accent-active': '#159C65',
      '--neutral-border': '#D4D4D2',
      '--medium-conf-bg': '#FDF3E7',
      '--medium-conf-text': '#B86E1C',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#110F1A',
      '--bg-secondary': '#191530',
      '--bg-card': '#222040',
      '--border-color': '#332E55',
      '--text-primary': '#EDEBF8',
      '--text-secondary': '#A09AB5',
      '--text-tertiary': '#8F88AD',
      '--accent': '#8457EA',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#B191F9',
      '--accent-hover': '#7C3AED',
      '--accent-bg': 'rgba(139,92,246,0.12)',
      '--warning': '#D97706',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#1EC98A',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
  {
    id: 'lens',
    name: 'Lens',
    description: 'Dark and cinematic, for photographers and videographers',
    unlockedBy: 'Always available for photographers',
    fontDisplay: "'Cormorant Garamond', serif",
    fontBody: "'Inter', sans-serif",
    colors: {
      '--bg-primary': '#1C1814',
      '--bg-secondary': '#2A2520',
      '--bg-card': '#322D27',
      '--border-color': '#3D3630',
      '--text-primary': '#F5F0E8',
      '--text-secondary': '#B0A898',
      '--text-tertiary': '#A39E93',
      '--accent': '#D97706',

      '--accent-on': '#181716',
      '--accent-ink': '#F0A020',
      '--accent-hover': '#B45309',
      '--accent-bg': 'rgba(217,119,6,0.12)',
      '--warning': '#F59E0B',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#159C65',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#1C1814',
      '--bg-secondary': '#2A2520',
      '--bg-card': '#322D27',
      '--border-color': '#3D3630',
      '--text-primary': '#F5F0E8',
      '--text-secondary': '#B0A898',
      '--text-tertiary': '#A39E93',
      '--accent': '#D97706',

      '--accent-on': '#181716',
      '--accent-ink': '#E6A256',
      '--accent-hover': '#B45309',
      '--accent-bg': 'rgba(217,119,6,0.12)',
      '--warning': '#F59E0B',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#1EC98A',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Precise and commanding, for agency owners and consultants',
    unlockedBy: 'Always available for consultants',
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    colors: {
      '--bg-primary': '#F8F9FC',
      '--bg-secondary': '#F0F2F8',
      '--bg-card': '#FFFFFF',
      '--border-color': '#E0E4EE',
      '--text-primary': '#0F172A',
      '--text-secondary': '#5B6478',
      '--text-tertiary': '#66708A',
      '--accent': '#1E40AF',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#1E40AF',
      '--accent-hover': '#1E3A8A',
      '--accent-bg': 'rgba(30,64,175,0.08)',
      '--warning': '#D97706',
      '--danger': '#A32D2D',
      '--danger-bg': '#FCEBEB',
      '--info-bg': '#E6F1FB',
      '--warning-bg': '#FAEEDA',
      '--card-shadow': '0 1px 3px rgba(20,40,100,0.04), 0 1px 2px rgba(20,40,100,0.03)',
      '--card-hover-shadow': '0 4px 12px rgba(20,40,100,0.06)',
      '--info': '#3B82F6',
      '--info-ink': '#1E40AF',
      '--info-border': '#3B82F6',
      '--warning-text': '#854F0B',
      '--danger-hover': '#8B2525',
      '--accent-active': '#159C65',
      '--neutral-border': '#D4D4D2',
      '--medium-conf-bg': '#FDF3E7',
      '--medium-conf-text': '#B86E1C',
      '--metric-blue': '#3B82F6',
      '--metric-purple': '#8B5CF6',
    },
    darkColors: {
      '--bg-primary': '#0A0F1E',
      '--bg-secondary': '#111830',
      '--bg-card': '#1A2440',
      '--border-color': '#263054',
      '--text-primary': '#E8ECF4',
      '--text-secondary': '#94A0B8',
      '--text-tertiary': '#8B96B3',
      '--accent': '#3B6FE0',

      '--accent-on': '#FFFFFF',
      '--accent-ink': '#769AE9',
      '--accent-hover': '#1E40AF',
      '--accent-bg': 'rgba(59,111,224,0.12)',
      '--warning': '#D97706',
      '--danger': '#FB6B6B',
      '--danger-bg': '#3D1518',
      '--info-bg': '#0D1F3D',
      '--warning-bg': '#3D2E0D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.4)',
      '--info': '#60A5FA',
      '--info-ink': '#60A5FA',
      '--info-border': '#60A5FA',
      '--warning-text': '#F59E0B',
      '--danger-hover': '#CC4444',
      '--accent-active': '#1EC98A',
      '--neutral-border': '#3A3937',
      '--medium-conf-bg': '#2D1F08',
      '--medium-conf-text': '#F59E0B',
      '--metric-blue': '#60A5FA',
      '--metric-purple': '#A78BFA',
    },
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(theme: Theme): void {
  applyThemePalette(theme);
  loadThemeFonts(theme.id);
}

/**
 * High-contrast override, applied as INLINE custom properties.
 *
 * This has to be inline, not a stylesheet rule. `applyTheme` writes the whole
 * palette as inline custom props on <html> (see the dark-mode note below), and
 * inline custom properties beat every stylesheet rule in the cascade, so the
 * `.contrast-high` class in index.css resolved to nothing. The High Contrast
 * preference, the `prefers-contrast: more` auto-boost, and the onboarding copy
 * promising "7:1 body text" were all dead: 46 elements stayed at #75756F.
 *
 * Values are derived from whatever --text-primary currently is, so this works
 * across all 13 themes and both light and dark without a table of overrides.
 */
export function applyContrastBoost(root: HTMLElement = document.documentElement): void {
  const primary = getComputedStyle(root).getPropertyValue('--text-primary').trim();
  if (!primary) return;

  // One-way only: when the class is on, pin the trio to primary. When it is
  // off there is nothing to "clear" — the palette owns the trio, and any
  // removeProperty here would wipe values a palette write just set (that was
  // the app-wide invisible-dots bug). Callers re-apply the theme after
  // toggling the class so the palette is always rewritten first.
  if (!root.classList.contains('contrast-high')) return;
  const el = root;
  el.style.setProperty('--text-secondary', primary);
  el.style.setProperty('--text-tertiary', primary);
  el.style.setProperty('--border-color', primary);
}

/** Write a theme palette onto <html>. Internal; prefer applyTheme(). */
function applyThemePalette(theme: Theme): void {
  const root = document.documentElement;

  // Write the ACTIVE palette inline. A previous implementation always wrote
  // the light palette inline and kept dark values in a `.dark` stylesheet
  // block, but inline custom properties beat stylesheet rules in the
  // cascade, so dark mode silently never applied. Reading the live `.dark`
  // flag here makes every caller (App effect, Settings toggle, onboarding)
  // correct as long as it toggles the class first, which they all do.
  const active = root.classList.contains('dark') ? theme.darkColors : theme.colors;
  Object.entries(active).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Dark mode overrides · use theme's dedicated dark palette
  let darkStyle = document.getElementById('lance-theme-dark');
  if (!darkStyle) {
    darkStyle = document.createElement('style');
    darkStyle.id = 'lance-theme-dark';
    document.head.appendChild(darkStyle);
  }
  const rules = Object.entries(theme.darkColors)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');
  darkStyle.textContent = `.dark {\n${rules}\n}`;

  root.style.setProperty('--font-display', theme.fontDisplay);
  root.style.setProperty('--font-body', theme.fontBody);
  root.dataset.theme = theme.id;
  // Re-apply the contrast boost: writing the palette above clears it.
  applyContrastBoost(root);
}

const loadedFontSets = new Set<string>();

function loadThemeFonts(themeId: Theme['id']): void {
  // Fonts are self-hosted now (src/fonts.css + public/fonts, OFL): every
  // family ships with the app, so there is nothing to lazy-load and no
  // third-party request to make — including in the trial. Kept as a no-op
  // guard so callers (applyTheme) stay untouched.
  loadedFontSets.add(themeId);
}
