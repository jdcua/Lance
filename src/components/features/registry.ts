/**
 * Feature Component Registry
 * Maps archetype feature component string names to React components.
 * Used by ArchetypeFeatureTabs and Dashboard to resolve feature injections at runtime.
 */
import { lazy, type ComponentType } from 'react';

const FeatureComponents: Record<string, ComponentType<any>> = {
  // ── Render Passes (Animator, 3D Artist) ──
  RenderLog: lazy(() => import('./RenderLog')),
  RenderLogWidget: lazy(() => import('./RenderLog')),

  // ── Builds (Developer, Game Dev, DevOps) ──
  BuildLog: lazy(() => import('./BuildLog')),
  BuildLogWidget: lazy(() => import('./BuildLog')),

  // ── Shoots (Photographer, Filmmaker) ──
  ShootLog: lazy(() => import('./ShootLog')),
  ShootLogWidget: lazy(() => import('./ShootLog')),

  // ── Revisions (Designer, Illustrator, UX Designer) ──
  RevisionTracker: lazy(() => import('./RevisionTracker')),
  RevisionTrackerWidget: lazy(() => import('./RevisionTracker')),
  RevisionCounter: lazy(() => import('./RevisionCounter')),

  // ── Keywords (SEO, Marketing) ──
  KeywordTracker: lazy(() => import('./KeywordTracker')),
  KeywordTrackerWidget: lazy(() => import('./KeywordTracker')),

  // ── Datasets (Data Analyst, AI Engineer) ──
  DatasetLog: lazy(() => import('./DatasetLog')),
  DatasetLogWidget: lazy(() => import('./DatasetLog')),

  // ── Sessions (Tutor, Wellness, Trainer, Consultant) ──
  SessionLog: lazy(() => import('./SessionLog')),
  SessionNoteLog: lazy(() => import('./SessionLog')),
  SessionNoteWidget: lazy(() => import('./SessionLog')),
  SessionPrepLog: lazy(() => import('./SessionLog')),
  SessionPrep: lazy(() => import('./SessionLog')),

  // ── Photographer panels ──
  CullingTracker: lazy(() => import('./CullingTracker')),
  DeliveryTracker: lazy(() => import('./DeliveryTracker')),
  EquipmentLog: lazy(() => import('./EquipmentLog')),
  StorageTracker: lazy(() => import('./StorageTracker')),
  StorageTrackerWidget: lazy(() => import('./StorageTracker')),

  // ── Filmmaker panels ──
  ProductionPhaseTracker: lazy(() => import('./ProductionPhaseTracker')),
  ProductionPhaseWidget: lazy(() => import('./ProductionPhaseTracker')),
  ShotList: lazy(() => import('./ShotList')),
  ShotListWidget: lazy(() => import('./ShotList')),
  CrewEquipmentLog: lazy(() => import('./EquipmentLog')),
  CutTracker: lazy(() => import('./CutTracker')),
  DeliverableSpecs: lazy(() => import('./DeliverableSpecs')),

  // ── Animator panels ──
  PhaseTracker: lazy(() => import('./PhaseTracker')),
  ProjectPhasesWidget: lazy(() => import('./PhaseTracker')),
  DeliverableLog: lazy(() => import('./DeliverableLog')),
  UnbilledByProjectWidget: lazy(() => import('./PhaseTracker')),

  // ── 3D Artist panels ──
  AssetComplexityLog: lazy(() => import('./AssetComplexityLog')),
  AssetComplexityWidget: lazy(() => import('./AssetComplexityLog')),
  SoftwareSubscriptionTracker: lazy(() => import('./SoftwareSubscriptionTracker')),
  DeliverableFormatLog: lazy(() => import('./DeliverableFormatLog')),

  // ── Designer panels ──
  BrandVault: lazy(() => import('./BrandVault')),
  BrandVaultWidget: lazy(() => import('./BrandVault')),
  MoodBoard: lazy(() => import('./MoodBoard')),
  FeedbackLog: lazy(() => import('./FeedbackLog')),

  // ── Illustrator panels ──
  CommissionQueue: lazy(() => import('./CommissionQueue')),
  CommissionQueueWidget: lazy(() => import('./CommissionQueue')),
  StyleTagSystem: lazy(() => import('./StyleTagSystem')),
  LicensingTracker: lazy(() => import('./LicensingTracker')),
  ReferenceBoard: lazy(() => import('./ReferenceBoard')),
  ReferenceBoardWidget: lazy(() => import('./ReferenceBoard')),
  CommissionTOS: lazy(() => import('./CommissionTOS')),

  // ── UX Designer panels ──
  ResearchLog: lazy(() => import('./ResearchLog')),
  PrototypeTracker: lazy(() => import('./PrototypeTracker')),
  PrototypeTrackerWidget: lazy(() => import('./PrototypeTracker')),
  UsabilityTestLog: lazy(() => import('./UsabilityTestLog')),
  HandoffChecklist: lazy(() => import('./HandoffChecklist')),
  HandoffChecklistWidget: lazy(() => import('./HandoffChecklist')),
  ComponentCount: lazy(() => import('./ComponentCount')),

  // ── Developer panels ──
  SprintBoard: lazy(() => import('./SprintBoard')),
  SprintBoardWidget: lazy(() => import('./SprintBoard')),
  StackLogger: lazy(() => import('./StackLogger')),
  BugLog: lazy(() => import('./BugLog')),
  RateCalculator: lazy(() => import('./RateCalculator')),

  // ── Game Developer panels ──
  FeatureScopeBoard: lazy(() => import('./FeatureScopeBoard')),
  FeatureScopeWidget: lazy(() => import('./FeatureScopeBoard')),
  PlatformLog: lazy(() => import('./PlatformLog')),
  QALog: lazy(() => import('./QALog')),

  // ── DevOps panels ──
  IncidentLog: lazy(() => import('./IncidentLog')),
  AutomationTracker: lazy(() => import('./AutomationTracker')),
  InfraDashboard: lazy(() => import('./InfraDashboard')),
  SLATracker: lazy(() => import('./SLATracker')),

  // ── SEO panels ──
  DeliverableTracker: lazy(() => import('./DeliverableTracker')),
  DeliverableTrackerWidget: lazy(() => import('./DeliverableTracker')),
  ReportLog: lazy(() => import('./ReportLog')),
  RetainerHealthScore: lazy(() => import('./RetainerHealthScore')),
  RetainerHealthWidget: lazy(() => import('./RetainerHealthScore')),

  // ── Marketing panels ──
  CampaignTracker: lazy(() => import('./CampaignTracker')),
  ReportCadenceTracker: lazy(() => import('./ReportCadence')),
  ChannelLog: lazy(() => import('./ChannelLog')),
  ROICalculator: lazy(() => import('./ROICalculator')),

  // ── Data Analyst panels ──
  AnalysisPhaseTracker: lazy(() => import('./AnalysisPhaseTracker')),
  AnalysisPhaseWidget: lazy(() => import('./AnalysisPhaseTracker')),
  ToolComputeLog: lazy(() => import('./ToolComputeLog')),
  ComplexityTagger: lazy(() => import('./ComplexityTagger')),

  // ── AI Engineer panels ──
  ExperimentTracker: lazy(() => import('./ExperimentTracker')),
  ExperimentTrackerWidget: lazy(() => import('./ExperimentTracker')),
  ModelRegistry: lazy(() => import('./ModelRegistry')),
  ModelRegistryWidget: lazy(() => import('./ModelRegistry')),
  ComputeCostLog: lazy(() => import('./ComputeCostLog')),
  DatasetVersioning: lazy(() => import('./DatasetVersioning')),

  // ── Tutor panels ──
  StudentRoster: lazy(() => import('./StudentRoster')),
  StudentRosterWidget: lazy(() => import('./StudentRoster')),
  CurriculumTracker: lazy(() => import('./CurriculumTracker')),
  CurriculumProgressWidget: lazy(() => import('./CurriculumTracker')),
  ProgressReports: lazy(() => import('./ProgressReports')),

  // ── Wellness panels ──
  CancellationMonitor: lazy(() => import('./CancellationMonitor')),
  IntakeFormStorage: lazy(() => import('./IntakeFormStorage')),
  ProgressTracker: lazy(() => import('./ProgressTracker')),
  ProgressTrackerWidget: lazy(() => import('./ProgressTracker')),

  // ── Trainer panels ──
  ProgramBuilder: lazy(() => import('./ProgramBuilder')),
  AssessmentLog: lazy(() => import('./AssessmentLog')),
  ClientProgressWidget: lazy(() => import('./ClientProgressWidget')),
  ProgramTrackerWidget: lazy(() => import('./ProgramTrackerWidget')),

  // ── Consultant panels ──
  RetainerManager: lazy(() => import('./RetainerManager')),
  ActionItemTracker: lazy(() => import('./ActionItemTracker')),
  OutcomeNotes: lazy(() => import('./OutcomeNotes')),

  // ── Writer panels ──
  WordTracker: lazy(() => import('./WordTracker')),
  WordTrackerWidget: lazy(() => import('./WordTracker')),
  DeadlineBoard: lazy(() => import('./DeadlineBoard')),
  DeadlineBoardWidget: lazy(() => import('./DeadlineBoard')),
  PublicationLog: lazy(() => import('./PublicationLog')),
  StyleGuide: lazy(() => import('./StyleGuide')),
  RateBenchmarking: lazy(() => import('./RateBenchmarking')),

  // ── Musician panels ──
  StemTracker: lazy(() => import('./StemTracker')),
  SyncLicenseLog: lazy(() => import('./SyncLicenseLog')),
  CreditLog: lazy(() => import('./CreditLog')),
  StudioCostTracker: lazy(() => import('./StudioCostTracker')),

  // ── Architect panels ──
  PhaseGateTracker: lazy(() => import('./PhaseGateTracker')),
  ConsultantLog: lazy(() => import('./ConsultantLog')),
  SubmissionTracker: lazy(() => import('./SubmissionTracker')),
  RevisionSetLog: lazy(() => import('./RevisionSetLog')),
  SiteVisitLog: lazy(() => import('./SiteVisitLog')),

  // ── Virtual Assistant panels ──
  TaskLog: lazy(() => import('./TaskLog')),
  ClientLoadMonitor: lazy(() => import('./ClientLoadMonitor')),
  SOPStore: lazy(() => import('./SOPStore')),

  // ── Translator panels ──
  WordCharacterCounter: lazy(() => import('./WordCharacterCounter')),
  LanguagePairTracker: lazy(() => import('./LanguagePairTracker')),
  QualityLevelLog: lazy(() => import('./QualityLevelLog')),
  Glossary: lazy(() => import('./Glossary')),

  // ── Data Analyst extras ──
  AnalysisDeliverableLog: lazy(() => import('./AnalysisDeliverableLog')),
  DeliverableLogAnalyst: lazy(() => import('./AnalysisDeliverableLog')),

  // ── Build deliveries (Game Dev) ──
  BuildDeliveryLog: lazy(() => import('./BuildDeliveryLog')),

  // ── Calendar / Social ──
  ContentCalendar: lazy(() => import('./ContentCalendar')),
  PlatformTracker: lazy(() => import('./PlatformTracker')),
};

export function getFeatureComponent(name: string): ComponentType<any> | null {
  return FeatureComponents[name] || null;
}

export function hasFeatureComponent(name: string): boolean {
  return name in FeatureComponents;
}
