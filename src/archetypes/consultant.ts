import type { ArchetypeConfig } from './types';

const consultant: ArchetypeConfig = {
  id: 'consultant',
  label: 'Consultant / Coach',
  emoji: '🧠',
  tagline: 'The tool for people who measure success in relationships retained',
  description: 'Built for consultants and coaches. Track sessions, retainers, and client outcomes.',
  psychProfile: 'Thinks in sessions and retainers. The fundamental split is retainer vs project clients. Client retention is everything.',
  icon: 'Brain',
  theme: 'scale',

  dashboard: {
    greeting: 'Who are you serving today?',
    subgreeting: 'Your retainers, sessions, and client health at a glance.',
    metricCards: [
      { id: 'activeRetainers', label: 'Active retainers', query: null, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Sessions this week', query: null, format: 'count', color: 'blue' },
      { id: 'retainerVsProjectSplit', label: 'Retainer vs project revenue', query: null, format: 'percent', color: 'purple' },
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
    ],
    widgets: [
      { id: 'retainer-health-widget', component: 'RetainerHealthWidget', priority: 1 },
      { id: 'session-prep-widget', component: 'SessionPrepWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Session', action: 'session-log', icon: 'Calendar' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Relationship Health',
    panels: [
      { id: 'retainer-vs-project', title: 'Retainer vs Project Revenue', component: 'RetainerVsProjectPanel', query: 'retainerVsProject', mode: 'quantitative', priority: 1 },
      { id: 'session-hours-client', title: 'Session Hours by Client', component: 'SessionHoursPanel', query: 'sessionHours', mode: 'quantitative', priority: 2 },
      { id: 'retention-rate', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 3 },
      { id: 'engagement-length', title: 'Avg Engagement Length', component: 'EngagementLengthPanel', query: 'engagementLength', mode: 'quantitative', priority: 4 },
      { id: 'revenue-per-client', title: 'Revenue per Client Over Time', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'qualitative', priority: 5 },
      { id: 'session-frequency', title: 'Session Frequency by Client', component: 'SessionFrequencyPanel', query: 'sessionFrequency', mode: 'qualitative', priority: 6 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'session-log', name: 'Session Log', description: 'Log coaching sessions with action items', component: 'SessionLog', injectInto: 'time', position: 'tab' },
    { id: 'retainer-manager', name: 'Retainer Manager', description: 'Track retainer hours, rate, and renewal dates', component: 'RetainerManager', injectInto: 'clients', position: 'panel' },
    { id: 'action-item-tracker', name: 'Action Item Tracker', description: 'Track action items from sessions', component: 'ActionItemTracker', injectInto: 'projects', position: 'tab' },
    { id: 'outcome-notes', name: 'Outcome Notes', description: 'Log engagement outcomes and results', component: 'OutcomeNotes', injectInto: 'projects', position: 'panel' },
    { id: 'session-prep', name: 'Session Prep', description: 'Agenda for upcoming sessions', component: 'SessionPrep', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'retainer'],
  defaultRateLabel: 'per session',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 3,

  contractPresets: [
    {
      name: 'Consulting Retainer Agreement',
      category: 'Consulting',
      body: '<h2>Consulting Retainer Agreement</h2>\n<p>This Consulting Retainer Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Consultant").</p>\n<h3>1. Retainer Services</h3>\n<p>Consultant will provide ongoing consulting services as described in {scope}. Services include {services_included}.</p>\n<h3>2. Retainer Fee</h3>\n<p>Client agrees to pay a monthly retainer of $ {monthly_retainer} for {hours_included} hours per month. Additional hours billed at $ {overage_rate}/hr.</p>\n<h3>3. Payment Terms</h3>\n<p>Invoices sent on the 1st of each month. Payment due Net {payment_terms} days. Late payments incur {late_fee}% monthly interest.</p>\n<h3>4. Engagement & Termination</h3>\n<p>Initial term: {term_months} months. Auto-renews unless terminated with {notice_period} days written notice. Either party may terminate for cause with immediate effect.</p>\n<h3>3. Confidentiality</h3>\n<p>Consultant agrees to maintain strict confidentiality of all Client information. Confidentiality survives termination for {confidentiality_period} years.</p>\n<h3>6. Intellectual Property</h3>\n<p>All deliverables and work product created under this Agreement are the exclusive property of Client upon full payment.</p>\n<h3>7. Governing Law</h3>\n<p>This Agreement shall be governed by the laws of {jurisdiction}.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{services_included}', '{monthly_retainer}', '{hours_included}', '{overage_rate}', '{payment_terms}', '{notice_period}', '{confidentiality_period}', '{jurisdiction}'],
    },
    {
      name: 'Project-Based Consulting Agreement',
      category: 'Consulting',
      body: '<h2>Project-Based Consulting Agreement</h2>\n<p>This Project-Based Consulting Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Consultant").</p>\n<h3>1. Project Scope</h3>\n<p>Consultant will deliver the following: {scope}. Milestones and deliverables as outlined in Exhibit A.</p>\n<h3>2. Fees & Payment</h3>\n<p>Total project fee: $ {total_fee}. Payment schedule: {deposit_percentage}% deposit on signing, {milestone_payments}% at each milestone, balance on delivery.</p>\n<h3>3. Timeline</h3>\n<p>Project commences {start_date}. Estimated completion: {end_date}. Milestone dates in Exhibit A.</p>\n<h3>4. Change Requests</h3>\n<p>Changes to scope require written Change Order. Additional work billed at $ {change_order_rate}/hr. Consultant will provide estimate before proceeding.</p>\n<h3>5. Acceptance & Warranty</h3>\n<p>Client has {acceptance_period} business days to review each deliverable. Consultant warrants work for {warranty_period} days post-delivery.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{total_fee}', '{start_date}', '{end_date}', '{change_order_rate}', '{acceptance_period}', '{warranty_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my client relationships and flag at-risk retainer clients.',
    time: 'Help me prepare for my next session with client-specific context.',
    finance: 'Compare retainer revenue stability vs project revenue volatility.',
  },
};

export default consultant;
