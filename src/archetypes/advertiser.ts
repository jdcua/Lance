import type { ArchetypeConfig } from './types';

const advertiser: ArchetypeConfig = {
  id: 'advertiser',
  label: 'Advertiser / Media Buyer',
  emoji: '📣',
  tagline: 'The tool for people who measure success in ROAS delivered',
  description: 'Built for media buyers and advertisers. Track ad spend, platform performance, and creative rotations.',
  psychProfile: 'Thinks in budgets, platforms, and performance metrics. Ad spend is the fuel — every dollar has to prove its ROAS. Creative fatigue is real.',
  icon: 'Megaphone',
  theme: 'scale',

  dashboard: {
    greeting: "What's live today?",
    subgreeting: 'Your ad accounts, spend pacing, and performance at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active campaigns', query: null, format: 'count', color: 'blue' },
      { id: 'expensesTotal', label: 'Ad spend this month', query: null, format: 'currency', color: 'purple' },
      { id: 'totalPaidRevenue', label: 'Revenue this month', query: null, format: 'currency', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'budget-pacing-widget', component: 'BudgetPacingWidget', priority: 1 },
      { id: 'creative-fatigue-widget', component: 'CreativeFatigueWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Campaign', action: '/projects', icon: 'Target' },
      { label: 'Log Ad Spend', action: '/finance', icon: 'DollarSign' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Campaigns', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Ad Spend', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Creatives', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Campaign Performance',
    panels: [
      { id: 'spend-by-platform', title: 'Spend vs Revenue by Platform', component: 'SpendByPlatformPanel', query: 'spendByPlatform', mode: 'quantitative', priority: 1 },
      { id: 'budget-pacing-health', title: 'Budget Pacing Health', component: 'BudgetPacingPanel', query: 'budgetPacing', mode: 'quantitative', priority: 2 },
      { id: 'revenue-by-campaign', title: 'Revenue by Campaign Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 3 },
      { id: 'creative-fatigue', title: 'Creative Fatigue Score', component: 'CreativeFatiguePanel', query: 'creativeFatigue', mode: 'qualitative', priority: 4 },
      { id: 'top-platforms-roas', title: 'Top Performing Platforms by ROAS', component: 'TopPlatformsROASPanel', query: 'topPlatformsROAS', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'campaign-budget-tracker', name: 'Campaign Budget Tracker', description: 'Track budget vs actual spend per campaign', component: 'CampaignBudgetTracker', injectInto: 'projects', position: 'panel' },
    { id: 'platform-log', name: 'Platform Log', description: 'Tag campaigns by ad platform', component: 'PlatformLog', injectInto: 'projects', position: 'panel' },
    { id: 'creative-rotation-log', name: 'Creative Rotation Log', description: 'Log ad creative versions with fatigue alerts', component: 'CreativeRotationLog', injectInto: 'projects', position: 'tab' },
    { id: 'spend-pacing', name: 'Spend Pacing', description: 'Daily budget pace vs actual spend', component: 'SpendPacing', injectInto: 'finance', position: 'panel' },
    { id: 'performance-snapshot', name: 'Performance Snapshot', description: 'Manual ROAS/CPA/CTR notes per period', component: 'PerformanceSnapshot', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'retainer', 'per-campaign'],
  defaultRateLabel: 'per campaign',

  aiPrompts: {
    dashboard: 'Analyze my campaign performance and flag underperforming platforms.',
    time: 'Help me estimate management hours per campaign.',
    finance: 'Compare my ad spend efficiency across platforms.',
  },
};

export default advertiser;
