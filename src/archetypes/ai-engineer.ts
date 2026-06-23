import type { ArchetypeConfig } from './types';

const aiEngineer: ArchetypeConfig = {
  id: 'ai-engineer',
  label: 'AI / ML Engineer',
  emoji: '🤖',
  tagline: 'The tool for people who measure success in models deployed',
  description: 'Built for AI and ML engineers. Track experiments, compute costs, and model iterations.',
  psychProfile: 'Thinks in experiments, datasets, and model metrics. Compute cost is a real line item. Every training run costs money.',
  icon: 'Bot',
  theme: 'terminal',

  dashboard: {
    greeting: "What's training?",
    subgreeting: 'Your experiments, compute, and deployments at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active experiments', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Compute cost this month', query: null, format: 'currency', color: 'red' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'experiment-tracker-widget', component: 'ExperimentTrackerWidget', priority: 1 },
      { id: 'model-registry-widget', component: 'ModelRegistryWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Experiment', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Compute', action: '/finance', icon: 'Cloud' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Experiments', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Compute Costs', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Datasets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'ML Economics',
    panels: [
      { id: 'compute-cost-trend', title: 'Compute Cost Trend', component: 'ComputeCostPanel', query: 'computeCost', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-experiment', title: 'Revenue per Experiment', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'model-iteration-count', title: 'Model Iterations per Project', component: 'ModelIterationsPanel', query: 'modelIterations', mode: 'quantitative', priority: 3 },
      { id: 'infra-cost-ratio', title: 'Infrastructure Cost Ratio', component: 'InfraCostPanel', query: 'infraCost', mode: 'quantitative', priority: 4 },
      { id: 'deployment-frequency', title: 'Deployment Frequency', component: 'DeploymentFrequencyPanel', query: 'deploymentFrequency', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'experiment-tracker', name: 'Experiment Tracker', description: 'Log experiments with metrics and params', component: 'ExperimentTracker', injectInto: 'projects', position: 'tab' },
    { id: 'model-registry', name: 'Model Registry', description: 'Track model versions and deployment status', component: 'ModelRegistry', injectInto: 'projects', position: 'panel' },
    { id: 'compute-cost-log', name: 'Compute Cost Log', description: 'Log GPU and API costs per experiment', component: 'ComputeCostLog', injectInto: 'finance', position: 'tab' },
    { id: 'dataset-versioning', name: 'Dataset Versioning', description: 'Track dataset versions and preprocessing', component: 'DatasetVersioning', injectInto: 'assets', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'flat', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my compute costs and suggest optimization strategies.',
    time: 'Help me estimate experiment hours based on past projects.',
    finance: 'Compare my compute cost to revenue ratio across experiments.',
  },
};

export default aiEngineer;
