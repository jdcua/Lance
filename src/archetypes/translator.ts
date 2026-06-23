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
      { id: 'thisWeeksHours', label: 'Words translated this month', query: null as any, format: 'hours', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active projects', query: null as any, format: 'count', color: 'blue' },
      { id: 'effectiveHourlyRate', label: 'Effective per-word rate', query: null as any, format: 'currency', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
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

  aiPrompts: {
    dashboard: 'Analyze my translation pipeline and suggest rate adjustments.',
    time: 'Help me estimate word throughput for similar language pairs.',
    finance: 'Compare my per-word rate across language pairs.',
  },
};

export default translator;
