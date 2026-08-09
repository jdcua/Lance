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
      { id: 'clientsCount', label: 'Active students', query: null, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null, format: 'count', color: 'blue' },
      { id: 'todaysHours', label: 'Prep hours this week', query: null, format: 'hours', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
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
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Tutoring Services Agreement',
      category: 'Education',
      body: '<h2>Tutoring Services Agreement</h2>\n<p>This Tutoring Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client/Parent") and {freelancer_name} ("Tutor").</p>\n<h3>1. Services</h3>\n<p>Tutor will provide tutoring in: {subjects}. Grade level: {grade_level}. Sessions per week: {sessions_per_week}. Duration: {session_duration} minutes. Location: {location}.</p>\n<h3>2. Fees</h3>\n<p>Rate: $ {rate} per {rate_type}. Package: {sessions_per_package} sessions for $ {package_price}. {deposit_percentage}% deposit due on signing. Balance due monthly.</p>\n<h3>3. Schedule & Cancellations</h3>\n<p>Session days/times: {schedule}. Cancellation: {cancellation_notice} hours notice required. Late cancel: session forfeited. Tutor cancels: rescheduled or credited.</p>\n<h3>4. Progress & Communication</h3>\n<p>Progress reports: {progress_report_frequency}. Parent communication: {communication_method}. Student goals: {goals}.</p>\n<h3>5. Termination</h3>\n<p>Either party may terminate with {notice_period} days notice. Unused prepaid sessions refunded pro-rata.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{subjects}', '{grade_level}', '{sessions_per_week}', '{session_duration}', '{location}', '{rate}', '{rate_type}', '{sessions_per_package}', '{package_price}', '{deposit_percentage}', '{cancellation_notice}', '{progress_report_frequency}', '{communication_method}', '{goals}', '{notice_period}'],
    },
    {
      name: 'Test Prep Package Agreement',
      category: 'Test Prep',
      body: '<h2>Test Prep Package Agreement</h2>\n<p>This Test Prep Package Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client/Parent") and {freelancer_name} ("Tutor").</p>\n<h3>1. Program Deliverables</h3>\n<p>Tutor will prepare student for: {test_name} ({test_date}). Includes: {number_of_sessions} sessions, practice tests, study materials, strategies guide.</p>\n<h3>2. Schedule</h3>\n<p>Start date: {start_date}. Sessions per week: {sessions_per_week}. Duration: {session_duration} minutes. Estimated end: {estimated_end_date}.</p>\n<h3>2. Fees</h3>\n<p>Package price: $ {package_price}. {deposit_percentage}% deposit. Balance due midway through program.</p>\n<h3>3. Materials</h3>\n<p>Includes: practice tests, study guides, online resources access. Additional materials: $ {additional_materials_cost}.</p>\n<h3>4. Score Guarantee</h3>\n<p>If official score does not improve by {guaranteed_improvement} points, one additional cycle of sessions provided at no charge (terms apply).',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{test_name}', '{test_date}', '{number_of_sessions}', '{practice_tests}', '{study_materials}', '{strategies_guide}', '{start_date}', '{sessions_per_week}', '{session_duration}', '{estimated_end_date}', '{package_price}', '{deposit_percentage}', '{additional_materials_cost}', '{guaranteed_improvement}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my student retention and flag at-risk students.',
    time: 'Help me estimate prep time for new lesson plans.',
    finance: 'Compare my per-student revenue and session frequency.',
  },
};

export default tutor;
