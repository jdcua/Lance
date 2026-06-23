import type { ArchetypeConfig } from './types';

const productManager: ArchetypeConfig = {
  id: 'product-manager',
  label: 'Product Manager',
  emoji: '🚀',
  tagline: 'The tool for people who measure success in features shipped',
  description: 'Built for product managers. Track roadmaps, features, and stakeholder alignment.',
  psychProfile: 'Thinks in roadmaps, features, and user impact. Every feature competes for priority. Stakeholder alignment is the real job.',
  icon: 'Rocket',
  theme: 'scale',

  dashboard: {
    greeting: "What's on the roadmap?",
    subgreeting: 'Your features, priorities, and velocity at a glance.',
    metricCards: [
      { id: 'active-projects', label: 'Active initiatives', query: null as any, format: 'count', color: 'blue' },
      { id: 'upcoming-milestones', label: 'Features shipping this week', query: null as any, format: 'count', color: 'green' },
      { id: 'draft-proposals', label: 'Features in discovery', query: null as any, format: 'count', color: 'purple' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'roadmap-widget', component: 'RoadmapWidget', priority: 1 },
      { id: 'feature-priority-widget', component: 'FeaturePriorityWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Initiative', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Feature', action: '/projects', icon: 'Plus' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Initiatives', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Docs', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Product Velocity',
    panels: [
      { id: 'features-per-cycle', title: 'Features per Cycle', component: 'FeaturesPerCyclePanel', query: 'featuresPerCycle', mode: 'quantitative', priority: 1 },
      { id: 'discovery-to-ship', title: 'Discovery to Ship Time', component: 'DiscoveryToShipPanel', query: 'discoveryToShip', mode: 'quantitative', priority: 2 },
      { id: 'feature-impact-score', title: 'Feature Impact Score', component: 'FeatureImpactPanel', query: 'featureImpact', mode: 'qualitative', priority: 3 },
      { id: 'revenue-per-initiative', title: 'Revenue per Initiative', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 4 },
      { id: 'stakeholder-alignment', title: 'Stakeholder Alignment Score', component: 'StakeholderAlignmentPanel', query: 'stakeholderAlignment', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'roadmap-view', name: 'Roadmap View', description: 'Visual roadmap with milestones', component: 'RoadmapView', injectInto: 'projects', position: 'tab' },
    { id: 'feature-prioritization', name: 'Feature Prioritization', description: 'Score and rank features', component: 'FeaturePrioritization', injectInto: 'projects', position: 'panel' },
    { id: 'stakeholder-log', name: 'Stakeholder Log', description: 'Track stakeholder feedback and decisions', component: 'StakeholderLog', injectInto: 'clients', position: 'panel' },
    { id: 'product-spec-builder', name: 'Product Spec Builder', description: 'Build structured product specs', component: 'ProductSpecBuilder', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'retainer'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my product roadmap and flag initiatives at risk.',
    time: 'Help me scope feature work based on past delivery data.',
    finance: 'Compare my initiative ROI across different product areas.',
  },
};

export default productManager;
