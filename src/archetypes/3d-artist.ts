import type { ArchetypeConfig } from './types';

const threeDArtist: ArchetypeConfig = {
  id: '3d-artist',
  label: '3D Artist / Modeler',
  emoji: '🗿',
  tagline: 'The tool for people who measure success in polygons rendered',
  description: 'Built for 3D artists. Track renders, asset complexity, and software costs.',
  psychProfile: 'Thinks in polygons and render farms. Render time is a cost. Software subscriptions are significant.',
  icon: 'Box',
  theme: 'motion',

  dashboard: {
    greeting: "What's rendering today?",
    subgreeting: 'Your renders, complexity, and software costs at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active projects', query: null, format: 'count', color: 'blue' },
      { id: 'unbilledRenderHours', label: 'Unbilled render hours', query: null, format: 'hours', color: 'amber' },
      { id: 'thisWeeksHours', label: 'Hours this week', query: null, format: 'hours', color: 'green' },
      { id: 'expensesTotal', label: 'Software costs (monthly)', query: null, format: 'currency', color: 'red' },
    ],
    widgets: [
      { id: 'render-log-widget', component: 'RenderLogWidget', priority: 1 },
      { id: 'asset-complexity-widget', component: 'AssetComplexityWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Render', action: 'render-log', icon: 'Monitor' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Expense', action: '/finance', icon: 'BarChart3' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Render Economics',
    panels: [
      { id: 'render-vs-billable', title: 'Render Time vs Billable Time', component: 'RenderVsBillablePanel', query: 'renderVsBillable', mode: 'quantitative', priority: 1 },
      { id: 'revenue-by-type', title: 'Revenue by Project Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 2 },
      { id: 'software-cost', title: 'Software Cost vs Revenue', component: 'SoftwareCostPanel', query: 'softwareCost', mode: 'quantitative', priority: 3 },
      { id: 'complexity-rate', title: 'Complexity vs Rate Correlation', component: 'ComplexityRatePanel', query: 'complexityRate', mode: 'quantitative', priority: 4 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'render-log', name: 'Render Log', description: 'Log render jobs with software, machine, and resolution', component: 'RenderLog', injectInto: 'time', position: 'tab' },
    { id: 'asset-complexity-log', name: 'Asset Complexity Log', description: 'Log poly count and texture complexity per project', component: 'AssetComplexityLog', injectInto: 'projects', position: 'panel' },
    { id: 'software-subscription-tracker', name: 'Software Subscription Tracker', description: 'Track recurring software costs', component: 'SoftwareSubscriptionTracker', injectInto: 'finance', position: 'panel' },
    { id: 'deliverable-format-log', name: 'Deliverable Format Log', description: 'Log formats and specs delivered per project', component: 'DeliverableFormatLog', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: '3D Art & Animation Agreement',
      category: '3D & Animation',
      body: '<h2>3D Art & Animation Agreement</h2>\n<p>This 3D Art & Animation Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Artist").</p>\n<h3>1. Scope of Work</h3>\n<p>Artist will create 3D models, animations, and/or renders as described in {scope}. Deliverables: {deliverables_list}.</p>\n<h3>2. Technical Specifications</h3>\n<p>Software: {software_used}. File formats: {file_formats}. Resolution: {resolution}. Poly count target: {poly_count}.</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Estimated total: $ {estimated_total}. {deposit_percentage}% deposit on signing. Milestone payments per Exhibit A.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} rounds of revisions. Additional revisions billed at $ {additional_revision_rate} per round.</p>\n<h3>4. Delivery & Acceptance</h3>\n<p>Files delivered in {file_formats} format. Client has {acceptance_period} business days to review. Unaccepted deliverables deemed accepted after {auto_acceptance_days} days.</p>\n<h3>5. Intellectual Property</h3>\n<p>Upon full payment, Client owns all final deliverables. Artist retains rights to source files, rigs, and reusable assets unless otherwise agreed.</p>\n<h3>6. Usage Rights</h3>\n<p>Client receives license for {usage_rights}. Artist retains right to use work for portfolio/marketing with attribution.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{deliverables_list}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}', '{included_revisions}', '{additional_revision_rate}', '{acceptance_period}', '{auto_acceptance_days}'],
    },
    {
      name: 'Game Asset Production Agreement',
      category: 'Game Development',
      body: '<h2>Game Asset Production Agreement</h2>\n<p>This Game Asset Production Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Artist").</p>\n<h3>1. Asset Specifications</h3>\n<p>Artist will create: {asset_list}. Engine: {game_engine}. Target platform: {target_platform}. Style: {art_style}.</p>\n<h3>2. Technical Requirements</h3>\n<p>Poly budget: {poly_budget}. Texture resolution: {texture_resolution}. Rigging: {rigging_required}. Animation: {animation_required}.</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total estimated: $ {estimated_total}. {deposit_percentage}% deposit. Milestone payments per Exhibit A.</p>\n<h3>4. Delivery & Integration</h3>\n<p>Files delivered in {file_formats}. Assets tested in {game_engine}. Client has {acceptance_period} days to test in-engine.</p>\n<h3>5. IP & Usage</h3>\n<p>Client owns final assets. Artist retains right to use in portfolio. Source files (FBX, blend, etc.) retained by Artist unless purchased separately.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{asset_list}', '{game_engine}', '{target_platform}', '{art_style}', '{poly_budget}', '{texture_resolution}', '{rigging_required}', '{animation_required}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my render time and suggest where I can optimize.',
    time: 'Help me estimate render time for similar complexity projects.',
    finance: 'Compare my software costs to my revenue and suggest optimizations.',
  },
};

export default threeDArtist;
