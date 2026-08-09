import type { ArchetypeConfig } from './types';

const animator: ArchetypeConfig = {
  id: 'animator',
  label: 'Animator / Motion Designer',
  emoji: '🎬',
  tagline: 'The tool for people who measure success in renders shipped',
  description: 'Purpose-built for animators and motion designers. Track phases, renders, and revision rounds.',
  psychProfile: 'Animators think in phases. Time is their currency. Render time is unbillable hell.',
  icon: 'Clapperboard',
  theme: 'motion',

  dashboard: {
    greeting: "What's in the pipeline?",
    subgreeting: 'Your projects, phases, and render time at a glance.',
    metricCards: [
      { id: 'thisWeeksHours', label: 'Hours on active projects this week', query: null, format: 'hours', color: 'green' },
      { id: 'activeProjectsWithHours', label: 'Most time-heavy project', query: null, format: 'text', color: 'blue' },
      { id: 'unbilledRenderHours', label: 'Unbilled render hours', query: null, format: 'hours', color: 'amber' },
      { id: 'upcomingMilestones', label: 'Upcoming milestones', query: null, format: 'count', color: 'purple' },
    ],
    widgets: [
      { id: 'project-phases', component: 'ProjectPhasesWidget', priority: 1 },
    ],
    quickActions: [
      { label: 'Log Render', action: 'render-log', icon: 'Monitor' },
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
    ],
  },

  sidebar: [
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Utilization & Rate',
    panels: [
      { id: 'hours-per-phase', title: 'Hours per Project Phase', component: 'HoursPerPhasePanel', query: 'hoursPerPhase', mode: 'quantitative', priority: 1 },
      { id: 'render-vs-billable', title: 'Render Time vs Billable Time', component: 'RenderVsBillablePanel', query: 'renderVsBillable', mode: 'quantitative', priority: 2 },
      { id: 'revision-rounds', title: 'Revision Rounds per Client', component: 'RevisionRoundsPanel', query: 'revisionRounds', mode: 'quantitative', priority: 3 },
      { id: 'time-to-delivery', title: 'Time to Delivery per Project', component: 'TimeToDeliveryPanel', query: 'timeToDelivery', mode: 'quantitative', priority: 4 },
      { id: 'unbilled-trend', title: 'Unbilled Hours Trend', component: 'UnbilledTrendPanel', query: 'unbilledTrend', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'render-log', name: 'Render Log', description: 'Log render jobs separately from regular time entries', component: 'RenderLog', injectInto: 'time', position: 'tab' },
    { id: 'phase-tracker', name: 'Phase Tracker', description: 'Tag projects and time entries by production phase', component: 'PhaseTracker', injectInto: 'projects', position: 'panel' },
    { id: 'revision-counter', name: 'Revision Counter', description: 'Track revision rounds and warn at contract limits', component: 'RevisionCounter', injectInto: 'projects', position: 'panel' },
    { id: 'deliverable-log', name: 'Deliverable Log', description: 'Log deliverables with specs and approval status', component: 'DeliverableLog', injectInto: 'projects', position: 'tab' },
  ],

  proposalTypes: ['hourly', 'flat', 'project'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Animation Service Agreement',
      category: 'Animation',
      body: '<h2>Animation Service Agreement</h2>\n<p>This Animation Service Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Animator").</p>\n<h3>1. Scope of Work</h3>\n<p>Animator will create the following animation: {scope}. Style: {animation_style}. Duration: {duration_seconds} seconds. Resolution: {resolution}. Frame rate: {frame_rate} fps.</p>\n<h3>2. Production Phases</h3>\n<p>Phase 1: Storyboard/Animatic ({storyboard_days} days). Phase 2: Rough Animation ({rough_animation_days} days). Phase 3: Clean-up/Color ({cleanup_days} days). Phase 4: Compositing/Render ({compositing_days} days).</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total estimated: $ {estimated_total}. {deposit_percentage}% deposit on signing. Milestone payments per phase.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} revision rounds per phase. Additional revisions: $ {additional_revision_rate} per round. Revisions beyond scope require Change Order.</p>\n<h3>4. Delivery & Formats</h3>\n<p>Final delivery in {file_formats}. Resolution: {resolution}. Frame rate: {frame_rate}. Source files (project files) retained by Animator unless purchased separately.</p>\n<h3>5. Usage Rights</h3>\n<p>Client receives license for {usage_rights}. Animator retains right to use work for portfolio/showreel with attribution.</p>\n<h3>6. Cancellation</h3>\n<p>Client may cancel at any time. Work completed to date billed at hourly rate. Deposit non-refundable.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{animation_style}', '{duration_seconds}', '{resolution}', '{frame_rate}', '{rate}', '{rate_type}', '{deposit_percentage}', '{estimated_total}', '{included_revisions}', '{additional_revision_rate}', '{auto_acceptance_days}'],
    },
    {
      name: 'Motion Design Retainer',
      category: 'Animation',
      body: '<h2>Motion Design Retainer</h2>\n<p>This Motion Design Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Animator").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Animator reserves {hours_per_month} hours per month for Client. Priority scheduling for urgent requests.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing motion design work: {scope}. Social media animations, UI animations, explainer videos, etc.</p>\n<h3>3. Workflow</h3>\n<p>Briefs due by {brief_due_date} of each month. First drafts delivered by {draft_due_date}. {included_revisions} revision rounds included per deliverable.</p>\n<h3>4. Payment Terms</h3>\n<p>Invoices sent 1st of month. Payment Net {payment_terms} days.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. Either party may terminate with {notice_period} days notice.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{scope}', '{brief_due_date}', '{draft_due_date}', '{included_revisions}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my animation pipeline and suggest where I might be losing time.',
    time: 'Help me estimate how long similar renders took last time.',
    finance: 'Compare my render time cost to my effective hourly rate.',
  },
};

export default animator;
