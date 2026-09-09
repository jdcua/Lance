import type { ArchetypeConfig } from './types';

const advertiser: ArchetypeConfig = {
  id: 'advertiser',
  label: 'Advertiser / Media Buyer',
  emoji: '📣',
  tagline: 'The tool for people who measure success in ROAS delivered',
  description: 'Built for media buyers and advertisers. Track ad spend, platform performance, and creative rotations.',
  psychProfile: 'Thinks in budgets, platforms, and performance metrics. Ad spend is the fuel · every dollar has to prove its ROAS. Creative fatigue is real.',
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
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Media Buying Agreement',
      category: 'Advertising',
      body: '<h2>Media Buying Agreement</h2>\n<p>This Media Buying Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Media Buyer").</p>\n<h3>1. Services</h3>\n<p>Media Buyer will manage ad campaigns on the following platforms: {platforms}. Scope: {scope}. Monthly ad budget: $ {monthly_budget}.</p>\n<h3>2. Management Fee</h3>\n<p>Management fee: {management_fee}% of ad spend or $ {monthly_fee}/month (whichever is greater). Minimum monthly fee: $ {minimum_fee}.</p>\n<h3>3. Ad Spend & Payments</h3>\n<p>Client funds ad accounts directly. Media Buyer does not hold ad funds. Client responsible for all platform billing.</p>\n<h3>4. Reporting</h3>\n<p>Weekly performance reports. Monthly strategy review. Access to real-time dashboards provided.</p>\n<h3>5. Performance Guarantees</h3>\n<p>Media Buyer will use best efforts. No specific ROAS guarantees. Underperforming creatives will be rotated within {creative_rotation_days} days.</p>\n<h3>6. Term & Termination</h3>\n<p>Month-to-month. Either party may terminate with {notice_period} days notice. Final report provided within 5 business days.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{platforms}', '{scope}', '{monthly_budget}', '{management_fee}', '{monthly_fee}', '{minimum_fee}', '{notice_period}'],
    },
    {
      name: 'Campaign Management Retainer',
      category: 'Advertising',
      body: '<h2>Campaign Management Retainer</h2>\n<p>This Campaign Management Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Media Buyer").</p>\n<h3>1. Monthly Management</h3>\n<p>Media Buyer will manage up to {max_campaigns} active campaigns per month. Platforms: {platforms}. Creative reviews: {creative_reviews_per_month} per month.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours of management. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Creative Production</h3>\n<p>New creatives: {creatives_per_month} per month. Revisions: {revisions_included} rounds. Additional revisions: $ {additional_revision_rate} each.</p>\n<h3>4. Reporting & Meetings</h3>\n<p>Weekly written reports. Bi-weekly 30-min strategy call. Quarterly business review.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Unused hours do not roll over.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{max_campaigns}', '{platforms}', '{creative_reviews_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{creatives_per_month}', '{revisions_included}', '{additional_revision_rate}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my campaign performance and flag underperforming platforms.',
    time: 'Help me estimate management hours per campaign.',
    finance: 'Compare my ad spend efficiency across platforms.',
  },
};

export default advertiser;
