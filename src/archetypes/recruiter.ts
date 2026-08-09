import type { ArchetypeConfig } from './types';

const recruiter: ArchetypeConfig = {
  id: 'recruiter',
  label: 'Recruiter / Talent Agent',
  emoji: '🤝',
  tagline: 'The tool for people who measure success in placements made',
  description: 'Built for recruiters and talent agents. Track candidates, placements, and client relationships.',
  psychProfile: 'Thinks in pipelines, placements, and commissions. Every placement is a closed deal. Pipeline velocity is everything.',
  icon: 'Handshake',
  theme: 'scale',

  dashboard: {
    greeting: "Who's in the pipeline?",
    subgreeting: 'Your candidates, placements, and commissions at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active searches', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Candidates in final stage', query: null, format: 'count', color: 'green' },
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'pipeline-widget', component: 'PipelineWidget', priority: 1 },
      { id: 'placement-tracker-widget', component: 'PlacementTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Search', action: '/projects', icon: 'FolderKanban' },
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Searches', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Placement Economics',
    panels: [
      { id: 'placement-rate', title: 'Placement Rate', component: 'PlacementRatePanel', query: 'placementRate', mode: 'quantitative', priority: 1 },
      { id: 'revenue-per-placement', title: 'Revenue per Placement', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 2 },
      { id: 'time-to-fill', title: 'Time to Fill Trend', component: 'TimeToFillPanel', query: 'timeToFill', mode: 'quantitative', priority: 3 },
      { id: 'pipeline-velocity', title: 'Pipeline Velocity', component: 'PipelineVelocityPanel', query: 'pipelineVelocity', mode: 'quantitative', priority: 4 },
      { id: 'client-retention', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'candidate-pipeline', name: 'Candidate Pipeline', description: 'Track candidates through hiring stages', component: 'CandidatePipeline', injectInto: 'projects', position: 'tab' },
    { id: 'placement-log', name: 'Placement Log', description: 'Log completed placements with fees', component: 'PlacementLog', injectInto: 'projects', position: 'panel' },
    { id: 'commission-calculator', name: 'Commission Calculator', description: 'Calculate earned commissions', component: 'CommissionCalculator', injectInto: 'finance', position: 'panel' },
    { id: 'client-search-tracker', name: 'Client Search Tracker', description: 'Track active searches per client', component: 'ClientSearchTracker', injectInto: 'clients', position: 'tab' },
  ],

  proposalTypes: ['commission-based', 'retainer', 'flat'],
  defaultRateLabel: 'per placement',
  maxRevisions: 1,


  contractPresets: [
    {
      name: 'Contingency Recruitment Agreement',
      category: 'Recruitment',
      body: '<h2>Contingency Recruitment Agreement</h2>\n<p>This Contingency Recruitment Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Recruiter").</p>\n<h3>1. Search Assignment</h3>\n<p>Recruiter will search for candidates for: {position_title}. Department: {department}. Location: {location}. Salary range: ${salary_min} - ${salary_max}.</p>\n<h3>2. Fee Structure</h3>\n<p>Fee: {fee_percentage}% of candidate\'s first-year base salary. Minimum fee: $ {minimum_fee}. Due within {payment_terms} days of candidate start date.</p>\n<h3>3. Guarantee</h3>\n<p>If candidate leaves within {guarantee_days} days, Recruiter will conduct replacement search at no additional fee (one replacement only).</p>\n<h3>4. Exclusivity</h3>\n<p>Client grants exclusivity for {exclusivity_days} days. Client may not engage other recruiters for same role during exclusivity period.</p>\n<h3>5. Candidate Ownership</h3>\n<p>Candidates presented are Recruiter\'s property for {candidate_ownership_days} days. Client may not hire directly during this period without fee.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{position_title}', '{department}', '{location}', '{salary_min}', '{salary_max}', '{fee_percentage}', '{minimum_fee}', '{payment_terms}', '{guarantee_days}', '{exclusivity_days}', '{candidate_ownership_days}'],
    },
    {
      name: 'Retained Search Agreement',
      category: 'Recruitment',
      body: '<h2>Retained Search Agreement</h2>\n<p>This Retained Search Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Recruiter").</p>\n<h3>1. Search Scope</h3>\n<p>Recruiter will conduct retained search for: {position_title}. Level: {seniority_level}. Target companies: {target_companies}.</p>\n<h3>2. Fee Structure</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% engagement fee, {midpoint_percentage}% at candidate slate delivery, balance on offer acceptance.</p>\n<h3>3. Process</h3>\n<p>Kickoff: {kickoff_days} days. Candidate slate: {slate_weeks} weeks. Interviews coordinated by Recruiter. Reference checks included.</p>\n<h3>4. Guarantee</h3>\n<p>If placed candidate leaves within {guarantee_days} days, Recruiter conducts replacement search at no additional fee.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{position_title}', '{seniority_level}', '{target_companies}', '{total_fee}', '{deposit_percentage}', '{midpoint_percentage}', '{kickoff_days}', '{slate_weeks}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my pipeline and flag at-risk searches.',
    time: 'Help me estimate time-to-fill for similar role types.',
    finance: 'Compare my commission rates across placement types.',
  },
};

export default recruiter;
