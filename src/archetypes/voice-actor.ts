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
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Voiceover Services Agreement',
      category: 'Voiceover',
      body: '<h2>Voiceover Services Agreement</h2>\n<p>This Voiceover Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Voice Actor").</p>\n<h3>1. Services</h3>\n<p>Voice Actor will record: {project_description}. Word count: {word_count}. Style: {voice_style}. Duration: {duration_estimate}.</p>\n<h3>2. Session Details</h3>\n<p>Session type: {session_type} (directed/self-directed). Location: {session_location} (studio/remote). Duration: {session_duration}. Number of takes: {included_takes} included.</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total: $ {total_fee}. {deposit_percentage}% deposit. Balance due on delivery.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} revision rounds. Additional revisions: $ {revision_rate}/round. Pickup sessions: $ {pickup_rate}/session.</p>\n<h3>4. Rights & Usage</h3>\n<p>Usage: {usage_rights}. Territory: {territory}. Term: {term_months} months. Exclusive: {exclusive}. Buyout available for $ {buyout_fee}.</p>\n<h3>5. Delivery</h3>\n<p>Formats: {file_formats}. Sample rate: {sample_rate}. Bit depth: {bit_depth}. Delivery: {delivery_method}. Raw takes retained by Voice Actor unless purchased.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_description}', '{word_count}', '{voice_style}', '{duration_estimate}', '{session_type}', '{session_location}', '{session_duration}', '{included_takes}', '{rate}', '{rate_type}', '{total_fee}', '{deposit_percentage}', '{included_revisions}', '{revision_rate}', '{pickup_rate}', '{usage_rights}', '{territory}', '{term_months}', '{exclusive}', '{buyout_fee}', '{file_formats}', '{sample_rate}', '{bit_depth}', '{delivery_method}'],
    },
    {
      name: 'Voiceover Retainer',
      category: 'Voiceover',
      body: '<h2>Voiceover Retainer</h2>\n<p>This Voiceover Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Voice Actor").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Voice Actor reserves {sessions_per_month} sessions/month. Priority scheduling for urgent bookings.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_sessions} sessions. Overage: $ {overage_session_rate}/session.</p>\n<h3>2. Scope</h3>\n<p>Ongoing voiceover work: {content_types}. Commercial, narration, e-learning, IVR, characters.</p>\n<h3>3. Payment</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{sessions_per_month}', '{monthly_retainer}', '{included_sessions}', '{overage_session_rate}', '{content_types}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my audition-to-booking ratio and suggest where to focus.',
    time: 'Help me estimate session length for similar project types.',
    finance: 'Compare my effective hourly rate including audition time.',
  },
};

export default voiceActor;
