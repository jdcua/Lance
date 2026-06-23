import type { ArchetypeConfig } from './types';

const cxStrategist: ArchetypeConfig = {
  id: 'cx-strategist',
  label: 'CX / Customer Experience Strategist',
  emoji: '💫',
  tagline: 'The tool for people who measure success in NPS points gained',
  description: 'Built for CX strategists. Track journey maps, customer feedback, and service improvements.',
  psychProfile: 'Thinks in journeys, touchpoints, and satisfaction scores. Every customer interaction is a data point. Service blueprints are the deliverable.',
  icon: 'Smile',
  theme: 'scale',

  dashboard: {
    greeting: "What's the customer saying?",
    subgreeting: 'Your journey maps, satisfaction scores, and initiatives at a glance.',
    metricCards: [
      { id: 'active-projects', label: 'Active CX initiatives', query: null as any, format: 'count', color: 'blue' },
      { id: 'clients-count', label: 'Clients under management', query: null as any, format: 'count', color: 'green' },
      { id: 'draft-proposals', label: 'Initiatives pending deployment', query: null as any, format: 'count', color: 'purple' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'journey-map-widget', component: 'JourneyMapWidget', priority: 1 },
      { id: 'satisfaction-trend-widget', component: 'SatisfactionTrendWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Initiative', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Feedback', action: '/clients', icon: 'MessageSquare' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Initiatives', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Journey Maps', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Experience Impact',
    panels: [
      { id: 'satisfaction-trend', title: 'Satisfaction Score Trend', component: 'SatisfactionTrendPanel', query: 'satisfactionTrend', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-initiative', title: 'Revenue per Initiative', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'touchpoint-impact', title: 'Impact by Touchpoint', component: 'TouchpointImpactPanel', query: 'touchpointImpact', mode: 'qualitative', priority: 3 },
      { id: 'initiative-completion', title: 'Initiative Completion Rate', component: 'InitiativeCompletionPanel', query: 'initiativeCompletion', mode: 'quantitative', priority: 4 },
      { id: 'client-health-score', title: 'Client Health Score', component: 'ClientHealthPanel', query: 'clientHealth', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'journey-map-builder', name: 'Journey Map Builder', description: 'Build customer journey maps', component: 'JourneyMapBuilder', injectInto: 'projects', position: 'tab' },
    { id: 'feedback-aggregator', name: 'Feedback Aggregator', description: 'Aggregate and categorize customer feedback', component: 'FeedbackAggregator', injectInto: 'clients', position: 'panel' },
    { id: 'service-blueprint', name: 'Service Blueprint', description: 'Document service processes', component: 'ServiceBlueprint', injectInto: 'projects', position: 'tab' },
    { id: 'impact-measurement', name: 'Impact Measurement', description: 'Track initiative impact on satisfaction', component: 'ImpactMeasurement', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['retainer', 'flat', 'hourly'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my CX initiatives and flag clients with declining satisfaction.',
    time: 'Help me estimate journey mapping time by scope.',
    finance: 'Compare my retainer value against client satisfaction improvements.',
  },
};

export default cxStrategist;
