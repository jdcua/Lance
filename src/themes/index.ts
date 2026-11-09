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
  colors: {
    --bg-primary: string;
    --bg-secondary: string;
    --bg-card: string;
    --border-color: string;
    --text-primary: string;
    --text-secondary: string;
    --text-tertiary: string;
    --accent-on: string;
    --accent-ink: string;
    --accent-hover: string;
    --accent-bg: string;
    --warning: string;
    --danger: string;
    --danger-bg: string;
    --info-bg: string;
    --warning-bg: string;
    --card-shadow: string;
    --card-hover-shadow: string;
    --info: string;
    --info-ink: string;
    --info-border: string;
    --warning-text: string;
    --danger-hover: string;
    --accent-active: string;
    --neutral-border: string;
    --medium-conf-bg: string;
    --medium-conf-text: string;
    --metric-blue: string;
    --metric-purple: string;
  };
  darkColors: {
    --bg-primary: string;
    --bg-secondary: string;
    --bg-card: string;
    --border-color: string;
    --text-primary: string;
    --text-secondary: string;
    --text-tertiary: string;
    --accent-on: string;
    --accent-ink: string;
    --accent-hover: string;
    --accent-bg: string;
    --warning: string;
    --danger: string;
    --danger-bg: string;
    --info-bg: string;
    --warning-bg: string;
    --card-shadow: string;
    --card-hover-shadow: string;
    --info: string;
    --info-ink: string;
    --info-border: string;
    --warning-text: string;
    --danger-hover: string;
    --accent-active: string;
    --neutral-border: string;
    --medium-conf-bg: string;
    --medium-conf-text: string;
    --metric-blue: string;
    --metric-purple: string;
  };
}
