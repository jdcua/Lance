import type { ArchetypeConfig } from './types';

const cxStrategist: ArchetypeConfig = {
  id: 'cx-strategist',
  label: 'CX / Customer Experience Strategist',
  emoji: '💫',
  tagline: 'The tool for people who measure success in NPS points gained',
  description: 'Built for CX strategists. Track journey maps, customer feedback, and service improvements.',
  psychProfile: 'Thinks in journeys, touchpoints, and satisfaction scores. Every customer interaction is a data point. Service blueprints are the deliverable.',
  icon: 'Smile',
  theme: 'scale',

  dashboard: {
    greeting: "What's the customer saying?",
    subgreeting: 'Your journey maps, satisfaction scores, and initiatives at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active CX initiatives', query: null, format: 'count', color: 'blue' },
      { id: 'clientsCount', label: 'Clients under management', query: null, format: 'count', color: 'green' },
      { id: 'draftsCount', label: 'Initiatives pending deployment', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'journey-map-widget', component: 'JourneyMapWidget', priority: 1 },
      { id: 'satisfaction-trend-widget', component: 'SatisfactionTrendWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Initiative', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Feedback', action: '/clients', icon: 'MessageSquare' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'projects', label: 'Initiatives', icon: 'FolderKanban', path: '/projects' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Journey Maps', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Experience Impact',
    panels: [
      { id: 'satisfaction-trend', title: 'Satisfaction Score Trend', component: 'SatisfactionTrendPanel', query: 'satisfactionTrend', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-initiative', title: 'Revenue per Initiative', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'touchpoint-impact', title: 'Impact by Touchpoint', component: 'TouchpointImpactPanel', query: 'touchpointImpact', mode: 'qualitative', priority: 3 },
      { id: 'initiative-completion', title: 'Initiative Completion Rate', component: 'InitiativeCompletionPanel', query: 'initiativeCompletion', mode: 'quantitative', priority: 4 },
      { id: 'client-health-score', title: 'Client Health Score', component: 'ClientHealthPanel', query: 'clientHealth', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'journey-map-builder', name: 'Journey Map Builder', description: 'Build customer journey maps', component: 'JourneyMapBuilder', injectInto: 'projects', position: 'tab' },
    { id: 'feedback-aggregator', name: 'Feedback Aggregator', description: 'Aggregate and categorize customer feedback', component: 'FeedbackAggregator', injectInto: 'clients', position: 'panel' },
    { id: 'service-blueprint', name: 'Service Blueprint', description: 'Document service processes', component: 'ServiceBlueprint', injectInto: 'projects', position: 'tab' },
    { id: 'impact-measurement', name: 'Impact Measurement', description: 'Track initiative impact on satisfaction', component: 'ImpactMeasurement', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['retainer', 'flat', 'hourly'],
  defaultRateLabel: 'per hour',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'CX Strategy Retainer',
      category: 'CX Strategy',
      body: '<h2>CX Strategy Retainer</h2>\n<p>This CX Strategy Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("CX Strategist").</p>\n<h3>1. Monthly Deliverables</h3>\n<p>CX Strategist will deliver: {monthly_deliverables}. Includes: journey mapping, feedback analysis, initiative planning, stakeholder workshops.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>3. Workflow</h3>\n<p>Bi-weekly check-ins. Monthly CX health report. Quarterly journey map update. Ad-hoc consultation available.</p>\n<h3>4. Metrics & Reporting</h3>\n<p>Monthly CX health report. Quarterly NPS/CSAT trend report. Ad-hoc deep-dives on request.</p>\n<h3>5. Payment Terms</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Month-to-month, {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{monthly_deliverables}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
    {
      name: 'CX Project Engagement',
      category: 'CX Strategy',
      body: '<h2>CX Project Engagement</h2>\n<p>This CX Project Engagement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("CX Strategist").</p>\n<h3>1. Project Scope</h3>\n<p>CX Strategist will deliver: {project_scope}. Includes: current state assessment, future state journey map, prioritized initiative roadmap, implementation playbook.</p>\n<h3>2. Timeline</h3>\n<p>Current state assessment: {assessment_weeks} weeks. Journey mapping: {mapping_weeks} weeks. Roadmap & playbook: {roadmap_weeks} weeks. Total: {total_weeks} weeks.</p>\n<h3>3. Fees</h3>\n<p>Total project fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% at mid-point, balance on delivery.</p>\n<h3>4. Stakeholder Workshops</h3>\n<p>Includes {workshop_count} facilitated workshops (virtual or on-site). Additional workshops: $ {additional_workshop_fee} each.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_scope}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}', '{assessment_weeks}', '{mapping_weeks}', '{roadmap_weeks}', '{total_weeks}', '{workshop_count}', '{additional_workshop_fee}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my CX initiatives and flag clients with declining satisfaction.',
    time: 'Help me estimate journey mapping time by scope.',
    finance: 'Compare my retainer value against client satisfaction improvements.',
  },
};

export default cxStrategist;
