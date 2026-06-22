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
      { id: 'active-projects', label: 'Active campaigns', query: null as any, format: 'count', color: 'blue' },
      { id: 'active-retainers', label: 'Active retainers', query: null as any, format: 'count', color: 'green' },
      { id: 'outstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
      { id: 'clients-count', label: 'Active clients', query: null as any, format: 'count', color: 'purple' },
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

  aiPrompts: {
    dashboard: 'Analyze my campaign pipeline and flag overdue reports.',
    time: 'Help me estimate hours for similar campaign types.',
    finance: 'Compare my retainer revenue stability vs project revenue.',
  },
};

export default marketing;
