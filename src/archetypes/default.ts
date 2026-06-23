import type { ArchetypeConfig } from './types';

const defaultArchetype: ArchetypeConfig = {
  id: 'default',
  label: 'General Freelancer',
  emoji: '💼',
  tagline: 'The flexible tool for independent professionals',
  description: 'A balanced workspace for any freelance professional. All the essentials, nothing extra.',
  psychProfile: 'Thinks in projects, clients, and invoices. Wants clarity on cash flow and deadlines.',
  icon: 'Briefcase',
  theme: 'default',

  dashboard: {
    greeting: 'Welcome back',
    subgreeting: 'Here\'s your business at a glance.',
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
      { id: 'client-performance', title: 'Client Performance', component: 'ClientPerformancePanel', query: 'clientPerformance', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: [],
  },

  archetypeFeatures: [],
  proposalTypes: ['flat', 'hourly'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Summarize my freelance business health based on current metrics.',
    proposals: 'Help me draft a compelling proposal.',
    finance: 'Analyze my financial data and suggest optimizations.',
  },
};

export default defaultArchetype;
