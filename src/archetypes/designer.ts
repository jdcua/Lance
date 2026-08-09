import type { ArchetypeConfig } from './types';

const designer: ArchetypeConfig = {
  id: 'designer',
  label: 'Graphic / Brand Designer',
  emoji: '🎨',
  tagline: 'The tool for people who measure success in rounds survived',
  description: 'Built for brand and graphic designers. Track revision cycles, assets, and client feedback.',
  psychProfile: 'Thinks in rounds. Every client relationship is measured by how many revision rounds they burn. Asset handoff is the finish line.',
  icon: 'Palette',
  theme: 'studio',

  dashboard: {
    greeting: 'What are you designing today?',
    subgreeting: 'Your projects, revisions, and asset deliveries at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active revision cycles', query: null, format: 'count', color: 'purple' },
      { id: 'draftsCount', label: 'Awaiting client feedback', query: null, format: 'count', color: 'amber' },
      { id: 'assetsCount', label: 'Assets delivered this month', query: null, format: 'count', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'revision-tracker-widget', component: 'RevisionTrackerWidget', priority: 1 },
      { id: 'brand-vault-widget', component: 'BrandVaultWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Project', action: '/projects', icon: 'FolderKanban' },
      { label: 'Upload Asset', action: '/assets', icon: 'Upload' },
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Client & Revision Health',
    panels: [
      { id: 'revision-rounds-client', title: 'Revision Rounds per Client', component: 'RevisionRoundsPanel', query: 'revisionRounds', mode: 'qualitative', priority: 1 },
      { id: 'avg-rounds-type', title: 'Avg Rounds per Project Type', component: 'AvgRoundsTypePanel', query: 'avgRoundsType', mode: 'qualitative', priority: 2 },
      { id: 'feedback-frequency', title: 'Client Feedback Frequency', component: 'FeedbackFrequencyPanel', query: 'feedbackFrequency', mode: 'qualitative', priority: 3 },
      { id: 'asset-volume', title: 'Asset Volume per Project', component: 'AssetVolumePanel', query: 'assetVolume', mode: 'qualitative', priority: 4 },
      { id: 'on-time-delivery', title: 'On-Time Delivery Rate', component: 'OnTimeDeliveryPanel', query: 'onTimeDelivery', mode: 'qualitative', priority: 5 },
      { id: 'most-revised-clients', title: 'Most-Revised Clients', component: 'MostRevisedClientsPanel', query: 'mostRevisedClients', mode: 'qualitative', priority: 6 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'revision-tracker', name: 'Revision Tracker', description: 'Log revision rounds and warn at contract limits', component: 'RevisionTracker', injectInto: 'projects', position: 'panel' },
    { id: 'brand-vault', name: 'Brand Vault', description: 'Organize brand deliverables by type', component: 'BrandVault', injectInto: 'assets', position: 'tab' },
    { id: 'mood-board', name: 'Mood Board', description: 'Attach reference images per project', component: 'MoodBoard', injectInto: 'projects', position: 'tab' },
    { id: 'feedback-log', name: 'Feedback Log', description: 'Track client communication patterns', component: 'FeedbackLog', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['flat', 'hourly', 'project'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'Brand Design Agreement',
      category: 'Design',
      body: '<h2>Brand Design Agreement</h2>\n<p>This Brand Design Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Designer").</p>\n<h3>1. Scope</h3>\n<p>Designer will create: {deliverables_list}. Scope includes: {scope_details}. Brand strategy: {brand_strategy_included}.</p>\n<h3>2. Design Process</h3>\n<p>Phase 1: Discovery & Strategy ({discovery_days} days). Phase 2: Concept Development ({concept_days} days). Phase 3: Design System ({system_days} days). Phase 4: Asset Production ({production_days} days).</p>\n<h3>2. Compensation</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% at brand system delivery, balance on final asset handoff.</p>\n<h3>3. Revisions</h3>\n<p>Includes {included_revisions} revision rounds per phase. Additional revisions: $ {additional_revision_rate} per round.</p>\n<h3>4. Deliverables & Handoff</h3>\n<p>Files delivered in {file_formats}. Includes: logo files, color palette, typography, imagery style, brand guidelines document. Source files (Figma/Sketch/Adobe) retained by Designer unless purchased separately.</p>\n<h3>5. Usage Rights</h3>\n<p>Client receives full commercial rights. Designer retains right to use work for portfolio with attribution.</p>\n<h3>6. Kill Fee</h3>\n<p>If Client cancels, Client pays for work completed to date. Minimum {kill_fee_percentage}% of total fee.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{deliverables_list}', '{scope_details}', '{brand_strategy_included}', '{discovery_days}', '{concept_days}', '{system_days}', '{production_days}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}', '{included_revisions}', '{additional_revision_rate}', '{kill_fee_percentage}'],
    },
    {
      name: 'Design Retainer',
      category: 'Design',
      body: '<h2>Design Retainer</h2>\n<p>This Design Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Designer").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Designer reserves {hours_per_month} hours/month for Client. Priority scheduling for urgent requests.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing design work: {scope}. Social media assets, marketing collateral, UI components, presentations, etc.</p>\n<h3>3. Workflow</h3>\n<p>Briefs due by {brief_due} of each month. First drafts by {draft_due}. {included_revisions} revision rounds included per deliverable.</p>\n<h3>4. Payment Terms</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days.</p>\n<h3>5. Term</h3>\n<p>Month-to-month. Either party may terminate with {notice_period} days notice.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{scope}', '{brief_due}', '{draft_due}', '{included_revisions}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my design pipeline and flag clients with high revision counts.',
    proposals: 'Help me scope design projects based on past revision data.',
    finance: 'Compare my design rates to my effective hourly after revisions.',
  },
};

export default designer;
