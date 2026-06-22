import type { ArchetypeConfig } from './types';

const developer: ArchetypeConfig = {
  id: 'developer',
  label: 'Developer / Engineer',
  emoji: '💻',
  tagline: 'The tool for people who measure success in commits that ship',
  description: 'Optimized for developers. Track sprints, utilization, and effective rates.',
  psychProfile: 'Thinks in sprints and tickets. Optimizes for utilization rate and effective hourly rate. Hates context switching.',
  icon: 'Code2',
  theme: 'terminal',

  dashboard: {
    greeting: "What's shipping today?",
    subgreeting: 'Your utilization, velocity, and active work at a glance.',
    metricCards: [
      { id: 'utilization-rate', label: 'Utilization rate this month', query: null as any, format: 'percent', color: 'green' },
      { id: 'effective-rate', label: 'Effective hourly rate', query: null as any, format: 'currency', color: 'blue' },
      { id: 'active-projects', label: 'Active Projects', query: null as any, format: 'count', color: 'purple' },
      { id: 'unbilled-hours', label: 'Unbilled hours', query: null as any, format: 'hours', color: 'amber' },
    ],
    widgets: [
      { id: 'sprint-board-widget', component: 'SprintBoardWidget', priority: 1 },
      { id: 'unbilled-by-project', component: 'UnbilledByProjectWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Rate Calculator', action: 'rate-calculator', icon: 'Calculator' },
    ],
  },

  sidebar: [
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Utilization & Rate',
    panels: [
      { id: 'utilization-trend', title: 'Utilization Rate Trend (12mo)', component: 'UtilizationTrendPanel', query: 'utilizationTrend', mode: 'quantitative', priority: 1 },
      { id: 'effective-vs-stated', title: 'Effective Rate vs Stated Rate', component: 'EffectiveVsStatedPanel', query: 'effectiveVsStated', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-tech', title: 'Revenue by Technology', component: 'RevenueByTechPanel', query: 'revenueByTech', mode: 'quantitative', priority: 3 },
      { id: 'hours-by-type', title: 'Hours by Project Type', component: 'HoursByTypePanel', query: 'hoursByType', mode: 'quantitative', priority: 4 },
      { id: 'invoice-lag', title: 'Invoice Lag', component: 'InvoiceLagPanel', query: 'invoiceLag', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'sprint-board', name: 'Sprint Board', description: 'Kanban view for project milestones and tasks', component: 'SprintBoard', injectInto: 'projects', position: 'tab' },
    { id: 'stack-logger', name: 'Stack Logger', description: 'Log tech stack used per project', component: 'StackLogger', injectInto: 'projects', position: 'panel' },
    { id: 'bug-log', name: 'Bug/Issue Log', description: 'Lightweight issue tracker per project', component: 'BugLog', injectInto: 'projects', position: 'tab' },
    { id: 'rate-calculator', name: 'Rate Calculator', description: 'Back-calculate required hourly rate from target income', component: 'RateCalculator', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'flat', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my utilization and suggest ways to improve my effective rate.',
    time: 'Help me categorize my time entries by project type.',
    finance: 'Compare my rates against industry benchmarks for my tech stack.',
  },
};

export default developer;
