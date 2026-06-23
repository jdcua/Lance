/**
 * Feature Component Registry
 * Maps 74 archetype feature component string names to React components.
 * Used by ArchetypeFeatureTabs and Dashboard to resolve feature injections at runtime.
 */
import { lazy, type ComponentType } from 'react';

const Placeholder = lazy(() => import('./PlaceholderFeaturePanel'));

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
  RevisionCounter: lazy(() => import('./RevisionTracker')),

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
  CullingTracker: Placeholder,
  DeliveryTracker: Placeholder,
  EquipmentLog: Placeholder,
  StorageTracker: Placeholder,
  StorageTrackerWidget: Placeholder,

  // ── Filmmaker panels ──
  ProductionPhaseTracker: Placeholder,
  ProductionPhaseWidget: Placeholder,
  ShotList: Placeholder,
  ShotListWidget: Placeholder,
  CrewEquipmentLog: Placeholder,
  CutTracker: Placeholder,
  DeliverableSpecs: Placeholder,

  // ── Animator panels ──
  PhaseTracker: Placeholder,
  ProjectPhasesWidget: Placeholder,
  DeliverableLog: Placeholder,
  UnbilledByProjectWidget: Placeholder,

  // ── 3D Artist panels ──
  AssetComplexityLog: Placeholder,
  AssetComplexityWidget: Placeholder,
  SoftwareSubscriptionTracker: Placeholder,
  DeliverableFormatLog: Placeholder,

  // ── Designer panels ──
  BrandVault: Placeholder,
  BrandVaultWidget: Placeholder,
  MoodBoard: Placeholder,
  FeedbackLog: Placeholder,

  // ── Illustrator panels ──
  CommissionQueue: Placeholder,
  StyleTagSystem: Placeholder,
  LicensingTracker: Placeholder,
  ReferenceBoard: Placeholder,
  CommissionTOS: Placeholder,

  // ── UX Designer panels ──
  ResearchLog: Placeholder,
  PrototypeTracker: Placeholder,
  PrototypeTrackerWidget: Placeholder,
  UsabilityTestLog: Placeholder,
  HandoffChecklist: Placeholder,
  HandoffChecklistWidget: Placeholder,
  ComponentCount: Placeholder,

  // ── Developer panels ──
  SprintBoard: Placeholder,
  StackLogger: Placeholder,
  BugLog: Placeholder,
  RateCalculator: Placeholder,

  // ── Game Developer panels ──
  FeatureScopeBoard: Placeholder,
  FeatureScopeWidget: Placeholder,
  PlatformLog: Placeholder,
  QALog: Placeholder,

  // ── DevOps panels ──
  IncidentLog: Placeholder,
  AutomationTracker: Placeholder,
  InfraDashboard: Placeholder,
  SLATracker: Placeholder,

  // ── SEO panels ──
  DeliverableTracker: Placeholder,
  DeliverableTrackerWidget: Placeholder,
  ReportLog: Placeholder,
  RetainerHealthScore: Placeholder,
  RetainerHealthWidget: Placeholder,

  // ── Marketing panels ──
  CampaignTracker: Placeholder,
  ReportCadenceTracker: Placeholder,
  ChannelLog: Placeholder,
  ROICalculator: Placeholder,

  // ── Data Analyst panels ──
  AnalysisPhaseTracker: Placeholder,
  AnalysisPhaseWidget: Placeholder,
  ToolComputeLog: Placeholder,
  ComplexityTagger: Placeholder,

  // ── AI Engineer panels ──
  ExperimentTracker: Placeholder,
  ExperimentTrackerWidget: Placeholder,
  ModelRegistry: Placeholder,
  ModelRegistryWidget: Placeholder,
  ComputeCostLog: Placeholder,
  DatasetVersioning: Placeholder,

  // ── Tutor panels ──
  StudentRoster: Placeholder,
  StudentRosterWidget: Placeholder,
  CurriculumTracker: Placeholder,
  CurriculumProgressWidget: Placeholder,
  ProgressReports: Placeholder,

  // ── Wellness panels ──
  CancellationMonitor: Placeholder,
  IntakeFormStorage: Placeholder,
  ProgressTracker: Placeholder,
  ProgressTrackerWidget: Placeholder,

  // ── Trainer panels ──
  ProgramBuilder: Placeholder,
  AssessmentLog: Placeholder,
  ClientProgressWidget: Placeholder,
  ProgramTrackerWidget: Placeholder,

  // ── Consultant panels ──
  RetainerManager: Placeholder,
  ActionItemTracker: Placeholder,
  OutcomeNotes: Placeholder,
};

export function getFeatureComponent(name: string): ComponentType<any> | null {
  return FeatureComponents[name] || null;
}

export function hasFeatureComponent(name: string): boolean {
  return name in FeatureComponents;
}
