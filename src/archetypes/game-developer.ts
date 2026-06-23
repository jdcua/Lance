import type { ArchetypeConfig } from './types';

const gameDeveloper: ArchetypeConfig = {
  id: 'game-developer',
  label: 'Game Developer',
  emoji: '🎮',
  tagline: 'The tool for people who measure success in milestones shipped',
  description: 'Built for game developers. Track features, QA, builds, and scope.',
  psychProfile: 'Thinks in milestones and feature lists. Scope creep is the enemy. QA time is always underestimated.',
  icon: 'Gamepad2',
  theme: 'terminal',

  dashboard: {
    greeting: "What's building today?",
    subgreeting: 'Your features, QA, and builds at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null as any, format: 'count', color: 'green' },
      { id: 'unbilledHours', label: 'Unbilled hours', query: null as any, format: 'hours', color: 'amber' },
      { id: 'upcomingMilestones', label: 'Upcoming milestones', query: null as any, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'feature-scope-widget', component: 'FeatureScopeWidget', priority: 1 },
      { id: 'build-log-widget', component: 'BuildLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Build', action: 'build-log', icon: 'Package' },
      { label: 'Log QA', action: 'qa-log', icon: 'Bug' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Development Velocity',
    panels: [
      { id: 'estimated-vs-actual', title: 'Estimated vs Actual Hours', component: 'EstimatedVsActualPanel', query: 'estimatedVsActual', mode: 'quantitative', priority: 1 },
      { id: 'qa-time-ratio', title: 'QA Time Ratio', component: 'QATimeRatioPanel', query: 'qaTimeRatio', mode: 'quantitative', priority: 2 },
      { id: 'scope-change', title: 'Feature Scope Change Frequency', component: 'ScopeChangePanel', query: 'scopeChange', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-platform', title: 'Revenue by Platform/Engine', component: 'RevenueByPlatformPanel', query: 'revenueByPlatform', mode: 'quantitative', priority: 4 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'feature-scope-board', name: 'Feature Scope Board', description: 'Kanban-lite for project features', component: 'FeatureScopeBoard', injectInto: 'projects', position: 'tab' },
    { id: 'platform-log', name: 'Platform Log', description: 'Tag projects by engine and target platform', component: 'PlatformLog', injectInto: 'projects', position: 'panel' },
    { id: 'qa-log', name: 'QA Log', description: 'Log QA sessions with bugs found/fixed', component: 'QALog', injectInto: 'time', position: 'tab' },
    { id: 'build-log', name: 'Build Log', description: 'Log builds delivered with version and platform', component: 'BuildLog', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'milestone'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my development velocity and flag scope creep.',
    time: 'Help me estimate QA time based on feature count.',
    finance: 'Compare my revenue across different platforms and engines.',
  },
};

export default gameDeveloper;
