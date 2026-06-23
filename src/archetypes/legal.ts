import type { ArchetypeConfig } from './types';

const legal: ArchetypeConfig = {
  id: 'legal',
  label: 'Legal Consultant / Paralegal',
  emoji: '⚖️',
  tagline: 'The tool for people who measure success in cases resolved',
  description: 'Built for legal professionals. Track cases, billable hours, and filing deadlines.',
  psychProfile: 'Thinks in cases, billable hours, and deadlines. Every filing has a hard date. Document versioning is critical.',
  icon: 'Scale',
  theme: 'scale',

  dashboard: {
    greeting: "What's on the docket?",
    subgreeting: 'Your cases, deadlines, and billable hours at a glance.',
    metricCards: [
      { id: 'active-projects', label: 'Active cases', query: null as any, format: 'count', color: 'blue' },
      { id: 'deadline-pressure', label: 'Deadlines in 7 days', query: null as any, format: 'count', color: 'red' },
      { id: 'hours-active-week', label: 'Billable hours this month', query: null as any, format: 'hours', color: 'green' },
      { id: 'outstanding', label: 'Outstanding retainers', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'case-tracker-widget', component: 'CaseTrackerWidget', priority: 1 },
      { id: 'filing-deadline-widget', component: 'FilingDeadlineWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Case', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'Log Filing', action: '/projects', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Cases', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'assets', label: 'Documents', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Practice Economics',
    panels: [
      { id: 'revenue-per-case', title: 'Revenue per Case', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'billable-trend', title: 'Billable Hours Trend', component: 'BillableTrendPanel', query: 'billableTrend', mode: 'quantitative', priority: 2 },
      { id: 'case-duration', title: 'Case Duration vs Estimate', component: 'CaseDurationPanel', query: 'caseDuration', mode: 'quantitative', priority: 3 },
      { id: 'filing-compliance', title: 'Filing Deadline Compliance', component: 'FilingCompliancePanel', query: 'filingCompliance', mode: 'quantitative', priority: 4 },
      { id: 'retainer-utilization', title: 'Retainer Utilization', component: 'RetainerUtilizationPanel', query: 'retainerUtilization', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'case-tracker', name: 'Case Tracker', description: 'Track case status and key dates', component: 'CaseTracker', injectInto: 'projects', position: 'tab' },
    { id: 'filing-deadline-calendar', name: 'Filing Deadline Calendar', description: 'Track court filing deadlines', component: 'FilingDeadlineCalendar', injectInto: 'projects', position: 'panel' },
    { id: 'document-version-log', name: 'Document Version Log', description: 'Track document versions and changes', component: 'DocumentVersionLog', injectInto: 'assets', position: 'panel' },
    { id: 'conflict-check-log', name: 'Conflict Check Log', description: 'Log conflict-of-interest checks', component: 'ConflictCheckLog', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'retainer', 'flat'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my case load and flag approaching deadlines.',
    time: 'Help me estimate billable hours for similar case types.',
    finance: 'Compare my effective rate across case types.',
  },
};

export default legal;
