import type { ArchetypeConfig } from './types';

const cybersecurity: ArchetypeConfig = {
  id: 'cybersecurity',
  label: 'Cybersecurity Consultant',
  emoji: '🔐',
  tagline: 'The tool for people who measure success in threats neutralized',
  description: 'Built for cybersecurity professionals. Track audits, vulnerabilities, and compliance.',
  psychProfile: 'Thinks in audits, vulnerabilities, and compliance frameworks. Every finding is a billable deliverable. Remediation tracking is key.',
  icon: 'Shield',
  theme: 'terminal',

  dashboard: {
    greeting: "What's under review?",
    subgreeting: 'Your audits, findings, and compliance at a glance.',
    metricCards: [
      { id: 'activeProjectsCount', label: 'Active audits', query: null, format: 'count', color: 'blue' },
      { id: 'upcomingMilestones', label: 'Findings requiring remediation', query: null, format: 'count', color: 'red' },
      { id: 'thisWeeksHours', label: 'Billable hours this month', query: null, format: 'hours', color: 'green' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'audit-tracker-widget', component: 'AuditTrackerWidget', priority: 1 },
      { id: 'vulnerability-log-widget', component: 'VulnerabilityLogWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Audit', action: '/projects', icon: 'FolderKanban' },
      { label: 'Log Finding', action: '/projects', icon: 'Bug' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'projects', label: 'Audits', icon: 'FolderKanban', path: '/projects' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Reports', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Security Practice',
    panels: [
      { id: 'revenue-per-audit-type', title: 'Revenue per Audit Type', component: 'RevenuePerTypePanel', query: 'revenuePerType', mode: 'quantitative', priority: 1 },
      { id: 'findings-by-severity', title: 'Findings by Severity', component: 'FindingsBySeverityPanel', query: 'findingsBySeverity', mode: 'quantitative', priority: 2 },
      { id: 'remediation-timeline', title: 'Remediation Timeline', component: 'RemediationTimelinePanel', query: 'remediationTimeline', mode: 'quantitative', priority: 3 },
      { id: 'compliance-standard', title: 'Revenue by Compliance Standard', component: 'RevenueByStandardPanel', query: 'revenueByStandard', mode: 'qualitative', priority: 4 },
      { id: 'retainer-utilization', title: 'Retainer Utilization', component: 'RetainerUtilizationPanel', query: 'retainerUtilization', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: ['client-performance'],
  },

  archetypeFeatures: [
    { id: 'audit-tracker', name: 'Audit Tracker', description: 'Track audit phases and findings', component: 'AuditTracker', injectInto: 'projects', position: 'tab' },
    { id: 'vulnerability-log', name: 'Vulnerability Log', description: 'Log vulnerabilities with CVSS scores', component: 'VulnerabilityLog', injectInto: 'projects', position: 'panel' },
    { id: 'remediation-tracker', name: 'Remediation Tracker', description: 'Track remediation status per finding', component: 'RemediationTracker', injectInto: 'projects', position: 'tab' },
    { id: 'compliance-framework-log', name: 'Compliance Framework Log', description: 'Tag audits by framework (SOC2, ISO, etc.)', component: 'ComplianceFrameworkLog', injectInto: 'clients', position: 'panel' },
  ],

  proposalTypes: ['hourly', 'flat', 'retainer'],
  defaultRateLabel: 'per hour',
  maxRevisions: 2,


  contractPresets: [
    {
      name: 'Security Audit Engagement',
      category: 'Cybersecurity',
      body: '<h2>Security Audit Engagement</h2>\n<p>This Security Audit Engagement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Auditor").</p>\n<h3>1. Scope of Audit</h3>\n<p>Auditor will perform a {audit_type} audit of {scope}. Frameworks: {frameworks}. Systems in scope: {systems_in_scope}.</p>\n<h3>2. Methodology</h3>\n<p>Methodology: {methodology} (OWASP, NIST, PTES, etc.). Testing: {testing_methods}. Timeline: {audit_duration_weeks} weeks.</p>\n<h3>3. Fees</h3>\n<p>Total fee: $ {total_fee}. Payment: {deposit_percentage}% deposit, {milestone_percentage}% at interim report, balance on final report delivery.</p>\n<h3>4. Reporting</h3>\n<p>Interim findings call at {interim_checkpoint}. Final report includes: executive summary, technical findings with CVSS scores, remediation guidance, and attestation letter.</p>\n<h3>5. Remediation Support</h3>\n<p>Post-audit remediation consultation: {remediation_support_hours} hours included. Additional support at $ {remediation_rate}/hr.</p>\n<h3>6. Confidentiality</h3>\n<p>All findings treated as highly confidential. Report encrypted at rest and in transit. {confidentiality_period} year confidentiality period.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{audit_type}', '{scope}', '{frameworks}', '{systems_in_scope}', '{methodology}', '{testing_methods}', '{audit_duration_weeks}', '{total_fee}', '{deposit_percentage}', '{milestone_percentage}', '{interim_checkpoint}', '{remediation_support_hours}', '{remediation_rate}', '{confidentiality_period}'],
    },
    {
      name: 'Security Advisory Retainer',
      category: 'Cybersecurity',
      body: '<h2>Security Advisory Retainer</h2>\n<p>This Security Advisory Retainer ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Advisor").</p>\n<h3>1. Monthly Commitment</h3>\n<p>Advisor reserves {hours_per_month} hours/month for Client. Priority incident response: {incident_response_sla} hours.</p>\n<h3>2. Monthly Retainer</h3>\n<p>Monthly fee: $ {monthly_retainer}. Includes up to {included_hours} hours. Overage at $ {overage_rate}/hr.</p>\n<h3>2. Scope</h3>\n<p>Ongoing security guidance: vulnerability triage, threat modeling, incident response planning, compliance guidance, security architecture review.</p>\n<h3>3. Payment & Reporting</h3>\n<p>Invoices 1st of month. Payment Net {payment_terms} days. Monthly activity report provided.</p>\n<h3>4. Term</h3>\n<p>Month-to-month. {notice_period} days notice to terminate.',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{hours_per_month}', '{incident_response_sla}', '{monthly_retainer}', '{included_hours}', '{overage_rate}', '{payment_terms}', '{notice_period}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Analyze my audit pipeline and flag overdue remediations.',
    time: 'Help me estimate audit hours by framework type.',
    finance: 'Compare my rates across different audit types.',
  },
};

export default cybersecurity;
