import Database from '@tauri-apps/plugin-sql';

export interface MetricCardDef {
  id: string;
  label: string;
  query?: ((db: Database, profileId: number) => Promise<string | number>) | null;
  format: 'currency' | 'hours' | 'count' | 'percent' | 'text';
  color?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
  tooltip?: string;
}

export interface WidgetDef {
  id: string;
  component: string;
  priority: number;
  props?: Record<string, unknown>;
}

export interface SidebarItemDef {
  id: string;
  label: string;
  icon: string;
  path: string;
  archetypeOnly?: boolean;
  badge?: 'count' | 'alert' | 'new';
}

export interface InsightPanelDef {
  id: string;
  title: string;
  component: string;
  query: string;
  mode: 'quantitative' | 'qualitative';
  priority: number;
}

export interface ArchetypeFeatureDef {
  id: string;
  name: string;
  description: string;
  component: string;
  route?: string;
  injectInto?: string;
  position?: 'tab' | 'panel' | 'sidebar-widget' | 'modal';
}

export interface ArchetypeConfig {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
  psychProfile: string;
  icon: string;
  theme: string;

  dashboard: {
    greeting: string;
    subgreeting: string;
    metricCards: MetricCardDef[];
    widgets: WidgetDef[];
    quickActions: Array<{ label: string; action: string; icon: string }>;
  };

  sidebar: SidebarItemDef[];

  insights: {
    mode: 'quantitative' | 'qualitative' | 'hybrid';
    headline: string;
    panels: InsightPanelDef[];
    hidePanels: string[];
  };

  archetypeFeatures: ArchetypeFeatureDef[];

  proposalTypes: string[];
  defaultRateLabel: string;

  contractPresets: ContractPresetDef[];

  depositPercentage?: number;
  paymentTerms?: number;
  maxRevisions?: number;

  aiPrompts: Record<string, string>;
}

export type ContractPresetDef = {
  name: string;
  category: string;
  body: string;
  variables: string[];
};

export type ArchetypeId =
  | 'default'
  | 'animator'
  | 'developer'
  | 'designer'
  | 'photographer'
  | 'writer'
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
