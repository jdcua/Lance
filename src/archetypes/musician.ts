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
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null, format: 'count', color: 'blue' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'purple' },
      { id: 'totalPaidRevenue', label: 'Revenue this month', query: null, format: 'currency', color: 'green' },
      { id: 'expensesTotal', label: 'Studio costs this month', query: null, format: 'currency', color: 'amber' },
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

  depositPercentage: 50,
  paymentTerms: 7,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Music Production Agreement',
      category: 'Music Production',
      body: '<h2>Music Production Agreement</h2>\n<p>This Music Production Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Producer").</p>\n<h3>1. Production Scope</h3>\n<p>Producer will produce: {song_count} song(s). Genre: {genre}. Duration: {duration_per_track} per track. Arrangement: {arrangement_scope}.</p>\n<h3>2. Process</h3>\n<p>Pre-production: {prepro_days} days. Recording: {recording_days} days. Mixing: {mixing_days} days. Mastering: {mastering_days} days.</p>\n<h3>2. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total: $ {total_fee}. {deposit_percentage}% deposit. Milestones: {milestone_schedule}.</p>\n<h3>3. Stems & Files</h3>\n<p>Client receives: {deliverables_list}. Formats: {file_formats}. Sample rate: {sample_rate}. Bit depth: {bit_depth}. Tracked out stems included: {stems_included}.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} revision rounds per track. Additional revisions: $ {revision_rate}/round.</p>\n<h3>4. Rights</h3>\n<p>Client owns master recordings upon full payment. Producer retains rights to beats/instrumentals unless sold exclusively. Producer retains writer\'s share of composition copyright.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{song_count}', '{genre}', '{duration_per_track}', '{arrangement_scope}', '{prepro_days}', '{recording_days}', '{mixing_days}', '{mastering_days}', '{rate}', '{rate_type}', '{total_fee}', '{deposit_percentage}', '{milestone_schedule}', '{deliverables_list}', '{file_formats}', '{sample_rate}', '{bit_depth}', '{stems_included}', '{included_revisions}', '{revision_rate}'],
    },
    {
      name: 'Sync Licensing Agreement',
      category: 'Music Licensing',
      body: '<h2>Sync Licensing Agreement</h2>\n<p>This Sync Licensing Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Licensee") and {freelancer_name} ("Licensor").</p>\n<h3>1. Licensed Track</h3>\n<p>Track: "{track_title}". Duration: {duration}. Writers: {writers}. Publishers: {publishers}. Master: {master_owner}.</p>\n<h3>2. License Scope</h3>\n<p>Media: {media_types}. Territory: {territory}. Term: {term_years} years. Exclusive: {exclusive}.</p>\n<h3>2. Fees</h3>\n<p>Sync fee: $ {sync_fee}. Master fee: $ {master_fee}. Total: $ {total_fee}. Payment due within {payment_terms} days of execution.</p>\n<h3>3. Restrictions</h3>\n<p>No edits without approval. No use in: {restricted_uses}. Credit: "{credit_line}".',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{track_title}', '{duration}', '{writers}', '{publishers}', '{master_owner}', '{media_types}', '{territory}', '{term_years}', '{exclusive}', '{sync_fee}', '{master_fee}', '{total_fee}', '{payment_terms}', '{restricted_uses}', '{credit_line}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my session data and suggest pricing adjustments.',
    time: 'Help me estimate session hours for similar project types.',
    finance: 'Compare my licensing revenue against my project revenue.',
  },
};

export default musician;
