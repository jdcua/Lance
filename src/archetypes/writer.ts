import type { ArchetypeConfig } from './types';

const writer: ArchetypeConfig = {
  id: 'writer',
  label: 'Writer / Editor',
  emoji: '✍️',
  tagline: 'The tool for people who measure success in words published',
  description: 'Built for writers and editors. Track words, deadlines, and per-word rates.',
  psychProfile: 'Thinks in words and deadlines. Rate anxiety is real. Deadline pressure is the primary stress metric.',
  icon: 'Pen',
  theme: 'craft',

  dashboard: {
    greeting: 'What are you writing today?',
    subgreeting: 'Your words, deadlines, and rates at a glance.',
    metricCards: [
      { id: 'deadlinePressure', label: 'Deadlines in next 7 days', query: null, format: 'count', color: 'red' },
      { id: 'effectiveHourlyRate', label: 'Effective per-word rate', query: null, format: 'currency', color: 'blue' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'deadline-board-widget', component: 'DeadlineBoardWidget', priority: 1 },
      { id: 'word-tracker-widget', component: 'WordTrackerWidget', priority: 2 },
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
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'hybrid',
    headline: 'Word Economics',
    panels: [
      { id: 'words-per-month', title: 'Words Written per Month', component: 'WordsPerMonthPanel', query: 'wordsPerMonth', mode: 'quantitative', priority: 1 },
      { id: 'per-word-trend', title: 'Per-Word Rate Trend', component: 'PerWordTrendPanel', query: 'perWordTrend', mode: 'quantitative', priority: 2 },
      { id: 'deadline-adherence', title: 'Deadline Adherence %', component: 'DeadlineAdherencePanel', query: 'deadlineAdherence', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-type', title: 'Revenue by Content Type', component: 'RevenueByTypePanel', query: 'revenueByType', mode: 'quantitative', priority: 4 },
      { id: 'top-clients-words', title: 'Top Clients by Word Volume', component: 'TopClientsWordsPanel', query: 'topClientsWords', mode: 'qualitative', priority: 5 },
      { id: 'avg-turnaround', title: 'Avg Turnaround by Project Type', component: 'AvgTurnaroundPanel', query: 'avgTurnaround', mode: 'quantitative', priority: 6 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'word-tracker', name: 'Word Tracker', description: 'Add word count to time entries for per-word rate', component: 'WordTracker', injectInto: 'time', position: 'panel' },
    { id: 'deadline-board', name: 'Deadline Board', description: 'Projects sorted by due date with urgency colors', component: 'DeadlineBoard', injectInto: 'projects', position: 'tab' },
    { id: 'publication-log', name: 'Publication Log', description: 'Log where your work was published', component: 'PublicationLog', injectInto: 'projects', position: 'panel' },
    { id: 'style-guide', name: 'Style Guide', description: 'Store client style requirements', component: 'StyleGuide', injectInto: 'clients', position: 'panel' },
    { id: 'rate-benchmarking', name: 'Rate Benchmarking', description: 'Per-word rate trends over time', component: 'RateBenchmarking', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['per-word', 'flat', 'hourly'],
  defaultRateLabel: 'per word',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Freelance Writing Agreement',
      category: 'Writing',
      body: '<h2>Freelance Writing Agreement</h2>\n<p>This Freelance Writing Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Writer").</p>\n<h3>1. Assignment</h3>\n<p>Writer will produce the following content: {scope}. Word count: {word_count}. Topic: {topic}. Tone: {tone}.</p>\n<h3>2. Compensation</h3>\n<p>Rate: {rate} per {rate_type}. Total estimated fee: $ {estimated_total}. {deposit_percentage}% deposit due on signing. Balance due within {payment_terms} days of delivery.</p>\n<h3>3. Deadlines</h3>\n<p>First draft due: {first_draft_date}. Revisions due: {revision_due_date}. Final delivery: {final_due_date}. Writer will notify Client of any delays promptly.</p>\n<h3>4. Revisions</h3>\n<p>Includes {included_revisions} rounds of revisions. Additional revisions billed at $ {additional_revision_rate} per round.</p>\n<h3>5. Rights & Ownership</h3>\n<p>Upon full payment, Client receives all rights to the Work. Writer retains moral rights and may use Work for portfolio/marketing with attribution.</p>\n<h3>6. Kill Fee</h3>\n<p>If Client cancels after work has begun, Client pays {kill_fee_percentage}% of total fee for work completed to date.</p>\n<h3>7. Confidentiality</h3>\n<p>Writer agrees to keep Client information confidential during and after the engagement.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{word_count}', '{topic}', '{tone}', '{rate}', '{rate_type}', '{estimated_total}', '{deposit_percentage}', '{payment_terms}', '{first_draft_date}', '{revision_due_date}', '{final_due_date}', '{included_revisions}', '{additional_revision_rate}', '{kill_fee_percentage}'],
    },
    {
      name: 'Content Retainer Agreement',
      category: 'Writing',
      body: '<h2>Content Retainer Agreement</h2>\n<p>This Content Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Writer").</p>\n<h3>1. Monthly Deliverables</h3>\n<p>Writer will produce {pieces_per_month} pieces of content per month. Total words per month: {words_per_month}. Topics: {content_topics}.</p>\n<h3>2. Retainer Fee</h3>\n<p>Monthly retainer: $ {monthly_retainer}. Includes up to {included_words} words. Additional words at $ {additional_word_rate} per word.</p>\n<h3>3. Workflow</h3>\n<p>Topics due by {topic_due_date} of each month. First drafts delivered by {draft_due_date}. {included_revisions} revision rounds included.</p>\n<h3>4. Payment Terms</h3>\n<p>Invoices sent on the 1st. Payment due Net {payment_terms} days.</p>\n<h3>5. Term & Termination</h3>\n<p>Month-to-month. Either party may terminate with {notice_period} days written notice. Unused portion of retainer forfeited on termination.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{pieces_per_month}', '{words_per_month}', '{content_topics}', '{monthly_retainer}', '{included_words}', '{additional_word_rate}', '{included_revisions}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my writing pipeline and flag approaching deadlines.',
    time: 'Help me estimate word counts for similar projects.',
    finance: 'Compare my per-word rate across clients and project types.',
  },
};

export default writer;
