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
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null, format: 'count', color: 'blue' },
      { id: 'draftsCount', label: 'Cancellations this month', query: null, format: 'count', color: 'red' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
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

  depositPercentage: 0,
  paymentTerms: 7,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Therapy Services Agreement',
      category: 'Wellness',
      body: '<h2>Therapy Services Agreement</h2>\n<p>This Therapy Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Therapist").</p>\n<h3>1. Services</h3>\n<p>Therapist will provide: {modality} therapy. Frequency: {frequency_per_week} sessions/week. Duration: {session_duration} minutes. Modality: {session_modality} (in-person/telehealth).</p>\n<h3>2. Fees</h3>\n<p>Rate: $ {rate} per {rate_type}. Package: {sessions_per_package} sessions for $ {package_price}. {deposit_percentage}% deposit. Sliding scale: {sliding_scale_available}.</p>\n<h3>3. Schedule & Cancellations</h3>\n<p>Session time: {scheduled_day_time}. Cancellation: {cancellation_hours} hours notice required. Late cancel/No-show: full session fee. Therapist cancels: rescheduled or credited.</p>\n<h3>4. Confidentiality</h3>\n<p>All sessions confidential per HIPAA/ethical guidelines. Records retained for {record_retention_years} years. Mandatory reporting exceptions apply.</p>\n<h3>5. Termination</h3>\n<p>Either party may terminate with {notice_period} sessions notice. Referral provided. Unused prepaid sessions refunded.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{modality}', '{frequency_per_week}', '{session_duration}', '{session_modality}', '{rate}', '{rate_type}', '{sessions_per_package}', '{package_price}', '{deposit_percentage}', '{sliding_scale_available}', '{scheduled_day_time}', '{cancellation_hours}', '{record_retention_years}', '{notice_period}'],
    },
    {
      name: 'Wellness Program Package',
      category: 'Wellness',
      body: '<h2>Wellness Program Package</h2>\n<p>This Wellness Program Package ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Practitioner").</p>\n<h3>1. Program Deliverables</h3>\n<p>Practitioner delivers: {program_type} program. Includes: {included_sessions} sessions, {included_resources} (worksheets, audio, exercises), {support_access} support access.</p>\n<h3>2. Timeline</h3>\n<p>Program duration: {program_weeks} weeks. Sessions per week: {sessions_per_week}. Start: {start_date}. Estimated end: {estimated_end_date}.</p>\n<h3>2. Fees</h3>\n<p>Program price: $ {package_price}. {deposit_percentage}% deposit. Balance due on program start.</p>\n<h3>3. Support & Communication</h3>\n<p>Between-session support: {support_type} (email/text/portal). Response time: {response_time_hours} hours.</p>\n<h3>4. Cancellation</h3>\n<p>Client cancels before start: full refund minus deposit. After start: prorated refund for unused sessions.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{program_type}', '{included_sessions}', '{included_resources}', '{support_access}', '{program_weeks}', '{sessions_per_week}', '{start_date}', '{estimated_end_date}', '{package_price}', '{deposit_percentage}', '{support_type}', '{response_time_hours}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my practice health and suggest areas for improvement.',
    time: 'Help me manage my schedule for optimal client flow.',
    finance: 'Compare my revenue stability across client types.',
  },
};

export default wellness;
