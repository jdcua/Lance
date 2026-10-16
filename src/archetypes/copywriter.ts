import type { ArchetypeConfig } from './types';

const copywriter: ArchetypeConfig = {
  id: 'copywriter',
  label: 'Copywriter / Content Writer',
  emoji: '📝',
  tagline: 'The tool for people who measure success in words that convert',
  description: 'Built for copywriters and content writers. Track words, content types, and brand voice.',
  psychProfile: 'Thinks in deliverables and conversion. More commercial focus than editorial writing.',
  icon: 'FileEdit',
  theme: 'craft',

  dashboard: {
    greeting: "What are you writing today?",
    subgreeting: 'Your words, content types, and rates at a glance.',
    metricCards: [
      { id: 'deadlinePressure', label: 'Deadlines in 7 days', query: null, format: 'count', color: 'red' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'purple' },
      { id: 'unbilledHours', label: 'Words pending (est)', query: null, format: 'hours', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'deadline-board-widget', component: 'DeadlineBoardWidget', priority: 1 },
      { id: 'content-type-widget', component: 'ContentTypeWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Swipe File', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Word Economics',
    panels: [
      { id: 'per-word-by-type', title: 'Per-Word Rate by Content Type', component: 'PerWordByTypePanel', query: 'perWordByType', mode: 'quantitative', priority: 1 },
      { id: 'words-per-month', title: 'Words per Month', component: 'WordsPerMonthPanel', query: 'wordsPerMonth', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-type', title: 'Revenue by Content Type', component: 'RevenueByTypePanel', query: 'revenueByType', mode: 'quantitative', priority: 3 },
      { id: 'approval-speed', title: 'Fastest vs Slowest Clients to Approve', component: 'ApprovalSpeedPanel', query: 'approvalSpeed', mode: 'qualitative', priority: 4 },
      { id: 'turnaround-by-type', title: 'Turnaround by Deliverable Type', component: 'TurnaroundByTypePanel', query: 'turnaroundByType', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'word-count-tracker', name: 'Word Count Tracker', description: 'Track word count per time entry', component: 'WordCountTracker', injectInto: 'time', position: 'panel' },
    { id: 'content-type-library', name: 'Content Type Library', description: 'Tag deliverables by type', component: 'ContentTypeLibrary', injectInto: 'projects', position: 'tab' },
    { id: 'brand-voice-notes', name: 'Brand Voice Notes', description: 'Store brand voice guidelines per client', component: 'BrandVoiceNotes', injectInto: 'clients', position: 'panel' },
    { id: 'cta-library', name: 'CTA Library', description: 'Personal swipe file for effective CTAs', component: 'CTALibrary', injectInto: 'assets', position: 'tab' },
    { id: 'ab-variant-log', name: 'A/B Variant Log', description: 'Log copy variants and performance', component: 'ABVariantLog', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['per-word', 'flat', 'hourly'],
  defaultRateLabel: 'per word',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Direct Response Copywriting Agreement',
      category: 'Copywriting',
      body: '<h2>Direct Response Copywriting Agreement</h2>\n<p>This Copywriting Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Copywriter").</p>\n<h3>1. Assignment</h3>\n<p>Copywriter will write: {deliverables_list}. Content type: {content_type} (email, landing page, VSL, ad, etc.). Word count: {word_count_estimate}.</p>\n<h3>2. Research & Voice</h3>\n<p>Copywriter will review: {research_materials}. Brand voice: {brand_voice_guidelines}. Target audience: {target_audience}.</p>\n<h3>3. Compensation</h3>\n<p>Rate: {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit on signing. Balance due on final delivery.</p>\n<h3>3. Process & Revisions</h3>\n<p>Research phase: {research_days} days. First draft: {first_draft_days} days. Includes {included_revisions} revision rounds. Additional revisions: $ {revision_rate}/round.</p>\n<h3>4. Performance</h3>\n<p>Copywriter makes no guarantees on conversion rates. Client may provide performance data for portfolio case study with approval.</p>\n<h3>5. Rights</h3>\n<p>Upon full payment, Client owns all rights. Copywriter may use anonymized excerpts in portfolio.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{deliverables_list}', '{content_type}', '{word_count_estimate}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}', '{research_days}', '{first_draft_days}', '{included_revisions}', '{revision_rate}'],
    },
    {
      name: 'Email Marketing Retainer',
      category: 'Email Marketing',
      body: '<h2>Email Marketing Retainer</h2>\n<p>This Email Marketing Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Copywriter").</p>\n<h3>1. Monthly Deliverables</h3>\n<p>{emails_per_month} emails per month. Types: {email_types} (newsletter, promo, nurture, transactional). Approx. {words_per_email} words each.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_emails} emails. Additional emails: $ {additional_email_rate} each.</p>\n<h3>3. Workflow</h3>\n<p>Briefs due by {brief_due} of each month. First drafts by {draft_due}. {included_revisions} revision rounds included.</p>\n<h3>4. Performance Tracking</h3>\n<p>Copywriter provides open/click rate notes if ESP access granted. A/B subject line tests included for {ab_tests_per_month} emails/month.</p>\n<h3>5. Payment Terms</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{emails_per_month}', '{email_types}', '{words_per_email}', '{monthly_retainer}', '{included_emails}', '{additional_email_rate}', '{brief_due}', '{draft_due}', '{included_revisions}', '{ab_tests_per_month}', '{payment_terms}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my writing pipeline and suggest where I can increase my effective rate.',
    time: 'Help me estimate word count for similar past projects.',
    finance: 'Compare my per-word rate across content types.',
  },
};

export default copywriter;
