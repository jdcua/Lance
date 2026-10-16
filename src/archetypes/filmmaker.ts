import type { ArchetypeConfig } from './types';

const filmmaker: ArchetypeConfig = {
  id: 'filmmaker',
  label: 'Filmmaker / Videographer',
  emoji: '🎥',
  tagline: 'The tool for people who measure success in final cuts delivered',
  description: 'Built for filmmakers and videographers. Track production phases, crew, and deliverables.',
  psychProfile: 'Thinks in production phases. Pre-production planning, production chaos, post-production grind.',
  icon: 'Film',
  theme: 'lens',

  dashboard: {
    greeting: "What's in pre-pro?",
    subgreeting: 'Your productions, shoots, and post-production at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active productions', query: null, format: 'count', color: 'blue' },
      { id: 'daysUntilNextShoot', label: 'Days until next shoot', query: null, format: 'text', color: 'purple' },
      { id: 'unbilledHours', label: 'Post hours remaining (est)', query: null, format: 'hours', color: 'amber' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'production-phase-widget', component: 'ProductionPhaseWidget', priority: 1 },
      { id: 'shot-list-widget', component: 'ShotListWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'Log Shoot', action: 'shoot-log', icon: 'Camera' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Add Expense', action: '/finance', icon: 'BarChart3' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Production Economics',
    panels: [
      { id: 'hours-per-phase', title: 'Hours per Production Phase', component: 'HoursPerPhasePanel', query: 'hoursPerPhase', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-type', title: 'Revenue per Project Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 2 },
      { id: 'expense-ratio', title: 'Expense Ratio (Crew+Equipment vs Revenue)', component: 'ExpenseRatioPanel', query: 'expenseRatio', mode: 'quantitative', priority: 3 },
      { id: 'delivery-turnaround', title: 'Delivery Turnaround', component: 'DeliveryTurnaroundPanel', query: 'deliveryTurnaround', mode: 'quantitative', priority: 4 },
      { id: 'cut-revision-rounds', title: 'Cut Revision Rounds', component: 'CutRevisionRoundsPanel', query: 'cutRevisionRounds', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'production-phase-tracker', name: 'Production Phase Tracker', description: 'Track pre/production/post/delivery phases', component: 'ProductionPhaseTracker', injectInto: 'projects', position: 'panel' },
    { id: 'shot-list', name: 'Shot List', description: 'Log shots with status per project', component: 'ShotList', injectInto: 'projects', position: 'tab' },
    { id: 'crew-equipment-log', name: 'Crew & Equipment Log', description: 'Track crew and equipment as expenses', component: 'CrewEquipmentLog', injectInto: 'finance', position: 'panel' },
    { id: 'cut-tracker', name: 'Cut Tracker', description: 'Log video cuts delivered', component: 'CutTracker', injectInto: 'projects', position: 'tab' },
    { id: 'deliverable-specs', name: 'Deliverable Specs', description: 'Define deliverable specs per project', component: 'DeliverableSpecs', injectInto: 'projects', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',

  depositPercentage: 50,
  paymentTerms: 7,
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Video Production Agreement',
      category: 'Video Production',
      body: '<h2>Video Production Agreement</h2>\n<p>This Video Production Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Producer").</p>\n<h3>1. Production Scope</h3>\n<p>Producer will create: {project_type} video. Concept: {concept}. Duration: {duration_minutes} minutes. Format: {delivery_format}. Resolution: {resolution}.</p>\n<h3>2. Production Phases</h3>\n<p>Pre-production: {prepro_days} days (script, storyboard, location scout, casting). Production: {production_days} days. Post-production: {postpro_weeks} weeks.</p>\n<h3>2. Compensation</h3>\n<p>Total fee: $ {total_fee}. {deposit_percentage}% deposit. Milestones: {milestone_schedule}. Additional shoot days: $ {additional_day_rate}/day.</p>\n<h3>3. Crew & Equipment</h3>\n<p>Producer provides: {equipment_list}. Additional crew: $ {crew_rate}/day per person. Client approves crew list.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} revision rounds. Additional rounds: $ {revision_rate}/round. Final cut approval required before delivery.</p>\n<h3>4. Rights & Delivery</h3>\n<p>Client receives: {deliverables_list}. Formats: {delivery_formats}. Raw footage retained by Producer unless purchased: $ {raw_footage_fee}.</p>\n<h3>5. Usage Rights</h3>\n<p>Client: {usage_rights}. Producer retains right to use in portfolio/showreel with attribution.</p>\n<h3>6. Cancellation</h3>\n<p>Client cancels: deposit + costs incurred. Producer cancels: full refund + cover replacement costs.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{project_type}', '{concept}', '{duration_minutes}', '{delivery_format}', '{resolution}', '{prepro_days}', '{production_days}', '{postpro_weeks}', '{total_fee}', '{deposit_percentage}', '{milestone_schedule}', '{additional_day_rate}', '{equipment_list}', '{crew_rate}', '{included_revisions}', '{revision_rate}', '{deliverables_list}', '{delivery_formats}', '{raw_footage_fee}', '{usage_rights}'],
    },
    {
      name: 'Retainer Video Agreement',
      category: 'Video Production',
      body: '<h2>Retainer Video Agreement</h2>\n<p>This Retainer Video Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Producer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Producer reserves {shoot_days_per_month} shoot days/month. Post-production hours: {post_hours_per_month} hrs/month.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes: {included_shoot_days} shoot days, {included_post_hours} post hours. Overage: $ {overage_day_rate}/shoot day, $ {overage_post_rate}/post hour.</p>\n<h3>2. Scope</h3>\n<p>Ongoing video content: {content_types}. Social media, ads, testimonials, internal comms.</p>\n<h3>3. Workflow</h3>\n<p>Shot list due {brief_due_days} days before shoot. Rough cut {rough_cut_days} days post-shoot. {included_revisions} revisions included.</p>\n<h3>4. Payment</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{shoot_days_per_month}', '{post_hours_per_month}', '{monthly_retainer}', '{included_shoot_days}', '{included_post_hours}', '{overage_shoot_day_rate}', '{overage_post_hour_rate}', '{content_types}', '{brief_due_days}', '{rough_cut_days}', '{included_revisions}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my production pipeline and suggest where phases are taking too long.',
    time: 'Help me estimate post-production hours based on shoot duration.',
    finance: 'Compare crew and equipment costs across my projects.',
  },
};

export default filmmaker;
