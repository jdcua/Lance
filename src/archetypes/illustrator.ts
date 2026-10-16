import type { ArchetypeConfig } from './types';

const illustrator: ArchetypeConfig = {
  id: 'illustrator',
  label: 'Illustrator / Artist',
  emoji: '🖌️',
  tagline: 'The tool for people who measure success in commissions completed',
  description: 'Built for illustrators and artists. Track commissions, styles, and licensing revenue.',
  psychProfile: 'Thinks in commissions. Has a style and clients either respect it or don\'t. Revision limits are sacred.',
  icon: 'Paintbrush',
  theme: 'studio',

  dashboard: {
    greeting: 'What are you drawing today?',
    subgreeting: 'Your commissions, queue, and licensing at a glance.',
    metricCards: [
      { id: 'openCommissionsCount', label: 'Open commissions', query: null, format: 'count', color: 'purple' },
      { id: 'activeProjectsCount', label: 'Queue position', query: null, format: 'count', color: 'blue' },
      { id: 'totalPaidRevenue', label: 'Paid this month', query: null, format: 'currency', color: 'green' },
      { id: 'revisionsRemaining', label: 'Revision rounds remaining', query: null, format: 'text', color: 'amber' },
    ],
    widgets: [
      { id: 'commission-queue-widget', component: 'CommissionQueueWidget', priority: 1 },
      { id: 'reference-board-widget', component: 'ReferenceBoardWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Commission', action: '/projects', icon: 'FolderKanban' },
      { label: 'Upload Art', action: '/assets', icon: 'Upload' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Commissions', icon: 'FolderKanban', path: '/projects' },
    { id: 'assets', label: 'Portfolio', icon: 'Package', path: '/assets' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Commission Economics',
    panels: [
      { id: 'revenue-by-style', title: 'Revenue by Style Type', component: 'RevenueByStylePanel', query: 'revenueByStyle', mode: 'qualitative', priority: 1 },
      { id: 'licensing-vs-commission', title: 'Licensing vs Commission Revenue', component: 'LicensingVsCommissionPanel', query: 'licensingVsCommission', mode: 'quantitative', priority: 2 },
      { id: 'revision-rounds', title: 'Revision Rounds per Client', component: 'RevisionRoundsPanel', query: 'revisionRounds', mode: 'qualitative', priority: 3 },
      { id: 'queue-velocity', title: 'Queue Velocity (Commissions/month)', component: 'QueueVelocityPanel', query: 'queueVelocity', mode: 'quantitative', priority: 4 },
      { id: 'top-clients-commissions', title: 'Top Clients by Commission Count', component: 'TopClientsCommissionsPanel', query: 'topClientsCommissions', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'commission-queue', name: 'Commission Queue', description: 'Ordered commission list with drag-to-reorder', component: 'CommissionQueue', injectInto: 'projects', position: 'tab' },
    { id: 'style-tag-system', name: 'Style Tag System', description: 'Tag projects by illustration style', component: 'StyleTagSystem', injectInto: 'projects', position: 'panel' },
    { id: 'licensing-tracker', name: 'Licensing Tracker', description: 'Log license types and fees per asset', component: 'LicensingTracker', injectInto: 'assets', position: 'panel' },
    { id: 'reference-board', name: 'Reference Board', description: 'Attach reference images per commission', component: 'ReferenceBoard', injectInto: 'projects', position: 'tab' },
    { id: 'commission-tos', name: 'Commission TOS', description: 'Store and auto-attach Terms of Service', component: 'CommissionTOS', injectInto: 'proposals', position: 'panel' },
  ],

  proposalTypes: ['flat', 'per-piece', 'hourly'],
  defaultRateLabel: 'per commission',

  depositPercentage: 30,
  paymentTerms: 14,
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Illustration Commission Agreement',
      category: 'Illustration',
      body: '<h2>Illustration Commission Agreement</h2>\n<p>This Illustration Commission Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Illustrator").</p>\n<h3>1. Commission Details</h3>\n<p>Illustrator will create: {description}. Style: {style}. Complexity: {complexity_level}. Dimensions: {dimensions}. File formats: {file_formats}.</p>\n<h3>2. Process</h3>\n<p>Sketch phase: {sketch_days} days. Client approves sketch. Final render: {render_days} days. Includes {included_revisions} revision rounds. Additional: $ {additional_revision_rate}/round.</p>\n<h3>3. Compensation</h3>\n<p>Rate: $ {rate} per {rate_type}. Total: $ {total_fee}. {deposit_percentage}% deposit. Balance due on final delivery.</p>\n<h3>4. Rights & Licensing</h3>\n<p>Client receives: {usage_rights}. Illustrator retains copyright. Commercial license: {commercial_license_included}. Print rights: {print_rights}. Illustrator may use for portfolio with attribution.</p>\n<h3>5. Cancellation</h3>\n<p>Client cancels after sketch approval: 50% fee. After final render: full fee. Illustrator cancels: full refund.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{description}', '{style}', '{complexity_level}', '{dimensions}', '{file_formats}', '{sketch_days}', '{render_days}', '{included_revisions}', '{additional_revision_rate}', '{rate}', '{rate_type}', '{total_fee}', '{deposit_percentage}', '{usage_rights}', '{commercial_license_included}', '{print_rights}'],
    },
    {
      name: 'Art Licensing Agreement',
      category: 'Licensing',
      body: '<h2>Art Licensing Agreement</h2>\n<p>This Art Licensing Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Licensee") and {freelancer_name} ("Licensor").</p>\n<h3>1. Licensed Work</h3>\n<p>Licensor grants license to use: {artwork_description}. Title: {artwork_title}. Style: {style}.</p>\n<h3>2. License Scope</h3>\n<p>Usage: {usage_scope}. Territory: {territory}. Term: {term_months} months. Exclusive: {exclusive}.</p>\n<h3>2. License Fee</h3>\n<p>Fee: $ {license_fee}. Payment: {payment_schedule}. Royalty: {royalty_percentage}% on revenue over $ {royalty_threshold}.</p>\n<h3>3. Restrictions</h3>\n<p>Licensee may not sublicense, modify, or create derivative works without written consent. Licensee must credit Licensor as: "{attribution}".</p>\n<h3>4. Termination</h3>\n<p>Licensee may terminate with {notice_period} days notice. Licensor may terminate for non-payment or breach.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{artwork_description}', '{artwork_title}', '{style}', '{usage_scope}', '{territory}', '{term_months}', '{exclusive}', '{license_fee}', '{payment_schedule}', '{royalty_percentage}', '{royalty_threshold}', '{attribution}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my commission queue and suggest which projects to prioritize.',
    proposals: 'Help me scope illustration projects based on past commission data.',
    finance: 'Compare my commission rates across different art styles.',
  },
};

export default illustrator;
