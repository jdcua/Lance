/**
 * ArchetypeFeatureTabs · renders archetype-specific feature tabs and panels.
 * Reads the current archetype's features list, filters by injectInto target,
 * and renders tab-based navigation for position: 'tab' items and inline panels for 'panel' items.
 */
import { useState, Suspense } from 'react';
import { useStore } from '../../store';
import { getArchetype } from '../../archetypes';
import { getFeatureComponent } from './registry';
import type { ArchetypeFeatureDef } from '../../archetypes/types';

type Props = {
  screen: string;
  context?: Record<string, string>;
};

export default function ArchetypeFeatureTabs({ screen, context = {} }: Props) {
  const profile = useStore((s) => s.profile);
  const config = getArchetype(profile?.profession || 'default');
  const features = config.archetypeFeatures.filter((f) => f.injectInto === screen);

  if (features.length === 0) return null;

  const tabs = features.filter((f) => f.position === 'tab');
  const panels = features.filter((f) => f.position === 'panel');

  return (
    <div className="mt-4 space-y-3">
      {panels.length > 0 && panels.map((f) => (
        <Suspense key={f.id} fallback={<div className="h-16 bg-[var(--bg-secondary)] rounded skeleton-pulse" />}>
          <FeaturePanel feature={f} context={context} />
        </Suspense>
      ))}
      {tabs.length > 0 && <FeatureTabBar features={tabs} context={context} />}
    </div>
  );
}

function FeaturePanel({ feature, context }: { feature: ArchetypeFeatureDef; context: Record<string, string> }) {
  const Component = getFeatureComponent(feature.component);
  if (!Component) return null;
  const props = { ...resolveProps(feature, context), title: feature.name, description: feature.description };
  return (
    <div className="p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-color)]">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{feature.name}</span>
      </div>
      <Component {...props} />
    </div>
  );
}

function FeatureTabBar({ features, context }: { features: ArchetypeFeatureDef[]; context: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState(features[0]?.id || '');

  const activeFeature = features.find((f) => f.id === activeTab) || features[0];
  const Component = activeFeature ? getFeatureComponent(activeFeature.component) : null;

  return (
    <div>
      <div className="flex gap-0 border-b border-[var(--border-color)] mb-3">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveTab(f.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === f.id
                ? 'border-[var(--accent)] text-[var(--accent-ink,var(--accent))]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
      {Component && (
        <Suspense fallback={<div className="h-16 bg-[var(--bg-secondary)] rounded skeleton-pulse" />}>
          <Component {...resolveProps(activeFeature!, context)} title={activeFeature!.name} description={activeFeature!.description} />
        </Suspense>
      )}
    </div>
  );
}

function resolveProps(feature: ArchetypeFeatureDef, context: Record<string, string>): Record<string, string> {
  const component = feature.component;

  const needsProjectId = [
    'RenderLog', 'RenderLogWidget', 'BuildLog', 'BuildLogWidget', 'BuildDeliveryLog',
    'ShootLog', 'ShootLogWidget', 'RevisionTracker', 'RevisionTrackerWidget', 'RevisionCounter',
    'DatasetLog', 'DatasetLogWidget', 'PhaseTracker', 'ProjectPhasesWidget', 'DeliverableLog',
    'ProductionPhaseTracker', 'ProductionPhaseWidget', 'ShotList', 'ShotListWidget',
    'CutTracker', 'DeliverableSpecs', 'AssetComplexityLog', 'AssetComplexityWidget',
    'DeliverableFormatLog', 'MoodBoard', 'CullingTracker', 'DeliveryTracker',
    'EquipmentLog', 'StorageTracker', 'StorageTrackerWidget', 'PublicationLog',
    'OutcomeNotes', 'SprintBoard', 'SprintBoardWidget', 'StackLogger', 'BugLog',
    'FeatureScopeBoard', 'FeatureScopeWidget', 'PlatformLog', 'QALog',
    'ResearchLog', 'PrototypeTracker', 'PrototypeTrackerWidget', 'UsabilityTestLog',
    'HandoffChecklist', 'HandoffChecklistWidget', 'ComponentCount',
    'CampaignTracker', 'ChannelLog', 'CrewEquipmentLog',
    'AnalysisPhaseTracker', 'AnalysisPhaseWidget', 'ToolComputeLog', 'ComplexityTagger',
    'ExperimentTracker', 'ExperimentTrackerWidget', 'ModelRegistry', 'ModelRegistryWidget',
    'ComputeCostLog', 'DatasetVersioning',
    'CurriculumTracker', 'CurriculumProgressWidget', 'ProgressReports',
    'StemTracker', 'CreditLog', 'ConsultantLog',
    'SubmissionTracker', 'RevisionSetLog', 'SiteVisitLog',
    'LanguagePairTracker', 'QualityLevelLog',
    'AnalysisDeliverableLog', 'DeliverableLogAnalyst',
    'StyleTagSystem', 'ReferenceBoard', 'ReferenceBoardWidget',
    'IncidentLog', 'AutomationTracker', 'InfraDashboard', 'SLATracker',
    'PhaseGateTracker',
    'KanbanBoard', 'KanbanBoardWidget',
    // BrandVault injects into projects
    'BrandVault', 'BrandVaultWidget',
    // SpendPacingDashboard needs projectId
    'SpendPacing', 'SpendPacingDashboard',
    // Accountant
    'LedgerLog', 'LedgerWidget', 'ReconciliationTracker',
    // Advertiser
    'CampaignBudgetTracker', 'BudgetPacingWidget',
    'CreativeRotationLog', 'CreativeFatigueWidget', 'PerformanceSnapshot',
    // Blockchain
    'SmartContractRegistry', 'ContractRegistryWidget',
    'AuditFindingLog', 'AuditTracker', 'AuditTrackerWidget',
    'GasTracker', 'ChainLog',
    // Copywriter
    'CTALibrary', 'ABVariantLog',
    // CX Strategist
    'JourneyMapBuilder', 'JourneyMapWidget',
    'ServiceBlueprint', 'ImpactMeasurement',
    // Cybersecurity
    'VulnerabilityLog', 'VulnerabilityLogWidget', 'RemediationTracker',
    // Embedded
    'BOMTracker', 'BOMTrackerWidget', 'FabricationTracker', 'ComponentInventory',
    // Event Planner
    'VendorDirectory', 'VendorDirectoryWidget', 'RunOfShowBuilder', 'RunOfShowWidget', 'GuestList', 'BudgetVsActualTracker',
    // Fashion Designer
    'CollectionTracker', 'CollectionTrackerWidget', 'SourcingLog', 'SourcingLogWidget', 'FittingLog',
    // Growth
    'FunnelTracker', 'FunnelMetricsWidget', 'MetricSnapshot', 'HypothesisBacklog',
    // Product Manager
    'RoadmapView', 'RoadmapWidget', 'FeaturePrioritization', 'FeaturePriorityWidget', 'StakeholderLog', 'ProductSpecBuilder',
    // Project Manager
    'DependencyTracker', 'ResourceAllocation', 'ResourceAllocationWidget',
    // Real Estate
    'ListingTracker', 'ListingTrackerWidget', 'ShowingLog', 'ComparableTracker',
    // PrototypeLog alias
    'PrototypeLog', 'PrototypeLogWidget',
    // Other
    'SubmissionTrackerWidget', 'LanguagePairWidget',
    'PhaseGateWidget', 'InfraHealthWidget',
    'TimelineView', 'TimelineWidget', 'StatusReportGenerator',
    'CATToolLog',
  ];
  if (needsProjectId.includes(component)) {
    return { projectId: context.projectId || '' };
  }

  const needsClientId = [
    'KeywordTracker', 'KeywordTrackerWidget', 'FeedbackLog', 'StyleGuide',
    'RetainerManager', 'ActionItemTracker', 'DeliverableTracker', 'DeliverableTrackerWidget',
    'ReportLog', 'RetainerHealthScore', 'RetainerHealthWidget',
    'ReportCadenceTracker', 'StudentRoster', 'StudentRosterWidget',
    'CancellationMonitor', 'IntakeFormStorage', 'ProgressTracker', 'ProgressTrackerWidget',
    'ProgramBuilder', 'AssessmentLog', 'ClientProgressWidget', 'ProgramTrackerWidget',
    'TaskLog', 'SOPStore', 'Glossary', 'ContentCalendar', 'PlatformTracker',
    'CommissionTOS',
    // Accountant
    'ClientFinancialSummary',
    // Copywriter
    'ContentTypeLibrary', 'ContentTypeWidget', 'BrandVoiceNotes',
    // CX Strategist
    'FeedbackAggregator', 'SatisfactionTrendWidget',
    // Cybersecurity
    'ComplianceFrameworkLog',
    // Fashion Designer
    'Lookbook',
    // Legal
    'CaseTracker', 'CaseTrackerWidget', 'FilingDeadlineCalendar', 'FilingDeadlineWidget',
    'DocumentVersionLog', 'ConflictCheckLog',
    // Nutritionist
    'MealPlanBuilder', 'MealPlanWidget', 'BiomarkerTracker', 'BiomarkerTrackerWidget',
    'DietaryAssessment', 'FoodDiaryReviews',
    // Recruiter
    'CandidatePipeline', 'PipelineWidget', 'PlacementLog', 'PlacementTrackerWidget',
    'ClientSearchTracker',
    // Voice Actor
    'AuditionLog', 'AuditionLogWidget', 'BookingTracker', 'BookingTrackerWidget',
    'EquipmentInventory',
    // Social Media extras
    'PostVolumeLog',
    // Virtual Assistant extras
    'RecurringTaskTemplates', 'ScopeAlert', 'SOPs',
    // Widget aliases
    'ContentCalendarWidget', 'PlatformTrackerWidget', 'GlossaryWidget',
    'TaskLogWidget', 'ReportCadenceWidget',
  ];
  if (needsClientId.includes(component)) {
    return { clientId: context.clientId || '' };
  }

  const needsClientAndProject = [
    'SessionLog', 'SessionNoteLog', 'SessionNoteWidget', 'SessionPrepLog', 'SessionPrep',
    'CommissionQueue', 'CommissionQueueWidget', 'SyncLicenseLog', 'LicensingTracker',
    'SessionRecorderLog', 'SessionLogWidget', 'SessionPrepWidget',
  ];
  if (needsClientAndProject.includes(component)) {
    return { clientId: context.clientId || '', projectId: context.projectId || '' };
  }

  const needsClientOrNothing = [
    'WordTracker', 'WordCharacterCounter',
  ];
  if (needsClientOrNothing.includes(component)) {
    const base: Record<string, string> = {};
    if (context.clientId) base.clientId = context.clientId;
    if (context.projectId) base.projectId = context.projectId;
    return base;
  }

  return {};
}
