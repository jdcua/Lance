import type { ArchetypeConfig } from './types';

const musician: ArchetypeConfig = {
  id: 'musician',
  label: 'Musician / Audio Producer',
  emoji: '🎵',
  tagline: 'The tool for people who measure success in stems delivered',
  description: 'Built for musicians and audio producers. Track sessions, stems, and sync licensing.',
  psychProfile: 'Thinks in sessions, stems, and sync deals. Licensing is potentially bigger than project revenue.',
  icon: 'Music',
  theme: 'motion',

  dashboard: {
    greeting: "What's playing today?",
    subgreeting: 'Your sessions, stems, and licensing at a glance.',
    metricCards: [
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null as any, format: 'count', color: 'blue' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null as any, format: 'count', color: 'purple' },
      { id: 'totalPaidRevenue', label: 'Revenue this month', query: null as any, format: 'currency', color: 'green' },
      { id: 'expensesTotal', label: 'Studio costs this month', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'session-log-widget', component: 'SessionLogWidget', priority: 1 },
      { id: 'sync-license-widget', component: 'SyncLicenseWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Session', action: 'session-log', icon: 'Music' },
      { label: 'Log Stem', action: '/projects', icon: 'FileAudio' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Sessions', icon: 'Clock', path: '/time' },
    { id: 'assets', label: 'Audio Library', icon: 'Package', path: '/assets' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Sound Economics',
    panels: [
      { id: 'session-hours-type', title: 'Session Hours by Project Type', component: 'SessionHoursPanel', query: 'sessionHours', mode: 'quantitative', priority: 1 },
      { id: 'licensing-vs-project', title: 'Licensing vs Project Revenue', component: 'LicensingVsProjectPanel', query: 'licensingVsProject', mode: 'quantitative', priority: 2 },
      { id: 'studio-cost-ratio', title: 'Studio Cost Ratio', component: 'StudioCostPanel', query: 'studioCost', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-role', title: 'Revenue by Role Type', component: 'RevenueByRolePanel', query: 'revenueByRole', mode: 'qualitative', priority: 4 },
      { id: 'sync-deals-timeline', title: 'Sync Deals Timeline', component: 'SyncDealsTimelinePanel', query: 'syncDealsTimeline', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'session-log', name: 'Session Log', description: 'Log recording/production sessions', component: 'SessionLog', injectInto: 'time', position: 'tab' },
    { id: 'stem-tracker', name: 'Stem Tracker', description: 'Track stems delivered per project', component: 'StemTracker', injectInto: 'projects', position: 'panel' },
    { id: 'sync-license-log', name: 'Sync License Log', description: 'Track sync licensing deals', component: 'SyncLicenseLog', injectInto: 'projects', position: 'tab' },
    { id: 'studio-cost-tracker', name: 'Studio Cost Tracker', description: 'Tag expenses as studio costs', component: 'StudioCostTracker', injectInto: 'finance', position: 'panel' },
    { id: 'credit-log', name: 'Credit Log', description: 'Log where your work is credited', component: 'CreditLog', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'per-track'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my session data and suggest pricing adjustments.',
    time: 'Help me estimate session hours for similar project types.',
    finance: 'Compare my licensing revenue against my project revenue.',
  },
};

export default musician;
