import type { ArchetypeConfig } from './types';

const wellness: ArchetypeConfig = {
  id: 'wellness',
  label: 'Wellness / Therapist',
  emoji: '🧘',
  tagline: 'The tool for people who measure success in clients who heal',
  description: 'Built for therapists and wellness practitioners. Track clients, sessions, and progress.',
  psychProfile: 'Thinks in clients, session notes, and therapeutic progress. Confidentiality is paramount. Cancellation rate impacts income.',
  icon: 'Heart',
  theme: 'craft',

  dashboard: {
    greeting: 'Who are you seeing today?',
    subgreeting: 'Your clients, sessions, and practice health at a glance.',
    metricCards: [
      { id: 'clientsCount', label: 'Active clients', query: null as any, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null as any, format: 'count', color: 'blue' },
      { id: 'draftsCount', label: 'Cancellations this month', query: null as any, format: 'count', color: 'red' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'session-note-widget', component: 'SessionNoteWidget', priority: 1 },
      { id: 'progress-tracker-widget', component: 'ProgressTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Session', action: '/time', icon: 'Clock' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Sessions', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'projects', label: 'Treatment Plans', icon: 'FolderKanban', path: '/projects' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Resources', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Practice Health',
    panels: [
      { id: 'revenue-per-client', title: 'Revenue per Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'session-frequency', title: 'Session Frequency by Client', component: 'SessionFrequencyPanel', query: 'sessionFrequency', mode: 'qualitative', priority: 2 },
      { id: 'cancellation-rate', title: 'Cancellation Rate Trend', component: 'CancellationRatePanel', query: 'cancellationRate', mode: 'quantitative', priority: 3 },
      { id: 'retention-rate', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 4 },
      { id: 'revenue-by-modality', title: 'Revenue by Modality', component: 'RevenueByModalityPanel', query: 'revenueByModality', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'session-note-log', name: 'Session Note Log', description: 'Log confidential session notes', component: 'SessionNoteLog', injectInto: 'time', position: 'tab' },
    { id: 'progress-tracker', name: 'Progress Tracker', description: 'Track therapeutic progress', component: 'ProgressTracker', injectInto: 'clients', position: 'panel' },
    { id: 'cancellation-monitor', name: 'Cancellation Monitor', description: 'Track and analyze cancellations', component: 'CancellationMonitor', injectInto: 'clients', position: 'panel' },
    { id: 'intake-form-storage', name: 'Intake Form Storage', description: 'Store client intake forms', component: 'IntakeFormStorage', injectInto: 'assets', position: 'tab' },
  ],

  proposalTypes: ['per-session', 'retainer', 'flat'],
  defaultRateLabel: 'per session',

  aiPrompts: {
    dashboard: 'Analyze my practice health and suggest areas for improvement.',
    time: 'Help me manage my schedule for optimal client flow.',
    finance: 'Compare my revenue stability across client types.',
  },
};

export default wellness;
