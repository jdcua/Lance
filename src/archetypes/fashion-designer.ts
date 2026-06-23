import type { ArchetypeConfig } from './types';

const fashionDesigner: ArchetypeConfig = {
  id: 'fashion-designer',
  label: 'Fashion Designer / Stylist',
  emoji: '👗',
  tagline: 'The tool for people who measure success in looks delivered',
  description: 'Built for fashion designers and stylists. Track collections, fittings, and sourcing.',
  psychProfile: 'Thinks in collections, seasons, and fabric swatches. Every look is a deliverable. Sourcing is half the work.',
  icon: 'Shirt',
  theme: 'studio',

  dashboard: {
    greeting: "What are you designing?",
    subgreeting: 'Your collections, fittings, and sourcing at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active collections', query: null as any, format: 'count', color: 'purple' },
      { id: 'upcomingMilestones', label: 'Fittings this week', query: null as any, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Materials cost this month', query: null as any, format: 'currency', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'collection-tracker-widget', component: 'CollectionTrackerWidget', priority: 1 },
      { id: 'sourcing-log-widget', component: 'SourcingLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Collection', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Fitting', action: '/time', icon: 'Clock' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Collections', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Lookbook', icon: 'Package', path: '/assets' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Collection Economics',
    panels: [
      { id: 'revenue-per-collection', title: 'Revenue per Collection', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'material-cost-ratio', title: 'Material Cost Ratio', component: 'MaterialCostPanel', query: 'materialCost', mode: 'quantitative', priority: 2 },
      { id: 'looks-per-collection', title: 'Looks per Collection', component: 'LooksPerCollectionPanel', query: 'looksPerCollection', mode: 'quantitative', priority: 3 },
      { id: 'top-clients-collections', title: 'Top Clients by Collection', component: 'TopClientsPanel', query: 'topClients', mode: 'qualitative', priority: 4 },
      { id: 'seasonal-trend', title: 'Seasonal Revenue Trend', component: 'SeasonalTrendPanel', query: 'seasonalTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'collection-tracker', name: 'Collection Tracker', description: 'Track pieces, fabrics, and status per collection', component: 'CollectionTracker', injectInto: 'projects', position: 'tab' },
    { id: 'sourcing-log', name: 'Sourcing Log', description: 'Log fabric and trim suppliers', component: 'SourcingLog', injectInto: 'finance', position: 'panel' },
    { id: 'fitting-log', name: 'Fitting Log', description: 'Log fittings with notes and alterations', component: 'FittingLog', injectInto: 'time', position: 'tab' },
    { id: 'lookbook', name: 'Lookbook', description: 'Organize final looks with photos', component: 'Lookbook', injectInto: 'assets', position: 'tab' },
  ],

  proposalTypes: ['flat', 'per-look', 'hourly'],
  defaultRateLabel: 'per look',

  aiPrompts: {
    dashboard: 'Analyze my collection pipeline and suggest where to focus.',
    time: 'Help me estimate design time per look.',
    finance: 'Compare my material cost ratio across collections.',
  },
};

export default fashionDesigner;
