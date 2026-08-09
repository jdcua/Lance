import type { ArchetypeConfig } from './types';

const gameDeveloper: ArchetypeConfig = {
  id: 'game-developer',
  label: 'Game Developer',
  emoji: '🎮',
  tagline: 'The tool for people who measure success in milestones shipped',
  description: 'Built for game developers. Track features, QA, builds, and scope.',
  psychProfile: 'Thinks in milestones and feature lists. Scope creep is the enemy. QA time is always underestimated.',
  icon: 'Gamepad2',
  theme: 'terminal',

  dashboard: {
    greeting: "What's building today?",
    subgreeting: 'Your features, QA, and builds at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'green' },
      { id: 'unbilledHours', label: 'Unbilled hours', query: null, format: 'hours', color: 'amber' },
      { id: 'upcomingMilestones', label: 'Upcoming milestones', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'feature-scope-widget', component: 'FeatureScopeWidget', priority: 1 },
      { id: 'build-log-widget', component: 'BuildLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Build', action: 'build-log', icon: 'Package' },
      { label: 'Log QA', action: 'qa-log', icon: 'Bug' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Development Velocity',
    panels: [
      { id: 'estimated-vs-actual', title: 'Estimated vs Actual Hours', component: 'EstimatedVsActualPanel', query: 'estimatedVsActual', mode: 'quantitative', priority: 1 },
      { id: 'qa-time-ratio', title: 'QA Time Ratio', component: 'QATimeRatioPanel', query: 'qaTimeRatio', mode: 'quantitative', priority: 2 },
      { id: 'scope-change', title: 'Feature Scope Change Frequency', component: 'ScopeChangePanel', query: 'scopeChange', mode: 'quantitative', priority: 3 },
      { id: 'revenue-by-platform', title: 'Revenue by Platform/Engine', component: 'RevenueByPlatformPanel', query: 'revenueByPlatform', mode: 'quantitative', priority: 4 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'feature-scope-board', name: 'Feature Scope Board', description: 'Kanban-lite for project features', component: 'FeatureScopeBoard', injectInto: 'projects', position: 'tab' },
    { id: 'platform-log', name: 'Platform Log', description: 'Tag projects by engine and target platform', component: 'PlatformLog', injectInto: 'projects', position: 'panel' },
    { id: 'qa-log', name: 'QA Log', description: 'Log QA sessions with bugs found/fixed', component: 'QALog', injectInto: 'time', position: 'tab' },
    { id: 'build-log', name: 'Build Log', description: 'Log builds delivered with version and platform', component: 'BuildLog', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'milestone'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,

  contractPresets: [
    {
      name: 'Game Development Agreement',
      category: 'Game Development',
      body: '<h2>Game Development Agreement</h2>\n<p>This Game Development Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Developer").</p>\n<h3>1. Scope</h3>\n<p>Developer will build: {game_concept}. Engine: {engine}. Target platforms: {target_platforms}. Genre: {genre}. Key features: {key_features}.</p>\n<h3>2. Milestones</h3>\n<p>Vertical Slice ({vertical_slice_weeks} weeks). Alpha ({alpha_weeks} weeks). Beta ({beta_weeks} weeks). Gold Master ({gold_weeks} weeks). Launch: {launch_date}.</p>\n<h3>2. Compensation</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% per milestone, balance on launch.</p>\n<h3>3. QA & Testing</h3>\n<p>Developer performs internal QA. External QA: {external_qa_required}. Bug severity SLAs: Critical {critical_sla}h, Major {major_sla}h, Minor {minor_sla}h.</p>\n<h3>3. IP & Revenue</h3>\n<p>Upon full payment, Client owns game and source code. Developer retains engine, tools, and reusable systems. Revenue share: {revenue_share}% to Developer (if applicable).</p>\n<h3>4. Post-Launch Support</h3>\n<p>Support period: {support_months} months. Patches included. DLC/Expansions: separate agreement.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{game_concept}', '{engine}', '{target_platforms}', '{genre}', '{key_features}', '{vertical_slice_weeks}', '{alpha_weeks}', '{beta_weeks}', '{gold_weeks}', '{launch_date}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}', '{external_qa_required}', '{critical_sla}', '{major_sla}', '{minor_sla}', '{revenue_share}', '{support_months}'],
    },
    {
      name: 'Game Development Retainer',
      category: 'Game Development',
      body: '<h2>Game Development Retainer</h2>\n<p>This Game Development Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Developer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Developer reserves {hours_per_month} hours/month. Priority for live-ops, hotfixes, live-ops content.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Live-ops content, balance patches, seasonal events, platform updates, performance optimization.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly report: hours used, patches deployed, metrics.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my development velocity and flag scope creep.',
    time: 'Help me estimate QA time based on feature count.',
    finance: 'Compare my revenue across different platforms and engines.',
  },
};

export default gameDeveloper;