import type { ArchetypeConfig } from './types';

const defaultArchetype: ArchetypeConfig = {
  id: 'default',
  label: 'General Freelancer',
  emoji: '💼',
  tagline: 'The flexible tool for independent professionals',
  description: 'A balanced workspace for any freelance professional. All the essentials, nothing extra.',
  psychProfile: 'Thinks in projects, clients, and invoices. Wants clarity on cash flow and deadlines.',
  icon: 'Briefcase',
  theme: 'default',

  dashboard: {
    greeting: 'Welcome back',
    subgreeting: 'Here\'s your business at a glance.',
    metricCards: [
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
      { id: 'totalPaidRevenue', label: 'Paid (Lifetime)', query: null, format: 'currency', color: 'green' },
      { id: 'activeProjectsCount', label: 'Active Projects', query: null, format: 'count', color: 'green' },
      { id: 'todaysHours', label: 'Today', query: null, format: 'hours', color: 'green' },
    ],
    widgets: [
      { id: 'recent-invoices', component: 'RecentInvoices', priority: 1 },
      { id: 'recent-time', component: 'RecentTime', priority: 2 },
    ],
    quickActions: [
      { label: 'New Proposal', action: '/proposals/new', icon: 'FileText' },
      { label: 'Log Time', action: '/time', icon: 'Clock' },
      { label: 'New Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/projects' },
    { id: 'time', label: 'Time', icon: 'Clock', path: '/time' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'quantitative',
    headline: 'Business Overview',
    panels: [
      { id: 'project-health', title: 'Project Health', component: 'ProjectHealthPanel', query: 'projectHealth', mode: 'quantitative', priority: 1 },
      { id: 'financial-health', title: 'Financial Health', component: 'FinancialHealthPanel', query: 'financialHealth', mode: 'quantitative', priority: 2 },
      { id: 'top-clients', title: 'Top Clients by Revenue', component: 'TopClientsPanel', query: 'topClients', mode: 'quantitative', priority: 3 },
      { id: 'top-projects', title: 'Top Projects by Time', component: 'TopProjectsPanel', query: 'topProjects', mode: 'quantitative', priority: 4 },
      { id: 'client-performance', title: 'Client Performance', component: 'ClientPerformancePanel', query: 'clientPerformance', mode: 'quantitative', priority: 5 },
    ],
    hidePanels: [],
  },

  archetypeFeatures: [
    { id: 'kanban-board', name: 'Kanban Board', description: 'Drag-and-drop project board with customizable columns', component: 'KanbanBoard', injectInto: 'projects', position: 'tab' },
  ],
  proposalTypes: ['flat', 'hourly'],
  defaultRateLabel: 'per hour',
  maxRevisions: 3,


  contractPresets: [
    {
      name: 'General Service Agreement',
      category: 'General',
      body: '<h2>General Service Agreement</h2>\n<p>This Service Agreement ("Agreement") is entered into as of {date} by and between {client_name} ("Client") and {freelancer_name} ("Service Provider").</p>\n<h3>1. Services</h3>\n<p>Service Provider agrees to perform the following services: {scope}</p>\n<h3>2. Compensation</h3>\n<p>Client agrees to pay Service Provider $ {rate} per {rate_type}. Payment terms: Net {payment_terms} days from invoice date.</p>\n<h3>3. Term & Termination</h3>\n<p>This Agreement shall commence on {start_date} and continue until {end_date}, unless earlier terminated by either party with {notice_period} days written notice.</p>\n<h3>4. Independent Contractor</h3>\n<p>Service Provider is an independent contractor, not an employee of Client.</p>\n<h3>5. Governing Law</h3>\n<p>This Agreement shall be governed by the laws of {jurisdiction}.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{scope}', '{rate}', '{rate_type}', '{payment_terms}', '{start_date}', '{end_date}', '{notice_period}', '{jurisdiction}'],
    },
    {
      name: 'Simple NDA',
      category: 'Legal',
      body: '<h2>Mutual Non-Disclosure Agreement</h2>\n<p>This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {date} by and between {client_name} and {freelancer_name} (collectively, the "Parties").</p>\n<h3>1. Purpose</h3>\n<p>The Parties wish to explore a potential business relationship regarding: {purpose}.</p>\n<h3>2. Confidential Information</h3>\n<p>"Confidential Information" means any information disclosed by one Party to the other, whether orally, in writing, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential.</p>\n<h3>3. Obligations</h3>\n<p>Each Party agrees to: (a) hold Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party; (c) use Confidential Information solely for the Purpose.</p>\n<h3>4. Exclusions</h3>\n<p>Confidential Information does not include information that: (a) is or becomes publicly known; (b) was independently developed; (c) was rightfully received from a third party.</p>\n<h3>5. Term</h3>\n<p>This Agreement shall remain in effect for {term_months} months from the date hereof.</p>',
      variables: ['{client_name}', '{freelancer_name}', '{date}', '{purpose}', '{term_months}'],
    },
  ],

  aiPrompts: {
    dashboard: 'Summarize my freelance business health based on current metrics.',
    proposals: 'Help me draft a compelling proposal.',
    finance: 'Analyze my financial data and suggest optimizations.',
  },
};

export default defaultArchetype;
