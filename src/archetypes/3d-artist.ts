import type { ArchetypeConfig } from './types';

const threeDArtist: ArchetypeConfig = {
  id: '3d-artist',
  label: '3D Artist / Modeler',
  emoji: '🗿',
  tagline: 'The tool for people who measure success in polygons rendered',
  description: 'Built for 3D artists. Track renders, asset complexity, and software costs.',
  psychProfile: 'Thinks in polygons and render farms. Render time is a cost. Software subscriptions are significant.',
  icon: 'Box',
  theme: 'motion',

  dashboard: {
    greeting: "What's rendering today?",
    subgreeting: 'Your renders, complexity, and software costs at a glance.',
    metricCards: [
      { id: 'active-projects', label: 'Active projects', query: null as any, format: 'count', color: 'blue' },
      { id: 'unbilled-render', label: 'Unbilled render hours', query: null as any, format: 'hours', color: 'amber' },
      { id: 'hours-active-week', label: 'Hours this week', query: null as any, format: 'hours', color: 'green' },
      { id: 'expenses-total', label: 'Software costs (monthly)', query: null as any, format: 'currency', color: 'red' },
    ],
    widgets: [
      { id: 'render-log-widget', component: 'RenderLogWidget', priority: 1 },
      { id: 'asset-complexity-widget', component: 'AssetComplexityWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Render', action: 'render-log', icon: 'Monitor' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Expense', action: '/finance', icon: 'BarChart3' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Render Economics',
    panels: [
      { id: 'render-vs-billable', title: 'Render Time vs Billable Time', component: 'RenderVsBillablePanel', query: 'renderVsBillable', mode: 'quantitative', priority: 1 },
      { id: 'revenue-by-type', title: 'Revenue by Project Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 2 },
      { id: 'software-cost', title: 'Software Cost vs Revenue', component: 'SoftwareCostPanel', query: 'softwareCost', mode: 'quantitative', priority: 3 },
      { id: 'complexity-rate', title: 'Complexity vs Rate Correlation', component: 'ComplexityRatePanel', query: 'complexityRate', mode: 'quantitative', priority: 4 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'render-log', name: 'Render Log', description: 'Log render jobs with software, machine, and resolution', component: 'RenderLog', injectInto: 'time', position: 'tab' },
    { id: 'asset-complexity-log', name: 'Asset Complexity Log', description: 'Log poly count and texture complexity per project', component: 'AssetComplexityLog', injectInto: 'projects', position: 'panel' },
    { id: 'software-subscription-tracker', name: 'Software Subscription Tracker', description: 'Track recurring software costs', component: 'SoftwareSubscriptionTracker', injectInto: 'finance', position: 'panel' },
    { id: 'deliverable-format-log', name: 'Deliverable Format Log', description: 'Log formats and specs delivered per project', component: 'DeliverableFormatLog', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my render time and suggest where I can optimize.',
    time: 'Help me estimate render time for similar complexity projects.',
    finance: 'Compare my software costs to my revenue and suggest optimizations.',
  },
};

export default threeDArtist;
