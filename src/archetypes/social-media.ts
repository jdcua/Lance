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
      { id: 'activeProjectsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
      { id: 'upcomingMilestones', label: 'Posts scheduled this week', query: null, format: 'count', color: 'blue' },
      { id: 'assetsCount', label: 'Posts published this month', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
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
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Social Media Management Retainer',
      category: 'Social Media',
      body: '<h2>Social Media Management Retainer</h2>\n<p>This Social Media Management Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Social Media Manager").</p>\n<h3>1. Monthly Services</h3>\n<p>Manager will manage {platforms} platforms. Posts per week: {posts_per_week}. Includes: content creation, scheduling, community management, analytics reporting.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Ad Spend</h3>\n<p>Client funds ad accounts directly. Manager manages campaigns. Client responsible for all platform billing.</p>\n<h3>4. Reporting</h3>\n<p>Weekly performance summary. Monthly analytics report. Quarterly strategy review.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate. Final report within 5 business days.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{platforms}', '{posts_per_week}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{notice_period}'],
    },
    {
      name: 'Social Media Content Project',
      category: 'Social Media',
      body: '<h2>Social Media Content Project</h2>\n<p>This Social Media Content Project ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Content Creator").</p>\n<h3>1. Project Scope</h3>\n<p>Creator will produce {content_pieces} pieces of content. Platforms: {platforms}. Content types: {content_types} (reels, static, stories, carousel).</p>\n<h3>2. Timeline</h3>\n<p>Content calendar: {calendar_weeks} weeks. Shoot/production days: {shoot_days}. Editing: {editing_days} days. Delivery: {delivery_date}.</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {midpoint_percentage}% at midpoint, balance on final delivery.</p>\n<h3>4. Revisions & Rights</h3>\n<p>Includes {included_revisions} revision rounds per piece. Client owns final content. Creator retains portfolio rights.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{content_pieces}', '{platforms}', '{content_types}', '{calendar_weeks}', '{shoot_days}', '{editing_days}', '{delivery_date}', '{total_fee}', '{deposit_percentage}', '{midpoint_percentage}', '{included_revisions}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my client load and flag accounts needing attention.',
    time: 'Help me batch my content creation schedule efficiently.',
    finance: 'Compare my retainer rates across clients and platforms managed.',
  },
};

export default socialMedia;
