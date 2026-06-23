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
  | 'custom'
  | 'advertiser'
  | 'project-manager'
  | 'accountant'
  | 'event-planner'
  | 'voice-actor'
  | 'tutor'
  | 'wellness'
  | 'legal'
  | 'fashion-designer'
  | 'devops'
  | 'cybersecurity'
  | 'ai-engineer'
  | 'embedded'
  | 'blockchain'
  | 'product-manager'
  | 'growth'
  | 'cx-strategist'
  | 'recruiter'
  | 'trainer'
  | 'nutritionist'
  | 'real-estate';

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
  advertiser: 'scale',
  'project-manager': 'scale',
  accountant: 'default',
  'event-planner': 'studio',
  'voice-actor': 'motion',
  tutor: 'craft',
  wellness: 'craft',
  legal: 'scale',
  'fashion-designer': 'studio',
  devops: 'terminal',
  cybersecurity: 'terminal',
  'ai-engineer': 'terminal',
  embedded: 'terminal',
  blockchain: 'terminal',
  'product-manager': 'scale',
  growth: 'scale',
  'cx-strategist': 'scale',
  recruiter: 'scale',
  trainer: 'motion',
  nutritionist: 'craft',
  'real-estate': 'scale',
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
