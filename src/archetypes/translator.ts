import type { ArchetypeConfig } from './types';

const translator: ArchetypeConfig = {
  id: 'translator',
  label: 'Translator / Localizer',
  emoji: '🌐',
  tagline: 'The tool for people who measure success in words translated',
  description: 'Built for translators. Track language pairs, quality tiers, and CAT tool usage.',
  psychProfile: 'Thinks in words, characters, and language pairs. Rate is per word or per character. Speed matters.',
  icon: 'Languages',
  theme: 'craft',

  dashboard: {
    greeting: "What are you translating today?",
    subgreeting: 'Your words, language pairs, and rates at a glance.',
    metricCards: [
      { id: 'thisWeeksHours', label: 'Words translated this month', query: null, format: 'hours', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'blue' },
      { id: 'effectiveHourlyRate', label: 'Effective per-word rate', query: null, format: 'currency', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'language-pair-widget', component: 'LanguagePairWidget', priority: 1 },
      { id: 'glossary-widget', component: 'GlossaryWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
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
    { id: 'assets', label: 'Glossaries', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Translation Economics',
    panels: [
      { id: 'words-per-month', title: 'Words per Month', component: 'WordsPerMonthPanel', query: 'wordsPerMonth', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-pair', title: 'Revenue per Language Pair', component: 'RevenuePerPairPanel', query: 'revenuePerPair', mode: 'quantitative', priority: 2 },
      { id: 'per-word-by-tier', title: 'Effective Per-Word Rate by Quality Tier', component: 'PerWordByTierPanel', query: 'perWordByTier', mode: 'quantitative', priority: 3 },
      { id: 'cat-tool-usage', title: 'CAT Tool Usage', component: 'CATToolUsagePanel', query: 'catToolUsage', mode: 'qualitative', priority: 4 },
      { id: 'turnaround-by-pair', title: 'Turnaround by Language Pair', component: 'TurnaroundByPairPanel', query: 'turnaroundByPair', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'word-character-counter', name: 'Word/Character Counter', description: 'Track source/target word count per entry', component: 'WordCharacterCounter', injectInto: 'time', position: 'panel' },
    { id: 'language-pair-tracker', name: 'Language Pair Tracker', description: 'Tag projects by language pair', component: 'LanguagePairTracker', injectInto: 'projects', position: 'panel' },
    { id: 'quality-level-log', name: 'Quality Level Log', description: 'Tag projects by quality tier', component: 'QualityLevelLog', injectInto: 'projects', position: 'panel' },
    { id: 'cat-tool-log', name: 'CAT Tool Log', description: 'Log CAT tool used and fuzzy match %', component: 'CATToolLog', injectInto: 'time', position: 'panel' },
    { id: 'glossary', name: 'Glossary', description: 'Store approved terminology per client', component: 'Glossary', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['per-word', 'flat', 'hourly'],
  defaultRateLabel: 'per word',
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Translation Services Agreement',
      category: 'Translation',
      body: '<h2>Translation Services Agreement</h2>\n<p>This Translation Services Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Translator").</p>\n<h3>1. Assignment</h3>\n<p>Translator will translate: {source_language} to {target_language}. Content type: {content_type}. Word count: {word_count_estimate}. Specialization: {specialization}.</p>\n<h3>2. Quality & Process</h3>\n<p>Quality tier: {quality_tier} (standard, premium, certified). CAT tool: {cat_tool}. Glossary: {glossary_provided}. Review: {review_process} (self-review, bilingual review, subject-matter expert).</p>\n<h3>3. Compensation</h3>\n<p>Rate: {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit. Balance due on delivery.</p>\n<h3>3. Timeline</h3>\n<p>Turnaround: {turnaround_days} business days. Rush fee: {rush_fee_percentage}% for < {rush_threshold_days} days.</p>\n<h3>4. Revisions</h3>\n<p>Includes {included_revisions} revision round. Additional revisions: $ {additional_revision_rate} per {rate_type}.</p>\n<h3>5. Rights</h3>\n<p>Upon full payment, Client owns translation. Translator retains right to use anonymized excerpts in portfolio. Glossary/TM ownership: {tm_ownership}.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{source_language}', '{target_language}', '{content_type}', '{word_count_estimate}', '{specialization}', '{quality_tier}', '{cat_tool}', '{glossary_provided}', '{review_process}', '{rate}', '{rate_type}', '{word_count_estimate}', '{deposit_percentage}', '{estimated_total}', '{turnaround_days}', '{rush_fee_percentage}', '{rush_threshold_days}', '{included_revisions}', '{additional_revision_rate}', '{tm_ownership}'],
    },
    {
      name: 'Localization Retainer',
      category: 'Localization',
      body: '<h2>Localization Retainer</h2>\n<p>This Localization Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Localizer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Localizer reserves {words_per_month} words/month for Client. Priority for urgent content.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_words} words. Additional words at $ {additional_word_rate} per word.</p>\n<h3>3. Workflow</h3>\n<p>Files submitted by {submission_day} of month. First delivery by {delivery_day}. {included_revisions} revision rounds included.</p>\n<h3>4. Payment Terms</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{words_per_month}', '{monthly_retainer}', '{included_words}', '{additional_word_rate}', '{included_revisions}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my translation pipeline and suggest rate adjustments.',
    time: 'Help me estimate word throughput for similar language pairs.',
    finance: 'Compare my per-word rate across language pairs.',
  },
};

export default translator;
