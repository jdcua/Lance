import type { ArchetypeConfig } from './types';

const marketing: ArchetypeConfig = {
  id: 'marketing',
  label: 'Marketing / Brand Strategist',
  emoji: '📊',
  tagline: 'The tool for people who measure success in ROI delivered',
  description: 'Built for marketers and strategists. Track campaigns, channels, and client ROI.',
  psychProfile: 'Thinks in campaigns and ROI. Client headline metrics are their entire value proposition. Retainers are the dream.',
  icon: 'Target',
  theme: 'scale',

  dashboard: {
    greeting: "What's the strategy today?",
    subgreeting: 'Your campaigns, retainer health, and report cadence at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active campaigns', query: null, format: 'count', color: 'blue' },
      { id: 'activeRetainers', label: 'Active retainers', query: null, format: 'count', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'purple' },
    ],
    widgets: [
      { id: 'campaign-tracker-widget', component: 'CampaignTrackerWidget', priority: 1 },
      { id: 'report-cadence-widget', component: 'ReportCadenceWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Campaign', action: '/projects', icon: 'Target' },
      { label: 'Log Report', action: 'report-log', icon: 'FileText' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Campaigns', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Campaign Performance',
    panels: [
      { id: 'revenue-by-channel', title: 'Revenue by Channel/Service', component: 'RevenueByChannelPanel', query: 'revenueByChannel', mode: 'qualitative', priority: 1 },
      { id: 'retainer-vs-project', title: 'Retainer vs Project Split', component: 'RetainerVsProjectPanel', query: 'retainerVsProject', mode: 'quantitative', priority: 2 },
      { id: 'report-health', title: 'Client Report Cadence Health', component: 'ReportHealthPanel', query: 'reportHealth', mode: 'qualitative', priority: 3 },
      { id: 'campaign-roi', title: 'Campaign ROI', component: 'CampaignROIPanel', query: 'campaignROI', mode: 'quantitative', priority: 4 },
      { id: 'win-rate', title: 'Win Rate by Service Type', component: 'WinRatePanel', query: 'winRate', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'campaign-tracker', name: 'Campaign Tracker', description: 'Track campaigns per project with KPIs', component: 'CampaignTracker', injectInto: 'projects', position: 'tab' },
    { id: 'report-cadence-tracker', name: 'Report Cadence Tracker', description: 'Set report frequency and track overdue', component: 'ReportCadenceTracker', injectInto: 'clients', position: 'panel' },
    { id: 'channel-log', name: 'Channel Log', description: 'Tag projects by marketing channel', component: 'ChannelLog', injectInto: 'projects', position: 'panel' },
    { id: 'roi-calculator', name: 'ROI Calculator', description: 'Calculate ROI per campaign', component: 'ROICalculator', injectInto: 'finance', position: 'panel' },
  ],

  proposalTypes: ['flat', 'retainer', 'hourly'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Marketing Retainer Agreement',
      category: 'Marketing',
      body: '<h2>Marketing Retainer Agreement</h2>\n<p>This Marketing Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Marketer").</p>\n<h3>1. Monthly Services</h3>\n<p>Marketer will provide: {services_list}. Channels: {channels}. Includes: strategy, execution, reporting.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Ad Spend</h3>\n<p>Client funds ad accounts directly. Marketer manages campaigns. Client responsible for all platform billing.</p>\n<h3>4. Reporting</h3>\n<p>Weekly dashboard access. Monthly written report. Quarterly strategy review.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Final report within 5 business days.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{services_list}', '{channels}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{notice_period}'],
    },
    {
      name: 'Marketing Project Agreement',
      category: 'Marketing',
      body: '<h2>Marketing Project Agreement</h2>\n<p>This Marketing Project Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Marketer").</p>\n<h3>1. Project Scope</h3>\n<p>Marketer will deliver: {project_scope}. Campaign type: {campaign_type}. Platforms: {platforms}.</p>\n<h3>2. Timeline</h3>\n<p>Strategy: {strategy_weeks} weeks. Execution: {execution_weeks} weeks. Optimization: {optimization_weeks} weeks.</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% mid-project, balance on delivery.</p>\n<h3>4. Reporting</h3>\n<p>Weekly updates. Final report includes: KPIs, learnings, recommendations. Handoff call included.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_scope}', '{campaign_type}', '{platforms}', '{strategy_weeks}', '{execution_weeks}', '{optimization_weeks}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my campaign pipeline and flag overdue reports.',
    time: 'Help me estimate hours for similar campaign types.',
    finance: 'Compare my retainer revenue stability vs project revenue.',
  },
};

export default marketing;
