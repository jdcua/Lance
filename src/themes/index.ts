export type ThemeId = 'default' | 'studio' | 'terminal' | 'craft' | 'motion' | 'lens' | 'scale';

export type Profession =
  | 'writer'
  | 'developer'
  | 'designer'
  | 'animator'
  | 'photographer'
  | 'consultant'
  | 'filmmaker'
  | 'illustrator'
  | '3d-artist'
  | 'game-developer'
  | 'ux-designer'
  | 'marketing'
  | 'social-media'
  | 'copywriter'
  | 'musician'
  | 'architect'
  | 'virtual-assistant'
  | 'translator'
  | 'seo'
  | 'data-analyst'
  | 'custom';

export const PROFESSION_THEME: Record<Profession, ThemeId> = {
  writer: 'craft',
  developer: 'terminal',
  designer: 'studio',
  animator: 'motion',
  photographer: 'lens',
  consultant: 'scale',
  filmmaker: 'lens',
  illustrator: 'studio',
  '3d-artist': 'motion',
  'game-developer': 'terminal',
  'ux-designer': 'studio',
  marketing: 'scale',
  'social-media': 'motion',
  copywriter: 'craft',
  musician: 'motion',
  architect: 'scale',
  'virtual-assistant': 'default',
  translator: 'craft',
  seo: 'scale',
  'data-analyst': 'terminal',
  custom: 'default',
};

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  unlockedBy: string;
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  fontDisplay: string;
  fontBody: string;
};
