export type ThemeId = 'default' | 'studio' | 'terminal' | 'craft' | 'motion' | 'lens' | 'scale';

export type Profession = 'writer' | 'developer' | 'designer' | 'animator' | 'photographer' | 'consultant';

export const PROFESSION_THEME: Record<Profession, ThemeId> = {
  writer: 'craft',
  developer: 'terminal',
  designer: 'studio',
  animator: 'motion',
  photographer: 'lens',
  consultant: 'scale',
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
