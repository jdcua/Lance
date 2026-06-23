import type { ArchetypeConfig } from './types';

const seo: ArchetypeConfig = {
  id: 'seo',
  label: 'SEO / Digital Marketer',
  emoji: '🔍',
  tagline: 'The tool for people who measure success in rankings improved',
  description: 'Built for SEO specialists. Track keywords, deliverables, and retainer health.',
  psychProfile: 'Thinks in rankings, traffic, and retainer renewals. Results are slow to show. Reporting proves value.',
  icon: 'Search',
  theme: 'scale',

  dashboard: {
    greeting: "What's ranking today?",
    subgreeting: 'Your keywords, deliverables, and retainer health at a glance.',
    metricCards: [
      { id: 'activeRetainers', label: 'Active retainers', query: null as any, format: 'count', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null as any, format: 'count', color: 'blue' },
      { id: 'draftsCount', label: 'Deliverables pending', query: null as any, format: 'count', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'keyword-tracker-widget', component: 'KeywordTrackerWidget', priority: 1 },
      { id: 'deliverable-tracker-widget', component: 'DeliverableTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Deliverable', action: '/projects', icon: 'CheckSquare' },
      { label: 'Log Report', action: 'report-log', icon: 'FileText' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Retainer Health',
    panels: [
      { id: 'retainer-renewal', title: 'Retainer Renewal Rate', component: 'RetainerRenewalPanel', query: 'retainerRenewal', mode: 'quantitative', priority: 1 },
      { id: 'deliverable-completion', title: 'Deliverable Completion Rate', component: 'DeliverableCompletionPanel', query: 'deliverableCompletion', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-service', title: 'Revenue by Service Type', component: 'RevenueByServicePanel', query: 'revenueByService', mode: 'qualitative', priority: 3 },
      { id: 'client-health', title: 'Client Health Scores', component: 'ClientHealthPanel', query: 'clientHealth', mode: 'qualitative', priority: 4 },
      { id: 'avg-retainer-duration', title: 'Avg Retainer Duration', component: 'AvgRetainerDurationPanel', query: 'avgRetainerDuration', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'keyword-tracker', name: 'Keyword Tracker', description: 'Track keyword positions per client', component: 'KeywordTracker', injectInto: 'clients', position: 'panel' },
    { id: 'deliverable-tracker', name: 'Deliverable Tracker', description: 'Track deliverables completed vs promised', component: 'DeliverableTracker', injectInto: 'projects', position: 'tab' },
    { id: 'report-log', name: 'Report Log', description: 'Log monthly reports delivered', component: 'ReportLog', injectInto: 'clients', position: 'tab' },
    { id: 'retainer-health-score', name: 'Retainer Health Score', description: 'Composite score for retainer clients', component: 'RetainerHealthScore', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['retainer', 'flat', 'hourly'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my retainer health and flag at-risk clients.',
    time: 'Help me estimate hours for similar SEO projects.',
    finance: 'Compare my retainer rates and suggest pricing for new clients.',
  },
};

export default seo;
