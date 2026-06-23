import type { ArchetypeConfig } from './types';

const consultant: ArchetypeConfig = {
  id: 'consultant',
  label: 'Consultant / Coach',
  emoji: '🧠',
  tagline: 'The tool for people who measure success in relationships retained',
  description: 'Built for consultants and coaches. Track sessions, retainers, and client outcomes.',
  psychProfile: 'Thinks in sessions and retainers. The fundamental split is retainer vs project clients. Client retention is everything.',
  icon: 'Brain',
  theme: 'scale',

  dashboard: {
    greeting: 'Who are you serving today?',
    subgreeting: 'Your retainers, sessions, and client health at a glance.',
    metricCards: [
      { id: 'activeRetainers', label: 'Active retainers', query: null, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null, format: 'count', color: 'blue' },
      { id: 'retainerVsProjectSplit', label: 'Retainer vs project revenue', query: null, format: 'percent', color: 'purple' },
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
    ],
    widgets: [
      { id: 'retainer-health-widget', component: 'RetainerHealthWidget', priority: 1 },
      { id: 'session-prep-widget', component: 'SessionPrepWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Session', action: 'session-log', icon: 'Calendar' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Relationship Health',
    panels: [
      { id: 'retainer-vs-project', title: 'Retainer vs Project Revenue', component: 'RetainerVsProjectPanel', query: 'retainerVsProject', mode: 'quantitative', priority: 1 },
      { id: 'session-hours-client', title: 'Session Hours by Client', component: 'SessionHoursPanel', query: 'sessionHours', mode: 'quantitative', priority: 2 },
      { id: 'retention-rate', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 3 },
      { id: 'engagement-length', title: 'Avg Engagement Length', component: 'EngagementLengthPanel', query: 'engagementLength', mode: 'quantitative', priority: 4 },
      { id: 'revenue-per-client', title: 'Revenue per Client Over Time', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'qualitative', priority: 5 },
      { id: 'session-frequency', title: 'Session Frequency by Client', component: 'SessionFrequencyPanel', query: 'sessionFrequency', mode: 'qualitative', priority: 6 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'session-log', name: 'Session Log', description: 'Log coaching sessions with action items', component: 'SessionLog', injectInto: 'time', position: 'tab' },
    { id: 'retainer-manager', name: 'Retainer Manager', description: 'Track retainer hours, rate, and renewal dates', component: 'RetainerManager', injectInto: 'clients', position: 'panel' },
    { id: 'action-item-tracker', name: 'Action Item Tracker', description: 'Track action items from sessions', component: 'ActionItemTracker', injectInto: 'projects', position: 'tab' },
    { id: 'outcome-notes', name: 'Outcome Notes', description: 'Log engagement outcomes and results', component: 'OutcomeNotes', injectInto: 'projects', position: 'panel' },
    { id: 'session-prep', name: 'Session Prep', description: 'Agenda for upcoming sessions', component: 'SessionPrep', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'retainer'],
  defaultRateLabel: 'per session',

  aiPrompts: {
    dashboard: 'Analyze my client relationships and flag at-risk retainer clients.',
    time: 'Help me prepare for my next session with client-specific context.',
    finance: 'Compare retainer revenue stability vs project revenue volatility.',
  },
};

export default consultant;
