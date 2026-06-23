import type { ArchetypeConfig } from './types';

const growth: ArchetypeConfig = {
  id: 'growth',
  label: 'Growth Hacker / CRO',
  emoji: '📈',
  tagline: 'The tool for people who measure success in conversion rates lifted',
  description: 'Built for growth hackers and CRO specialists. Track experiments, funnels, and conversion metrics.',
  psychProfile: 'Thinks in experiments, funnels, and conversion rates. Every test teaches something. Statistical significance is non-negotiable.',
  icon: 'TrendingUp',
  theme: 'scale',

  dashboard: {
    greeting: "What's testing today?",
    subgreeting: 'Your experiments, funnels, and conversion rates at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active experiments', query: null, format: 'count', color: 'blue' },
      { id: 'projectsCompleted', label: 'Experiments completed this month', query: null, format: 'count', color: 'green' },
      { id: 'draftsCount', label: 'Experiments in design', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'experiment-tracker-widget', component: 'ExperimentTrackerWidget', priority: 1 },
      { id: 'funnel-metrics-widget', component: 'FunnelMetricsWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Experiment', action: '/projects', icon: 'Plus' },
      { label: 'Log Metric', action: '/clients', icon: 'BarChart3' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Experiments', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Experiment Velocity',
    panels: [
      { id: 'experiment-win-rate', title: 'Experiment Win Rate', component: 'ExperimentWinPanel', query: 'experimentWin', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-experiment', title: 'Revenue per Experiment', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'lift-distribution', title: 'Lift Distribution by Type', component: 'LiftDistributionPanel', query: 'liftDistribution', mode: 'quantitative', priority: 3 },
      { id: 'funnel-stage-impact', title: 'Impact by Funnel Stage', component: 'FunnelStageImpactPanel', query: 'funnelStageImpact', mode: 'quantitative', priority: 4 },
      { id: 'test-velocity', title: 'Test Velocity Over Time', component: 'TestVelocityPanel', query: 'testVelocity', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'experiment-log', name: 'Experiment Log', description: 'Log A/B tests with hypothesis and results', component: 'ExperimentLog', injectInto: 'projects', position: 'tab' },
    { id: 'funnel-tracker', name: 'Funnel Tracker', description: 'Track conversion funnel by stage', component: 'FunnelTracker', injectInto: 'clients', position: 'panel' },
    { id: 'metric-snapshot', name: 'Metric Snapshot', description: 'Capture conversion metrics per period', component: 'MetricSnapshot', injectInto: 'clients', position: 'tab' },
    { id: 'hypothesis-backlog', name: 'Hypothesis Backlog', description: 'Manage experiment ideas and ICE scores', component: 'HypothesisBacklog', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['retainer', 'flat', 'hourly'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my experiment pipeline and suggest next tests.',
    time: 'Help me estimate experiment run time for statistical significance.',
    finance: 'Compare my retainer rates against client conversion lift.',
  },
};

export default growth;
