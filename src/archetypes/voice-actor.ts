import type { ArchetypeConfig } from './types';

const voiceActor: ArchetypeConfig = {
  id: 'voice-actor',
  label: 'Voice Actor',
  emoji: '🎙️',
  tagline: 'The tool for people who measure success in bookings landed',
  description: 'Built for voice actors. Track auditions, bookings, and session minutes.',
  psychProfile: 'Thinks in auditions, bookings, and session minutes. Every recording is measured in takes. Equipment is both capex and instrument.',
  icon: 'Mic',
  theme: 'motion',

  dashboard: {
    greeting: 'What are you recording?',
    subgreeting: 'Your auditions, bookings, and session time at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Bookings this month', query: null, format: 'count', color: 'green' },
      { id: 'draftsCount', label: 'Pending auditions', query: null, format: 'count', color: 'blue' },
      { id: 'todaysHours', label: 'Session minutes this week', query: null, format: 'hours', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'audition-log-widget', component: 'AuditionLogWidget', priority: 1 },
      { id: 'booking-tracker-widget', component: 'BookingTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Audition', action: '/projects', icon: 'Send' },
      { label: 'Log Session', action: '/time', icon: 'Clock' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Bookings', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'assets', label: 'Recordings', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Booking Economics',
    panels: [
      { id: 'audition-conversion', title: 'Audition Conversion Rate', component: 'AuditionConversionPanel', query: 'auditionConversion', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-booking-type', title: 'Revenue per Booking Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 2 },
      { id: 'session-minutes-trend', title: 'Session Minutes Trend', component: 'SessionMinutesPanel', query: 'sessionMinutes', mode: 'quantitative', priority: 3 },
      { id: 'top-clients-bookings', title: 'Top Clients by Bookings', component: 'TopClientsPanel', query: 'topClients', mode: 'qualitative', priority: 4 },
      { id: 'equipment-depreciation', title: 'Equipment Depreciation', component: 'EquipmentDepreciationPanel', query: 'equipmentDepreciation', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'audition-log', name: 'Audition Log', description: 'Log auditions with project and outcome', component: 'AuditionLog', injectInto: 'projects', position: 'tab' },
    { id: 'booking-tracker', name: 'Booking Tracker', description: 'Track confirmed bookings', component: 'BookingTracker', injectInto: 'projects', position: 'panel' },
    { id: 'session-recorder-log', name: 'Session Recorder Log', description: 'Log recording session details', component: 'SessionRecorderLog', injectInto: 'time', position: 'tab' },
    { id: 'equipment-inventory', name: 'Equipment Inventory', description: 'Track mic and gear investments', component: 'EquipmentInventory', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['per-session', 'flat', 'hourly'],
  defaultRateLabel: 'per session',

  aiPrompts: {
    dashboard: 'Analyze my audition-to-booking ratio and suggest where to focus.',
    time: 'Help me estimate session length for similar project types.',
    finance: 'Compare my effective hourly rate including audition time.',
  },
};

export default voiceActor;
