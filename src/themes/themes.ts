import type { Theme } from './index';

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean, modern, and balanced',
    unlockedBy: 'Always available',
    fontDisplay: "'DM Sans', sans-serif",
    fontBody: "'Inter', sans-serif",
    colors: {
      '--bg-primary': '#FAFAF9',
      '--bg-secondary': '#F2F2F0',
      '--bg-card': '#FFFFFF',
      '--border-color': 'rgba(0,0,0,0.07)',
      '--text-primary': '#1C1C1A',
      '--text-secondary': '#6B6B67',
      '--text-tertiary': '#A3A39E',
      '--accent': '#1D9E75',
      '--accent-hover': '#178F68',
      '--accent-bg': 'rgba(29,158,117,0.06)',
      '--warning': '#F59E0B',
      '--danger': '#A32D2D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.08)',
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
      '--text-tertiary': '#B09A8C',
      '--accent': '#C4622D',
      '--accent-hover': '#A84E22',
      '--accent-bg': 'rgba(196,98,45,0.08)',
      '--warning': '#D97706',
      '--danger': '#A32D2D',
      '--card-shadow': '0 1px 3px rgba(100,60,30,0.06), 0 1px 2px rgba(100,60,30,0.04)',
      '--card-hover-shadow': '0 4px 12px rgba(100,60,30,0.08)',
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
      '--text-secondary': '#8B949E',
      '--text-tertiary': '#484F58',
      '--accent': '#3FB950',
      '--accent-hover': '#2EA043',
      '--accent-bg': 'rgba(63,185,80,0.08)',
      '--warning': '#D29922',
      '--danger': '#F85149',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.35)',
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
      '--text-tertiary': '#A8A59E',
      '--accent': '#4A7FA5',
      '--accent-hover': '#3A6A8C',
      '--accent-bg': 'rgba(74,127,165,0.08)',
      '--warning': '#D97706',
      '--danger': '#A32D2D',
      '--card-shadow': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      '--card-hover-shadow': '0 4px 12px rgba(0,0,0,0.06)',
    },
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.style.setProperty('--font-display', theme.fontDisplay);
  root.style.setProperty('--font-body', theme.fontBody);
  root.dataset.theme = theme.id;

  // Load theme-specific fonts if needed
  loadThemeFonts(theme.id);
}

const loadedFontSets = new Set<string>();

function loadThemeFonts(themeId: Theme['id']): void {
  const fontUrls: Record<string, string> = {
    default: 'dm-sans:400,500,600|inter:400,500',
    studio: 'playfair-display:400,500,600|source-serif-4:400,500',
    terminal: '', // JetBrains Mono already loaded by default
    craft: 'lora:400,500,600|source-sans-3:400,500',
  };

  const url = fontUrls[themeId];
  if (!url || loadedFontSets.has(themeId)) return;

  const link = document.createElement('link');
  link.href = `https://fonts.bunny.net/css?family=${url}`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  loadedFontSets.add(themeId);
}
