import type { ArchetypeConfig } from './types';

const nutritionist: ArchetypeConfig = {
  id: 'nutritionist',
  label: 'Nutritionist / Dietitian',
  emoji: '🥗',
  tagline: 'The tool for people who measure success in habits changed',
  description: 'Built for nutritionists and dietitians. Track clients, meal plans, and dietary progress.',
  psychProfile: 'Thinks in clients, meal plans, and biomarkers. Every consultation builds toward a healthier lifestyle. Compliance is the challenge.',
  icon: 'Apple',
  theme: 'craft',

  dashboard: {
    greeting: "Who are you nourishing today?",
    subgreeting: 'Your clients, consultations, and meal plans at a glance.',
    metricCards: [
      { id: 'clientsCount', label: 'Active clients', query: null, format: 'count', color: 'green' },
      { id: 'sessionsThisWeek', label: 'Consultations this week', query: null, format: 'count', color: 'blue' },
      { id: 'draftsCount', label: 'Meal plans pending delivery', query: null, format: 'count', color: 'purple' },
      { id: 'totalOutstanding', label: 'Outstanding', query: null, format: 'currency', color: 'amber' },
    ],
    widgets: [
      { id: 'meal-plan-widget', component: 'MealPlanWidget', priority: 1 },
      { id: 'biomarker-tracker-widget', component: 'BiomarkerTrackerWidget', priority: 2 },
    ],
    quickActions: [
      { label: 'New Client', action: '/clients', icon: 'Users' },
      { label: 'Log Consultation', action: '/time', icon: 'Clock' },
      { label: 'Send Invoice', action: '/invoices', icon: 'Receipt' },
    ],
  },

  sidebar: [
    { id: 'clients', label: 'Clients', icon: 'Users', path: '/clients' },
    { id: 'time', label: 'Consultations', icon: 'Clock', path: '/time' },
    { id: 'projects', label: 'Meal Plans', icon: 'FolderKanban', path: '/projects' },
    { id: 'invoices', label: 'Invoices', icon: 'Receipt', path: '/invoices' },
    { id: 'finance', label: 'Finance', icon: 'BarChart3', path: '/finance' },
    { id: 'proposals', label: 'Proposals', icon: 'FileText', path: '/proposals' },
    { id: 'contracts', label: 'Contracts', icon: 'PenLine', path: '/contracts' },
    { id: 'assets', label: 'Resources', icon: 'Package', path: '/assets' },
    { id: 'insights', label: 'Insights', icon: 'Lightbulb', path: '/insights' },
  ],

  insights: {
    mode: 'qualitative',
    headline: 'Practice Health',
    panels: [
      { id: 'revenue-per-client', title: 'Revenue per Client', component: 'RevenuePerClientPanel', query: 'revenuePerClient', mode: 'quantitative', priority: 1 },
      { id: 'session-frequency', title: 'Consultation Frequency', component: 'SessionFrequencyPanel', query: 'sessionFrequency', mode: 'quantitative', priority: 2 },
      { id: 'retention-rate', title: 'Client Retention Rate', component: 'RetentionRatePanel', query: 'retentionRate', mode: 'quantitative', priority: 3 },
      { id: 'meal-plan-compliance', title: 'Meal Plan Compliance', component: 'MealPlanCompliancePanel', query: 'mealPlanCompliance', mode: 'qualitative', priority: 4 },
      { id: 'revenue-by-specialty', title: 'Revenue by Specialty Area', component: 'RevenueBySpecialtyPanel', query: 'revenueBySpecialty', mode: 'qualitative', priority: 5 },
    ],
    hidePanels: ['client-performance', 'top-projects'],
  },

  archetypeFeatures: [
    { id: 'meal-plan-builder', name: 'Meal Plan Builder', description: 'Build and deliver meal plans', component: 'MealPlanBuilder', injectInto: 'projects', position: 'tab' },
    { id: 'biomarker-tracker', name: 'Biomarker Tracker', description: 'Log client biomarkers over time', component: 'BiomarkerTracker', injectInto: 'clients', position: 'panel' },
    { id: 'dietary-assessment', name: 'Dietary Assessment', description: 'Log initial and follow-up assessments', component: 'DietaryAssessment', injectInto: 'clients', position: 'tab' },
    { id: 'food-diary-reviews', name: 'Food Diary Reviews', description: 'Log food diary review notes', component: 'FoodDiaryReviews', injectInto: 'time', position: 'panel' },
  ],

  proposalTypes: ['per-session', 'per-plan', 'retainer'],
  defaultRateLabel: 'per consultation',

  aiPrompts: {
    dashboard: 'Analyze my practice and flag clients needing follow-up.',
    time: 'Help me batch meal plan creation efficiently.',
    finance: 'Compare my revenue across different service packages.',
  },
};

export default nutritionist;
