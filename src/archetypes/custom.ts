import type { ArchetypeConfig } from './types';

const custom: ArchetypeConfig = {
  id: 'custom',
  label: 'Custom Archetype',
  emoji: '⚙️',
  tagline: 'Build your own workspace',
  description: 'A fully customizable workspace. Pick and choose features from every profession.',
  psychProfile: 'You know exactly what you need. Build it your way.',
  icon: 'Settings2',
  theme: 'default',

  dashboard: {
    greeting: 'Welcome back',
    subgreeting: 'Your custom workspace at a glance.',
    metricCards: [
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
      { id: 'totalPaidRevenue', label: 'Paid (Lifetime)', query: null, format: 'currency', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active Projects', query: null, format: 'count', color: 'green' },
      { id: 'todaysHours', label: 'Today', query: null, format: 'hours', color: 'green' },
    ],
    widgets: [
      { id: 'recent-invoices', component: 'RecentInvoices', priority: 1 },
      { id: 'recent-time', component: 'RecentTime', priority: 2 },
    ],
    quickActions: [
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Business Overview',
    panels: [
      { id: 'project-health', title: 'Project Health', component: 'ProjectHealthPanel', query: 'projectHealth', mode: 'quantitative', priority: 1 },
      { id: 'financial-health', title: 'Financial Health', component: 'FinancialHealthPanel', query: 'financialHealth', mode: 'quantitative', priority: 2 },
      { id: 'top-clients', title: 'Top Clients by Revenue', component: 'TopClientsPanel', query: 'topClients', mode: 'quantitative', priority: 3 },
      { id: 'top-projects', title: 'Top Projects by Time', component: 'TopProjectsPanel', query: 'topProjects', mode: 'quantitative', priority: 4 },
    ],
    hidePanels: [],
  },

  archetypeFeatures: [],
  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Summarize my freelance business health.',
    proposals: 'Help me draft a compelling proposal.',
    finance: 'Analyze my financial data.',
  },
};

export default custom;
