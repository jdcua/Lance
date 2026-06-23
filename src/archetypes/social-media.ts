import type { ArchetypeConfig } from './types';

const socialMedia: ArchetypeConfig = {
  id: 'social-media',
  label: 'Social Media Manager',
  emoji: '📱',
  tagline: 'The tool for people who measure success in posts that perform',
  description: 'Built for social media managers. Track content calendars, platforms, and post volume.',
  psychProfile: 'Thinks in content calendars and platform algorithms. Manages multiple clients simultaneously.',
  icon: 'MessageCircle',
  theme: 'motion',

  dashboard: {
    greeting: "What's posting today?",
    subgreeting: 'Your content calendar, platforms, and client load at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active clients', query: null as any, format: 'count', color: 'green' },
      { id: 'upcomingMilestones', label: 'Posts scheduled this week', query: null as any, format: 'count', color: 'blue' },
      { id: 'assetsCount', label: 'Posts published this month', query: null as any, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null as any, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'content-calendar-widget', component: 'ContentCalendarWidget', priority: 1 },
      { id: 'platform-tracker-widget', component: 'PlatformTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Post', action: '/projects', icon: 'Send' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Content Calendar', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Media Library', icon: 'Package', path: '/assets' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Content Performance',
    panels: [
      { id: 'posts-per-client', title: 'Posts per Client per Month', component: 'PostsPerClientPanel', query: 'postsPerClient', mode: 'quantitative', priority: 1 },
      { id: 'platform-distribution', title: 'Platform Distribution', component: 'PlatformDistributionPanel', query: 'platformDistribution', mode: 'qualitative', priority: 2 },
      { id: 'content-type-breakdown', title: 'Content Type Breakdown', component: 'ContentTypeBreakdownPanel', query: 'contentTypeBreakdown', mode: 'qualitative', priority: 3 },
      { id: 'client-count-trend', title: 'Client Count Trend', component: 'ClientCountTrendPanel', query: 'clientCountTrend', mode: 'quantitative', priority: 4 },
      { id: 'avg-clients-simultaneous', title: 'Avg Clients Managed Simultaneously', component: 'AvgClientsSimultaneousPanel', query: 'avgClientsSimultaneous', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'content-calendar', name: 'Content Calendar', description: 'Simple calendar showing planned posts', component: 'ContentCalendar', injectInto: 'projects', position: 'tab' },
    { id: 'platform-tracker', name: 'Platform Tracker', description: 'Log which platforms managed per client', component: 'PlatformTracker', injectInto: 'clients', position: 'panel' },
    { id: 'post-volume-log', name: 'Post Volume Log', description: 'Track posts published per period', component: 'PostVolumeLog', injectInto: 'time', position: 'panel' },
    { id: 'content-type-breakdown', name: 'Content Type Breakdown', description: 'Tag content by format type', component: 'ContentTypeBreakdown', injectInto: 'projects', position: 'panel' },
    { id: 'posting-performance-notes', name: 'Posting Performance Notes', description: 'Manual engagement notes per client', component: 'PostingPerformanceNotes', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['flat', 'retainer', 'hourly'],
  defaultRateLabel: 'per hour',

  aiPrompts: {
    dashboard: 'Analyze my client load and flag accounts needing attention.',
    time: 'Help me batch my content creation schedule efficiently.',
    finance: 'Compare my retainer rates across clients and platforms managed.',
  },
};

export default socialMedia;
