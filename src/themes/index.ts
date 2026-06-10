export type ThemeId = 'default' | 'studio' | 'terminal' | 'craft';

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  unlockedBy: string;
  colors: Record<string, string>;
  fontDisplay: string;
  fontBody: string;
};
