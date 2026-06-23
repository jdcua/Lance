import type { ArchetypeConfig } from './types';

const tutor: ArchetypeConfig = {
  id: 'tutor',
  label: 'Tutor / Educator',
  emoji: '📚',
  tagline: 'The tool for people who measure success in students who grow',
  description: 'Built for tutors and educators. Track students, sessions, and curriculum progress.',
  psychProfile: 'Thinks in students, sessions, and curriculum progress. Prep time is invisible but essential.',
  icon: 'BookOpen',
  theme: 'craft',

  dashboard: {
    greeting: 'Who are you teaching?',
    subgreeting: 'Your students, sessions, and prep at a glance.',
    metricCards: [
      { id: 'clients-count', label: 'Active students', query: null as any, format: 'count', color: 'green' },
      { id: 'sessions-week', label: 'Sessions this week', query: null as any, format: 'count', color: 'blue' },
      { id: 'todays-hours', label: 'Prep hours this week', query: null as any, format: 'hours', color: 'purple' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'student-roster-widget', component: 'StudentRosterWidget', priority: 1 },
      { id: 'curriculum-progress-widget', component: 'CurriculumProgressWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Student', action: '/clients', icon: 'Users' },
      { label: 'Log Session', action: '/time', icon: 'Clock' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Students', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Sessions', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'projects', label: 'Curriculum', icon: 'FolderKanban', path: '/projects' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Resources', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Teaching Impact',
    panels: [
      { id: 'revenue-per-student', title: 'Revenue per Student', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'session-frequency', title: 'Session Frequency by Student', component: 'SessionFrequencyPanel', query: 'sessionFrequency', mode: 'qualitative', priority: 2 },
      { id: 'prep-ratio', title: 'Session Prep Ratio', component: 'PrepRatioPanel', query: 'prepRatio', mode: 'quantitative', priority: 3 },
      { id: 'student-retention', title: 'Student Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 4 },
      { id: 'revenue-by-subject', title: 'Revenue by Subject', component: 'RevenueBySubjectPanel', query: 'revenueBySubject', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'student-roster', name: 'Student Roster', description: 'Track student info and contact', component: 'StudentRoster', injectInto: 'clients', position: 'tab' },
    { id: 'curriculum-tracker', name: 'Curriculum Tracker', description: 'Track lesson plans and progress', component: 'CurriculumTracker', injectInto: 'projects', position: 'tab' },
    { id: 'session-prep-log', name: 'Session Prep Log', description: 'Log preparation time separately', component: 'SessionPrepLog', injectInto: 'time', position: 'panel' },
    { id: 'progress-reports', name: 'Progress Reports', description: 'Generate student progress reports', component: 'ProgressReports', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['per-session', 'flat', 'hourly'],
  defaultRateLabel: 'per session',

  aiPrompts: {
    dashboard: 'Analyze my student retention and flag at-risk students.',
    time: 'Help me estimate prep time for new lesson plans.',
    finance: 'Compare my per-student revenue and session frequency.',
  },
};

export default tutor;
