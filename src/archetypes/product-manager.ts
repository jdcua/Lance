import type { ArchetypeConfig } from './types';

const productManager: ArchetypeConfig = {
  id: 'product-manager',
  label: 'Product Manager',
  emoji: '🚀',
  tagline: 'The tool for people who measure success in features shipped',
  description: 'Built for product managers. Track roadmaps, features, and stakeholder alignment.',
  psychProfile: 'Thinks in roadmaps, features, and user impact. Every feature competes for priority. Stakeholder alignment is the real job.',
  icon: 'Rocket',
  theme: 'scale',

  dashboard: {
    greeting: "What's on the roadmap?",
    subgreeting: 'Your features, priorities, and velocity at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active initiatives', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Features shipping this week', query: null, format: 'count', color: 'green' },
      { id: 'draftsCount', label: 'Features in discovery', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'roadmap-widget', component: 'RoadmapWidget', priority: 1 },
      { id: 'feature-priority-widget', component: 'FeaturePriorityWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Initiative', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Feature', action: '/projects', icon: 'Plus' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Initiatives', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Docs', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Product Velocity',
    panels: [
      { id: 'features-per-cycle', title: 'Features per Cycle', component: 'FeaturesPerCyclePanel', query: 'featuresPerCycle', mode: 'quantitative', priority: 1 },
      { id: 'discovery-to-ship', title: 'Discovery to Ship Time', component: 'DiscoveryToShipPanel', query: 'discoveryToShip', mode: 'quantitative', priority: 2 },
      { id: 'feature-impact-score', title: 'Feature Impact Score', component: 'FeatureImpactPanel', query: 'featureImpact', mode: 'qualitative', priority: 3 },
      { id: 'revenue-per-initiative', title: 'Revenue per Initiative', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 4 },
      { id: 'stakeholder-alignment', title: 'Stakeholder Alignment Score', component: 'StakeholderAlignmentPanel', query: 'stakeholderAlignment', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'roadmap-view', name: 'Roadmap View', description: 'Visual roadmap with milestones', component: 'RoadmapView', injectInto: 'projects', position: 'tab' },
    { id: 'feature-prioritization', name: 'Feature Prioritization', description: 'Score and rank features', component: 'FeaturePrioritization', injectInto: 'projects', position: 'panel' },
    { id: 'stakeholder-log', name: 'Stakeholder Log', description: 'Track stakeholder feedback and decisions', component: 'StakeholderLog', injectInto: 'clients', position: 'panel' },
    { id: 'product-spec-builder', name: 'Product Spec Builder', description: 'Build structured product specs', component: 'ProductSpecBuilder', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'retainer'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Product Management Retainer',
      category: 'Product Management',
      body: '<h2>Product Management Retainer</h2>\n<p>This Product Management Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Product Manager").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Product Manager reserves {hours_per_month} hours/month for Client. Priority for roadmap strategy, feature prioritization, stakeholder management.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Roadmap planning, feature specs, sprint planning support, stakeholder communication, metrics tracking, release coordination.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly report: features shipped, metrics, roadmap updates.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
    {
      name: 'Product Discovery Engagement',
      category: 'Product Management',
      body: '<h2>Product Discovery Engagement</h2>\n<p>This Product Discovery Engagement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Product Manager").</p>\n<h3>1. Project Scope</h3>\n<p>Product Manager will deliver: user research synthesis, problem definition, solution concepts, prioritized roadmap, success metrics definition.</p>\n<h3>2. Timeline</h3>\n<p>Discovery: {discovery_weeks} weeks. User interviews: {interview_count}. Prototype testing: {test_sessions}. Total: {total_weeks} weeks.</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {midpoint_percentage}% at midpoint, balance on delivery.</p>\n<h3>4. Deliverables</h3>\n<p>Research synthesis, problem statement, solution concepts with prototypes, prioritized feature backlog, success metrics framework, executive presentation.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{discovery_weeks}', '{interview_count}', '{test_sessions}', '{total_weeks}', '{total_fee}', '{deposit_percentage}', '{midpoint_percentage}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my product roadmap and flag initiatives at risk.',
    time: 'Help me scope feature work based on past delivery data.',
    finance: 'Compare my initiative ROI across different product areas.',
  },
};

export default productManager;
