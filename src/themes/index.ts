export type ThemeId = 'default' | 'studio' | 'terminal' | 'craft' | 'motion' | 'lens' | 'scale';

export interface ColorScheme {
  base: string;
  secondary: string;
  accent: string;
}

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  unlockedBy: string;
  fontDisplay: string;
  fontBody: string;
  colors: Record<string, string>;
  darkColors: Record<string, string>;
};