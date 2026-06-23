import type { ArchetypeConfig } from './types';

const trainer: ArchetypeConfig = {
  id: 'trainer',
  label: 'Personal Trainer / Fitness Coach',
  emoji: '💪',
  tagline: 'The tool for people who measure success in clients who transform',
  description: 'Built for personal trainers and fitness coaches. Track clients, programs, and progress.',
  psychProfile: 'Thinks in clients, programs, and progress photos. Every session is a milestone toward a goal. Consistency beats intensity.',
  icon: 'Dumbbell',
  theme: 'motion',

  dashboard: {
    greeting: "Who's training today?",
    subgreeting: 'Your clients, sessions, and progress at a glance.',
    metricCards: [
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null, format: 'count', color: 'blue' },
      { id: 'projectsCompleted', label: 'Programs completed this month', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'client-progress-widget', component: 'ClientProgressWidget', priority: 1 },
      { id: 'program-tracker-widget', component: 'ProgramTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Log Session', action: '/time', icon: 'Clock' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Sessions', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Programs', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Resources', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Training Impact',
    panels: [
      { id: 'revenue-per-client', title: 'Revenue per Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'session-frequency', title: 'Session Frequency Trend', component: 'SessionFrequencyPanel', query: 'sessionFrequency', mode: 'quantitative', priority: 2 },
      { id: 'retention-rate', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 3 },
      { id: 'program-completion', title: 'Program Completion Rate', component: 'ProgramCompletionPanel', query: 'programCompletion', mode: 'quantitative', priority: 4 },
      { id: 'revenue-by-program', title: 'Revenue by Program Type', component: 'RevenueByProgramPanel', query: 'revenueByProgram', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'program-builder', name: 'Program Builder', description: 'Build and track training programs', component: 'ProgramBuilder', injectInto: 'projects', position: 'tab' },
    { id: 'progress-tracker', name: 'Progress Tracker', description: 'Log client measurements and progress', component: 'ProgressTracker', injectInto: 'clients', position: 'panel' },
    { id: 'session-note-log', name: 'Session Note Log', description: 'Log exercise details per session', component: 'SessionNoteLog', injectInto: 'time', position: 'tab' },
    { id: 'assessment-log', name: 'Assessment Log', description: 'Log fitness assessments and results', component: 'AssessmentLog', injectInto: 'clients', position: 'tab' },
  ],

  proposalTypes: ['per-session', 'per-program', 'retainer'],
  defaultRateLabel: 'per session',

  aiPrompts: {
    dashboard: 'Analyze my client retention and suggest engagement strategies.',
    time: 'Help me schedule clients for optimal flow.',
    finance: 'Compare my per-session rate across program types.',
  },
};

export default trainer;
