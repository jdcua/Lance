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

  aiPrompts: {
    dashboard: 'Analyze my audit pipeline and flag overdue remediations.',
    time: 'Help me estimate audit hours by framework type.',
    finance: 'Compare my rates across different audit types.',
  },
};

export default cybersecurity;
