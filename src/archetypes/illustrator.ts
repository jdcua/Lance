import type { ArchetypeConfig } from './types';

const illustrator: ArchetypeConfig = {
  id: 'illustrator',
  label: 'Illustrator / Artist',
  emoji: '🖌️',
  tagline: 'The tool for people who measure success in commissions completed',
  description: 'Built for illustrators and artists. Track commissions, styles, and licensing revenue.',
  psychProfile: 'Thinks in commissions. Has a style and clients either respect it or don\'t. Revision limits are sacred.',
  icon: 'Paintbrush',
  theme: 'studio',

  dashboard: {
    greeting: 'What are you drawing today?',
    subgreeting: 'Your commissions, queue, and licensing at a glance.',
    metricCards: [
      { id: 'open-commissions', label: 'Open commissions', query: null as any, format: 'count', color: 'purple' },
      { id: 'active-projects', label: 'Queue position', query: null as any, format: 'count', color: 'blue' },
      { id: 'paid-revenue', label: 'Paid this month', query: null as any, format: 'currency', color: 'green' },
      { id: 'revisions-remaining', label: 'Revision rounds remaining', query: null as any, format: 'text', color: 'amber' },
    ],
    widgets: [
      { id: 'commission-queue-widget', component: 'CommissionQueueWidget', priority: 1 },
      { id: 'reference-board-widget', component: 'ReferenceBoardWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Commission', action: '/projects', icon: 'FolderKanban' },
      { label: 'Upload Art', action: '/assets', icon: 'Upload' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Commissions', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Portfolio', icon: 'Package', path: '/assets' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Commission Economics',
    panels: [
      { id: 'revenue-by-style', title: 'Revenue by Style Type', component: 'RevenueByStylePanel', query: 'revenueByStyle', mode: 'qualitative', priority: 1 },
      { id: 'licensing-vs-commission', title: 'Licensing vs Commission Revenue', component: 'LicensingVsCommissionPanel', query: 'licensingVsCommission', mode: 'quantitative', priority: 2 },
      { id: 'revision-rounds', title: 'Revision Rounds per Client', component: 'RevisionRoundsPanel', query: 'revisionRounds', mode: 'qualitative', priority: 3 },
      { id: 'queue-velocity', title: 'Queue Velocity (Commissions/month)', component: 'QueueVelocityPanel', query: 'queueVelocity', mode: 'quantitative', priority: 4 },
      { id: 'top-clients-commissions', title: 'Top Clients by Commission Count', component: 'TopClientsCommissionsPanel', query: 'topClientsCommissions', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'commission-queue', name: 'Commission Queue', description: 'Ordered commission list with drag-to-reorder', component: 'CommissionQueue', injectInto: 'projects', position: 'tab' },
    { id: 'style-tag-system', name: 'Style Tag System', description: 'Tag projects by illustration style', component: 'StyleTagSystem', injectInto: 'projects', position: 'panel' },
    { id: 'licensing-tracker', name: 'Licensing Tracker', description: 'Log license types and fees per asset', component: 'LicensingTracker', injectInto: 'assets', position: 'panel' },
    { id: 'reference-board', name: 'Reference Board', description: 'Attach reference images per commission', component: 'ReferenceBoard', injectInto: 'projects', position: 'tab' },
    { id: 'commission-tos', name: 'Commission TOS', description: 'Store and auto-attach Terms of Service', component: 'CommissionTOS', injectInto: 'proposals', position: 'panel' },
  ],

  proposalTypes: ['flat', 'per-piece', 'hourly'],
  defaultRateLabel: 'per commission',

  aiPrompts: {
    dashboard: 'Analyze my commission queue and suggest which projects to prioritize.',
    proposals: 'Help me scope illustration projects based on past commission data.',
    finance: 'Compare my commission rates across different art styles.',
  },
};

export default illustrator;
