import type { Theme } from './index';

const RAW_THEMES = [
  { id: 'default', base: '#F8F7F3', secondary: '#EFEFEA', accent: '#FFAD00' },
  { id: 'studio', base: '#FDFAF5', secondary: '#F5F0E8', accent: '#B65B2A' },
  { id: 'terminal', base: '#0D1117', secondary: '#161B22', accent: '#3FB950' },
  { id: 'craft', base: '#FAFAF8', secondary: '#F4F3EF', accent: '#477A9E' },
  { id: 'motion', base: '#FAFAFE', secondary: '#F4F2FF', accent: '#8457EA' },
  { id: 'lens', base: '#1C1814', secondary: '#2A2520', accent: '#D97706' },
  { id: 'scale', base: '#F8F9FC', secondary: '#F0F2F8', accent: '#1E40AF' },
] as const;

function buildPalette(theme: { id: string; base: string; secondary: string; accent: string }) {
  const c = {
    '--bg-primary': '#F8F7F3',
    '--bg-secondary': '#EFEFEA',
    '--bg-card': '#FFFFFF',
    '--border-color': '#E3E2DB',
    '--text-primary': '#181716',
    '--text-secondary': '#68675F',
    '--text-tertiary': '#75756F',
    '--accent': theme.accent,
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
  };

  const d = {
    '--bg-primary': '#111110',
    '--bg-secondary': '#1A1918',
    '--bg-card': '#222120',
    '--border-color': '#2D2C2A',
    '--text-primary': '#F0EFE8',
    '--text-secondary': '#898883',
    '--text-tertiary': '#8E8D88',
    '--accent': theme.accent,
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
  };

  return {
    colors: { ...c, '--colour-base': theme.base, '--colour-secondary': theme.secondary, '--colour-accent': theme.accent },
    darkColors: { ...d, '--colour-base': theme.base, '--colour-secondary': theme.secondary, '--colour-accent': theme.accent },
  };
}

export const THEMES: Theme[] = RAW_THEMES.map(({ id, base, secondary, accent }) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  description: '',
  unlockedBy: 'Always available',
  fontDisplay: "'Playfair Display', serif",
  fontBody: "'Source Sans 3', sans-serif",
  ...buildPalette({ id, base, secondary, accent }),
}));

// Fill descriptions
const descs: Record<string, string> = {
  default: 'Editorial serif, calm and confident',
  studio: 'Warm and artisanal, for design-led freelancers',
  terminal: 'Dark, focused, for developers',
  craft: 'Calm, editorial, for writers and coaches',
  motion: 'High-energy motion theme, for animators and video pros',
  lens: 'Dark and cinematic, for photographers and videographers',
  scale: 'Precise and commanding, for agency owners and consultants',
};

Object.entries(descs).forEach(([id, desc]) => {
  const t = THEMES.find((x) => x.id === id);
  if (t) t.description = desc;
});

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(theme: Theme): void {
  applyThemePalette(theme);
  loadThemeFonts(theme.id);
}

/** High-contrast override, applied as INLINE custom properties. */
export function applyContrastBoost(root: HTMLElement = document.documentElement): void {
  const primary = getComputedStyle(root).getPropertyValue('--text-primary').trim();
  if (!primary) return;
  if (!root.classList.contains('contrast-high')) return;
  root.style.setProperty('--text-secondary', primary);
  root.style.setProperty('--text-tertiary', primary);
  root.style.setProperty('--border-color', primary);
}

/** Write a theme palette onto <html>. Internal; prefer applyTheme(). */
function applyThemePalette(theme: Theme): void {
  const root = document.documentElement;
  const active = root.classList.contains('dark') ? theme.darkColors : theme.colors;
  Object.entries(active).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

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
  applyContrastBoost(root);
}

const loadedFontSets = new Set<string>();

function loadThemeFonts(themeId: Theme['id']): void {
  loadedFontSets.add(themeId);
}
