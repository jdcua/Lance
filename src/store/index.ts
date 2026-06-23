import { create } from 'zustand';
import type {
  Client,
  Project,
  Milestone,
  Proposal,
  Contract,
  TimeEntry,
  Invoice,
  InvoicePayment,
  LineItem,
  Expense,
  UserProfile,
  Communication,
  RecurringInvoice,
  ImportLog,
  Attachment,
  AssetStats,
  MetricDefinition,
  MetricValue,
  MetricTemplate,
  HeadlineMetric,
  FollowUpLog,
  FollowUpSettings,
  ExportTemplate,
  ContractTemplate,
  ArchetypeRenderLog,
  ArchetypeSession,
  ArchetypeShoot,
  ArchetypeRevision,
  ArchetypeBuild,
  ArchetypeKeyword,
  ArchetypeDataset,
  ProjectPhase,
  TimeEntryPhase,
  Deliverable,
  SprintTask,
  ProjectStack,
  Bug,
  MoodBoardItem,
  ClientFeedback,
  CullingSession,
  ProjectDelivery,
  EquipmentUsage,
  StorageLog,
  TimeEntryWords,
  Publication,
  ClientStyleGuide,
  Retainer,
  ActionItem,
  Outcome,
  Shot,
  Cut,
  DeliverableSpec,
  Commission,
  ProjectStyleTag,
  AssetLicense,
  ProjectComplexity,
  FormatDeliverable,
  GameFeature,
  ProjectPlatform,
  QASession,
  BuildDelivery,
  ResearchActivity,
  Prototype,
  UsabilityTest,
  HandoffItem,
  ComponentCountEntry,
  Campaign,
  ClientReportCadence,
  ProjectChannel,
  ContentPost,
  ClientPlatform,
  Stem,
  SyncLicense,
  Credit,
  ArchPhase,
  ArchConsultant,
  Submission,
  RevisionSet,
  SiteVisit,
  VATask,
  SOP,
  TranslationCount,
  ProjectLanguagePair,
  ProjectQuality,
  GlossaryTerm,
  SEODeliverable,
  ClientReport,
  AnalysisDeliverable,
  AnalysisComplexity,
  Incident,
  Automation,
  InfrastructureItem,
  SLA,
  Experiment,
  AIModel,
  ComputeCost,
  DatasetVersion,
  Student,
  CurriculumItem,
  ProgressReport,
  Cancellation,
  IntakeForm,
  ProgressNote,
  Program,
  Assessment,
  ClientProgress,
  CommissionTOS,
  ProjectTemplate,
  ProjectTemplateMilestone,
} from '../types';
import { validateLicenseKey } from '../license';

interface ClientSlice {
  clients: Client[];
  loadClients: () => Promise<void>;
  addClient: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>;
  updateClient: (data: Client) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  refreshClient: (id: string) => Promise<Client | null>;
}

interface ProjectSlice {
  projects: Project[];
  loadProjects: () => Promise<void>;
  addProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<Project>;
  updateProject: (data: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  refreshProject: (id: string) => Promise<Project | null>;
}

interface MilestoneSlice {
  milestones: Record<string, Milestone[]>;
  loadMilestones: (projectId: string) => Promise<void>;
  addMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>;
  updateMilestone: (data: Milestone) => Promise<void>;
  removeMilestone: (id: string) => Promise<void>;
}

interface ProposalSlice {
  proposals: Proposal[];
  loadProposals: () => Promise<void>;
  addProposal: (data: Omit<Proposal, 'id' | 'created_at'>) => Promise<Proposal>;
  updateProposal: (data: Proposal) => Promise<void>;
  removeProposal: (id: string) => Promise<void>;
  refreshProposal: (id: string) => Promise<Proposal | null>;
}

interface ContractSlice {
  contracts: Contract[];
  loadContracts: () => Promise<void>;
  addContract: (data: Omit<Contract, 'id' | 'created_at' | 'signed_at'>) => Promise<Contract>;
  updateContract: (data: Contract) => Promise<void>;
  removeContract: (id: string) => Promise<void>;
  refreshContract: (id: string) => Promise<Contract | null>;
}

interface TimeSlice {
  timeEntries: TimeEntry[];
  loadTimeEntries: () => Promise<void>;
  addTimeEntry: (data: Omit<TimeEntry, 'id' | 'invoiced'>) => Promise<TimeEntry>;
  updateTimeEntry: (data: TimeEntry) => Promise<void>;
  removeTimeEntry: (id: string) => Promise<void>;
  refreshTimeEntry: (id: string) => Promise<TimeEntry | null>;
}

interface InvoiceSlice {
  invoices: Invoice[];
  loadInvoices: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, 'id' | 'created_at' | 'paid_at' | 'line_items'> & { line_items: LineItem[] }) => Promise<Invoice>;
  updateInvoice: (data: Invoice) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
  refreshInvoice: (id: string) => Promise<Invoice | null>;
}

interface InvoicePaymentSlice {
  payments: Record<string, InvoicePayment[]>;
  loadPayments: (invoiceId: string) => Promise<void>;
  loadAllPayments: () => Promise<void>;
  addPayment: (data: { invoice_id: string; amount: number; payment_date: string; payment_method: string; reference?: string; notes?: string }) => Promise<InvoicePayment>;
  removePayment: (id: string, invoiceId: string) => Promise<void>;
}

interface ExpenseSlice {
  expenses: Expense[];
  loadExpenses: () => Promise<void>;
  addExpense: (data: Omit<Expense, 'id'>) => Promise<Expense>;
  updateExpense: (data: Expense) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

interface ProfileSlice {
  profile: UserProfile | null;
  profileLoaded: boolean;
  isLicensed: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (data: UserProfile) => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  removeLicense: () => Promise<void>;
}

interface CommunicationSlice {
  communications: Record<string, Communication[]>;
  loadCommunications: (clientId: string) => Promise<void>;
  addCommunication: (data: Communication) => Promise<Communication>;
  updateCommunication: (id: string, clientId: string, summary: string) => Promise<void>;
  removeCommunication: (id: string, clientId: string) => Promise<void>;
}

interface RecurringInvoiceSlice {
  recurringInvoices: RecurringInvoice[];
  loadRecurringInvoices: () => Promise<void>;
  addRecurringInvoice: (data: Omit<RecurringInvoice, 'id' | 'created_at' | 'last_generated'>) => Promise<RecurringInvoice>;
  updateRecurringInvoice: (data: RecurringInvoice) => Promise<void>;
  removeRecurringInvoice: (id: string) => Promise<void>;
}

interface ImportSlice {
  importHistory: ImportLog[];
  loadImportHistory: () => Promise<void>;
  saveImportFile: (file: File) => Promise<string>;
  logImport: (data: Omit<ImportLog, 'id' | 'imported_at'>) => Promise<ImportLog>;
  getImportsDir: () => Promise<string>;
}

interface AttachmentSlice {
  attachments: Record<string, Attachment[]>;
  allAttachments: Attachment[];
  assetStats: AssetStats | null;
  loadAttachments: (entityType: string, entityId: string) => Promise<void>;
  loadAllAttachments: () => Promise<void>;
  addAttachment: (data: Omit<Attachment, 'id' | 'created_at'>) => Promise<Attachment>;
  removeAttachment: (id: string, entityType: string, entityId: string) => Promise<void>;
  saveAssetFile: (file: File) => Promise<string>;
  getAssetsDir: () => Promise<string>;
  renameAttachment: (id: string, newFilename: string) => Promise<Attachment>;
  moveAttachment: (id: string, entityType: string, entityId: string, oldEntityType: string, oldEntityId: string) => Promise<Attachment>;
  updateAttachmentMeta: (id: string, data: { tags?: string; notes?: string }) => Promise<Attachment>;
  loadAssetStats: () => Promise<void>;
  searchAssets: (query: string) => Promise<Attachment[]>;
}

interface MetricSlice {
  metricDefs: Record<string, MetricDefinition[]>;
  metricValues: Record<string, MetricValue[]>;
  headlineMetrics: HeadlineMetric[];
  metricTemplates: MetricTemplate[];
  loadMetricDefs: (clientId: string) => Promise<void>;
  addMetricDef: (data: Omit<MetricDefinition, 'id' | 'created_at'>) => Promise<MetricDefinition>;
  updateMetricDef: (data: Omit<MetricDefinition, 'client_id' | 'created_at'>) => Promise<void>;
  removeMetricDef: (id: string, clientId: string) => Promise<void>;
  loadMetricValues: (definitionId: string, limit?: number) => Promise<void>;
  logMetricValue: (data: Omit<MetricValue, 'id' | 'created_at'>) => Promise<MetricValue>;
  removeMetricValue: (id: string, definitionId: string) => Promise<void>;
  loadHeadlineMetrics: () => Promise<void>;
  loadMetricTemplates: () => Promise<void>;
  saveMetricTemplate: (name: string, definitions: Omit<MetricDefinition, 'id' | 'client_id' | 'created_at'>[]) => Promise<void>;
  removeMetricTemplate: (id: string) => Promise<void>;
  applyMetricTemplate: (templateName: string, clientId: string) => Promise<void>;
}

interface FollowUpSlice {
  followUpLogs: Record<string, FollowUpLog[]>;
  pendingFollowUps: FollowUpLog[];
  followUpSettings: FollowUpSettings;
  loadFollowUpSettings: () => void;
  saveFollowUpSettings: (settings: Partial<FollowUpSettings>) => void;
  loadFollowUpLog: (entityType: string, entityId: string) => Promise<void>;
  logFollowUp: (data: { entity_type: string; entity_id: string; stage: number }) => Promise<FollowUpLog>;
  updateFollowUpStatus: (id: string, status: string, action?: string) => Promise<void>;
  loadPendingFollowUps: () => Promise<void>;
}

interface ExportTemplateSlice {
  exportTemplates: ExportTemplate[];
  loadExportTemplates: () => Promise<void>;
  addExportTemplate: (data: Omit<ExportTemplate, 'id' | 'created_at'>) => Promise<ExportTemplate>;
  updateExportTemplate: (data: ExportTemplate) => Promise<void>;
  removeExportTemplate: (id: string) => Promise<void>;
}

interface ContractTemplateSlice {
  contractTemplates: ContractTemplate[];
  loadContractTemplates: () => Promise<void>;
  addContractTemplate: (data: Omit<ContractTemplate, 'id' | 'created_at'>) => Promise<ContractTemplate>;
  updateContractTemplate: (data: ContractTemplate) => Promise<void>;
  removeContractTemplate: (id: string) => Promise<void>;
}

interface ProjectTemplateSlice {
  projectTemplates: ProjectTemplate[];
  projectTemplateMilestones: Record<string, ProjectTemplateMilestone[]>;
  loadProjectTemplates: () => Promise<void>;
  loadTemplateMilestones: (templateId: string) => Promise<void>;
  addProjectTemplate: (data: { name: string; description?: string; default_budget?: number; default_status?: string }, milestones: { title: string; days_from_start: number; invoice_on_completion: boolean }[]) => Promise<ProjectTemplate>;
  updateProjectTemplate: (id: string, data: { name?: string; description?: string; default_budget?: number; default_status?: string }) => Promise<void>;
  removeProjectTemplate: (id: string) => Promise<void>;
}

interface ArchetypeRenderLogSlice {
  renderLogs: Record<string, ArchetypeRenderLog[]>;
  loadRenderLogs: (projectId: string) => Promise<void>;
  addRenderLog: (data: Omit<ArchetypeRenderLog, 'id' | 'created_at'>) => Promise<ArchetypeRenderLog>;
  removeRenderLog: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeSessionSlice {
  sessions: ArchetypeSession[];
  loadSessions: (clientId?: string, projectId?: string) => Promise<void>;
  addSession: (data: Omit<ArchetypeSession, 'id' | 'created_at'>) => Promise<ArchetypeSession>;
  removeSession: (id: string) => Promise<void>;
}

interface ArchetypeShootSlice {
  shoots: Record<string, ArchetypeShoot[]>;
  loadShoots: (projectId: string) => Promise<void>;
  addShoot: (data: Omit<ArchetypeShoot, 'id' | 'created_at'>) => Promise<ArchetypeShoot>;
  removeShoot: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeRevisionSlice {
  revisions: Record<string, ArchetypeRevision[]>;
  loadRevisions: (projectId: string) => Promise<void>;
  addRevision: (data: Omit<ArchetypeRevision, 'id' | 'created_at'>) => Promise<ArchetypeRevision>;
  removeRevision: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeBuildSlice {
  builds: Record<string, ArchetypeBuild[]>;
  loadBuilds: (projectId: string) => Promise<void>;
  addBuild: (data: Omit<ArchetypeBuild, 'id' | 'created_at'>) => Promise<ArchetypeBuild>;
  removeBuild: (id: string, projectId: string) => Promise<void>;
}

interface ArchetypeKeywordSlice {
  keywords: Record<string, ArchetypeKeyword[]>;
  loadKeywords: (clientId: string) => Promise<void>;
  addKeyword: (data: Omit<ArchetypeKeyword, 'id' | 'created_at'>) => Promise<ArchetypeKeyword>;
  updateKeyword: (id: string, clientId: string, positionCurrent?: number, targetPosition?: number) => Promise<void>;
  removeKeyword: (id: string, clientId: string) => Promise<void>;
}

interface ArchetypeDatasetSlice {
  datasets: Record<string, ArchetypeDataset[]>;
  loadDatasets: (projectId: string) => Promise<void>;
  addDataset: (data: Omit<ArchetypeDataset, 'id' | 'created_at'>) => Promise<ArchetypeDataset>;
  removeDataset: (id: string, projectId: string) => Promise<void>;
}

// ── Phase tracker ──
interface PhaseTrackerSlice {
  projectPhases: Record<string, ProjectPhase[]>;
  loadProjectPhases: (projectId: string) => Promise<void>;
  addProjectPhase: (data: Omit<ProjectPhase, 'id'>) => Promise<ProjectPhase>;
  updateProjectPhase: (id: string, projectId: string, data: Partial<Pick<ProjectPhase, 'phase_name' | 'status' | 'color'>>) => Promise<void>;
  removeProjectPhase: (id: string, projectId: string) => Promise<void>;
}
interface DeliverableSlice {
  deliverables: Record<string, Deliverable[]>;
  loadDeliverables: (projectId: string) => Promise<void>;
  addDeliverable: (data: Omit<Deliverable, 'id'>) => Promise<Deliverable>;
  updateDeliverable: (id: string, projectId: string, data: Partial<Pick<Deliverable, 'client_approved'>>) => Promise<void>;
  removeDeliverable: (id: string, projectId: string) => Promise<void>;
}
interface SprintSlice {
  sprintTasks: Record<string, SprintTask[]>;
  loadSprintTasks: (projectId: string) => Promise<void>;
  addSprintTask: (data: Omit<SprintTask, 'id'>) => Promise<SprintTask>;
  updateSprintTask: (id: string, projectId: string, data: Partial<Pick<SprintTask, 'title' | 'status' | 'priority' | 'hours_estimated' | 'hours_actual' | 'sort_order'>>) => Promise<void>;
  removeSprintTask: (id: string, projectId: string) => Promise<void>;
}
interface ProjectStackSlice {
  projectStacks: Record<string, ProjectStack[]>;
  loadProjectStacks: (projectId: string) => Promise<void>;
  addProjectStack: (data: Omit<ProjectStack, 'id'>) => Promise<ProjectStack>;
  removeProjectStack: (id: string, projectId: string) => Promise<void>;
}
interface BugSlice {
  bugs: Record<string, Bug[]>;
  loadBugs: (projectId: string) => Promise<void>;
  addBug: (data: Omit<Bug, 'id'>) => Promise<Bug>;
  updateBug: (id: string, projectId: string, data: Partial<Pick<Bug, 'status' | 'priority' | 'hours_spent' | 'resolved_at'>>) => Promise<void>;
  removeBug: (id: string, projectId: string) => Promise<void>;
}
interface MoodBoardSlice {
  moodBoardItems: Record<string, MoodBoardItem[]>;
  loadMoodBoardItems: (projectId: string) => Promise<void>;
  addMoodBoardItem: (data: Omit<MoodBoardItem, 'id'>) => Promise<MoodBoardItem>;
  updateMoodBoardItem: (id: string, projectId: string, data: Partial<Pick<MoodBoardItem, 'notes' | 'sort_order'>>) => Promise<void>;
  removeMoodBoardItem: (id: string, projectId: string) => Promise<void>;
}
interface ClientFeedbackSlice {
  clientFeedbacks: Record<string, ClientFeedback[]>;
  loadClientFeedbacks: (clientId: string) => Promise<void>;
  addClientFeedback: (data: Omit<ClientFeedback, 'id'>) => Promise<ClientFeedback>;
  updateClientFeedback: (id: string, clientId: string, data: Partial<Pick<ClientFeedback, 'summary' | 'actioned'>>) => Promise<void>;
  removeClientFeedback: (id: string, clientId: string) => Promise<void>;
}
interface CullingSessionSlice {
  cullingSessions: Record<string, CullingSession[]>;
  loadCullingSessions: (projectId: string) => Promise<void>;
  addCullingSession: (data: Omit<CullingSession, 'id'>) => Promise<CullingSession>;
  removeCullingSession: (id: string, projectId: string) => Promise<void>;
}
interface ProjectDeliverySlice {
  projectDeliveries: Record<string, ProjectDelivery[]>;
  loadProjectDeliveries: (projectId: string) => Promise<void>;
  addProjectDelivery: (data: Omit<ProjectDelivery, 'id'>) => Promise<ProjectDelivery>;
  updateProjectDelivery: (id: string, projectId: string, data: Partial<Pick<ProjectDelivery, 'selects_count' | 'delivered_count' | 'gallery_link' | 'delivery_date' | 'notes'>>) => Promise<void>;
  removeProjectDelivery: (id: string, projectId: string) => Promise<void>;
}
interface EquipmentSlice {
  equipmentUsage: Record<string, EquipmentUsage[]>;
  loadEquipmentUsage: (projectId: string) => Promise<void>;
  addEquipmentUsage: (data: Omit<EquipmentUsage, 'id'>) => Promise<EquipmentUsage>;
  removeEquipmentUsage: (id: string, projectId: string) => Promise<void>;
}
interface StorageTrackerSlice {
  storageLogs: Record<string, StorageLog[]>;
  loadStorageLogs: (projectId: string) => Promise<void>;
  addStorageLog: (data: Omit<StorageLog, 'id'>) => Promise<StorageLog>;
  removeStorageLog: (id: string, projectId: string) => Promise<void>;
}
interface PublicationSlice {
  publications: Record<string, Publication[]>;
  loadPublications: (projectId: string) => Promise<void>;
  addPublication: (data: Omit<Publication, 'id'>) => Promise<Publication>;
  removePublication: (id: string, projectId: string) => Promise<void>;
}
interface StyleGuideSlice {
  styleGuides: Record<string, ClientStyleGuide[]>;
  loadStyleGuides: (clientId: string) => Promise<void>;
  saveStyleGuide: (data: Omit<ClientStyleGuide, 'id'>) => Promise<ClientStyleGuide>;
}
interface RetainerSlice {
  retainers: Record<string, Retainer[]>;
  loadRetainers: (clientId: string) => Promise<void>;
  addRetainer: (data: Omit<Retainer, 'id'>) => Promise<Retainer>;
  updateRetainer: (id: string, clientId: string, data: Partial<Pick<Retainer, 'monthly_hours' | 'rate' | 'renewal_date' | 'active'>>) => Promise<void>;
  removeRetainer: (id: string, clientId: string) => Promise<void>;
}
interface ActionItemSlice {
  actionItems: Record<string, ActionItem[]>;
  loadActionItems: (clientId: string) => Promise<void>;
  addActionItem: (data: Omit<ActionItem, 'id'>) => Promise<ActionItem>;
  updateActionItem: (id: string, clientId: string, data: Partial<Pick<ActionItem, 'title' | 'owner' | 'due_date' | 'completed'>>) => Promise<void>;
  removeActionItem: (id: string, clientId: string) => Promise<void>;
}
interface OutcomeSlice {
  outcomes: Record<string, Outcome[]>;
  loadOutcomes: (projectId: string) => Promise<void>;
  saveOutcome: (data: Omit<Outcome, 'id'>) => Promise<Outcome>;
}
interface ShotSlice {
  shots: Record<string, Shot[]>;
  loadShots: (projectId: string) => Promise<void>;
  addShot: (data: Omit<Shot, 'id'>) => Promise<Shot>;
  updateShot: (id: string, projectId: string, data: Partial<Pick<Shot, 'scene' | 'description' | 'status' | 'sort_order'>>) => Promise<void>;
  removeShot: (id: string, projectId: string) => Promise<void>;
}
interface CutSlice {
  cuts: Record<string, Cut[]>;
  loadCuts: (projectId: string) => Promise<void>;
  addCut: (data: Omit<Cut, 'id'>) => Promise<Cut>;
  updateCut: (id: string, projectId: string, data: Partial<Pick<Cut, 'client_approved' | 'duration_seconds'>>) => Promise<void>;
  removeCut: (id: string, projectId: string) => Promise<void>;
}
interface DeliverableSpecSlice {
  deliverableSpecs: Record<string, DeliverableSpec[]>;
  loadDeliverableSpecs: (projectId: string) => Promise<void>;
  saveDeliverableSpec: (data: Omit<DeliverableSpec, 'id'>) => Promise<DeliverableSpec>;
}
interface CommissionSlice {
  commissions: Record<string, Commission[]>;
  loadCommissions: (clientId: string) => Promise<void>;
  addCommission: (data: Omit<Commission, 'id'>) => Promise<Commission>;
  updateCommission: (id: string, clientId: string, data: Partial<Pick<Commission, 'title' | 'status' | 'brief' | 'deadline' | 'payment_status' | 'sort_order'>>) => Promise<void>;
  removeCommission: (id: string, clientId: string) => Promise<void>;
}
interface StyleTagSlice {
  styleTags: Record<string, ProjectStyleTag[]>;
  loadStyleTags: (projectId: string) => Promise<void>;
  addStyleTag: (data: Omit<ProjectStyleTag, 'id'>) => Promise<ProjectStyleTag>;
  removeStyleTag: (id: string, projectId: string) => Promise<void>;
}
interface AssetLicenseSlice {
  assetLicenses: Record<string, AssetLicense[]>;
  loadAssetLicenses: (assetId: string) => Promise<void>;
  addAssetLicense: (data: Omit<AssetLicense, 'id'>) => Promise<AssetLicense>;
  removeAssetLicense: (id: string, assetId: string) => Promise<void>;
}
interface ComplexitySlice {
  complexities: Record<string, ProjectComplexity[]>;
  loadComplexities: (projectId: string) => Promise<void>;
  saveComplexity: (data: Omit<ProjectComplexity, 'id'>) => Promise<ProjectComplexity>;
}
interface FormatDeliverableSlice {
  formatDeliverables: Record<string, FormatDeliverable[]>;
  loadFormatDeliverables: (projectId: string) => Promise<void>;
  addFormatDeliverable: (data: Omit<FormatDeliverable, 'id'>) => Promise<FormatDeliverable>;
  updateFormatDeliverable: (id: string, projectId: string, data: Partial<Pick<FormatDeliverable, 'delivered'>>) => Promise<void>;
  removeFormatDeliverable: (id: string, projectId: string) => Promise<void>;
}
interface GameFeatureSlice {
  gameFeatures: Record<string, GameFeature[]>;
  loadGameFeatures: (projectId: string) => Promise<void>;
  addGameFeature: (data: Omit<GameFeature, 'id'>) => Promise<GameFeature>;
  updateGameFeature: (id: string, projectId: string, data: Partial<Pick<GameFeature, 'title' | 'priority' | 'status' | 'hours_estimated' | 'hours_actual' | 'sort_order'>>) => Promise<void>;
  removeGameFeature: (id: string, projectId: string) => Promise<void>;
}
interface ProjectPlatformSlice {
  projectPlatforms: Record<string, ProjectPlatform[]>;
  loadProjectPlatforms: (projectId: string) => Promise<void>;
  addProjectPlatform: (data: Omit<ProjectPlatform, 'id'>) => Promise<ProjectPlatform>;
  removeProjectPlatform: (id: string, projectId: string) => Promise<void>;
}
interface QASessionSlice {
  qaSessions: Record<string, QASession[]>;
  loadQASessions: (projectId: string) => Promise<void>;
  addQASession: (data: Omit<QASession, 'id'>) => Promise<QASession>;
  removeQASession: (id: string, projectId: string) => Promise<void>;
}
interface BuildDeliverySlice {
  buildDeliveries: Record<string, BuildDelivery[]>;
  loadBuildDeliveries: (projectId: string) => Promise<void>;
  addBuildDelivery: (data: Omit<BuildDelivery, 'id'>) => Promise<BuildDelivery>;
  removeBuildDelivery: (id: string, projectId: string) => Promise<void>;
}
interface ResearchActivitySlice {
  researchActivities: Record<string, ResearchActivity[]>;
  loadResearchActivities: (projectId: string) => Promise<void>;
  addResearchActivity: (data: Omit<ResearchActivity, 'id'>) => Promise<ResearchActivity>;
  removeResearchActivity: (id: string, projectId: string) => Promise<void>;
}
interface PrototypeSlice {
  prototypes: Record<string, Prototype[]>;
  loadPrototypes: (projectId: string) => Promise<void>;
  addPrototype: (data: Omit<Prototype, 'id'>) => Promise<Prototype>;
  removePrototype: (id: string, projectId: string) => Promise<void>;
}
interface UsabilityTestSlice {
  usabilityTests: Record<string, UsabilityTest[]>;
  loadUsabilityTests: (projectId: string) => Promise<void>;
  addUsabilityTest: (data: Omit<UsabilityTest, 'id'>) => Promise<UsabilityTest>;
  removeUsabilityTest: (id: string, projectId: string) => Promise<void>;
}
interface HandoffItemSlice {
  handoffItems: Record<string, HandoffItem[]>;
  loadHandoffItems: (projectId: string) => Promise<void>;
  addHandoffItem: (data: Omit<HandoffItem, 'id'>) => Promise<HandoffItem>;
  updateHandoffItem: (id: string, projectId: string, data: Partial<Pick<HandoffItem, 'completed'>>) => Promise<void>;
  removeHandoffItem: (id: string, projectId: string) => Promise<void>;
}
interface ComponentCountSlice {
  componentCounts: Record<string, ComponentCountEntry[]>;
  loadComponentCounts: (projectId: string) => Promise<void>;
  addComponentCount: (data: Omit<ComponentCountEntry, 'id'>) => Promise<ComponentCountEntry>;
  updateComponentCount: (id: string, projectId: string, data: Partial<Pick<ComponentCountEntry, 'component_name' | 'count'>>) => Promise<void>;
  removeComponentCount: (id: string, projectId: string) => Promise<void>;
}
interface CampaignSlice {
  campaigns: Record<string, Campaign[]>;
  loadCampaigns: (projectId: string) => Promise<void>;
  addCampaign: (data: Omit<Campaign, 'id'>) => Promise<Campaign>;
  updateCampaign: (id: string, projectId: string, data: Partial<Pick<Campaign, 'kpi_result'>>) => Promise<void>;
  removeCampaign: (id: string, projectId: string) => Promise<void>;
}
interface ReportCadenceSlice {
  reportCadences: Record<string, ClientReportCadence[]>;
  loadReportCadences: (clientId: string) => Promise<void>;
  saveReportCadence: (data: Omit<ClientReportCadence, 'id'>) => Promise<ClientReportCadence>;
  updateReportCadenceLastSent: (id: string, clientId: string) => Promise<void>;
}
interface ProjectChannelSlice {
  projectChannels: Record<string, ProjectChannel[]>;
  loadProjectChannels: (projectId: string) => Promise<void>;
  addProjectChannel: (data: Omit<ProjectChannel, 'id'>) => Promise<ProjectChannel>;
  removeProjectChannel: (id: string, projectId: string) => Promise<void>;
}
interface ContentPostSlice {
  contentPosts: Record<string, ContentPost[]>;
  loadContentPosts: (clientId: string) => Promise<void>;
  addContentPost: (data: Omit<ContentPost, 'id'>) => Promise<ContentPost>;
  updateContentPost: (id: string, clientId: string, data: Partial<Pick<ContentPost, 'status' | 'notes'>>) => Promise<void>;
  removeContentPost: (id: string, clientId: string) => Promise<void>;
}
interface ClientPlatformSlice {
  clientPlatforms: Record<string, ClientPlatform[]>;
  loadClientPlatforms: (clientId: string) => Promise<void>;
  addClientPlatform: (data: Omit<ClientPlatform, 'id'>) => Promise<ClientPlatform>;
  updateClientPlatform: (id: string, clientId: string, data: Partial<Pick<ClientPlatform, 'handle' | 'active'>>) => Promise<void>;
  removeClientPlatform: (id: string, clientId: string) => Promise<void>;
}
interface StemSlice {
  stems: Record<string, Stem[]>;
  loadStems: (projectId: string) => Promise<void>;
  addStem: (data: Omit<Stem, 'id'>) => Promise<Stem>;
  updateStem: (id: string, projectId: string, data: Partial<Pick<Stem, 'delivered'>>) => Promise<void>;
  removeStem: (id: string, projectId: string) => Promise<void>;
}
interface SyncLicenseSlice {
  syncLicenses: SyncLicense[];
  loadSyncLicenses: () => Promise<void>;
  addSyncLicense: (data: Omit<SyncLicense, 'id'>) => Promise<SyncLicense>;
  removeSyncLicense: (id: string) => Promise<void>;
}
interface CreditSlice {
  credits: Record<string, Credit[]>;
  loadCredits: (projectId: string) => Promise<void>;
  addCredit: (data: Omit<Credit, 'id'>) => Promise<Credit>;
  removeCredit: (id: string, projectId: string) => Promise<void>;
}
interface ArchPhaseSlice {
  archPhases: Record<string, ArchPhase[]>;
  loadArchPhases: (projectId: string) => Promise<void>;
  addArchPhase: (data: Omit<ArchPhase, 'id'>) => Promise<ArchPhase>;
  updateArchPhase: (id: string, projectId: string, data: Partial<Pick<ArchPhase, 'phase_name' | 'completion_percent' | 'invoice_trigger' | 'completed'>>) => Promise<void>;
  removeArchPhase: (id: string, projectId: string) => Promise<void>;
}
interface ArchConsultantSlice {
  archConsultants: Record<string, ArchConsultant[]>;
  loadArchConsultants: (projectId: string) => Promise<void>;
  addArchConsultant: (data: Omit<ArchConsultant, 'id'>) => Promise<ArchConsultant>;
  removeArchConsultant: (id: string, projectId: string) => Promise<void>;
}
interface SubmissionSlice {
  submissions: Record<string, Submission[]>;
  loadSubmissions: (projectId: string) => Promise<void>;
  addSubmission: (data: Omit<Submission, 'id'>) => Promise<Submission>;
  updateSubmission: (id: string, projectId: string, data: Partial<Pick<Submission, 'status' | 'response_date'>>) => Promise<void>;
  removeSubmission: (id: string, projectId: string) => Promise<void>;
}
interface RevisionSetSlice {
  revisionSets: Record<string, RevisionSet[]>;
  loadRevisionSets: (projectId: string) => Promise<void>;
  addRevisionSet: (data: Omit<RevisionSet, 'id'>) => Promise<RevisionSet>;
  removeRevisionSet: (id: string, projectId: string) => Promise<void>;
}
interface SiteVisitSlice {
  siteVisits: Record<string, SiteVisit[]>;
  loadSiteVisits: (projectId: string) => Promise<void>;
  addSiteVisit: (data: Omit<SiteVisit, 'id'>) => Promise<SiteVisit>;
  removeSiteVisit: (id: string, projectId: string) => Promise<void>;
}
interface VATaskSlice {
  vaTasks: Record<string, VATask[]>;
  loadVATasks: (clientId: string) => Promise<void>;
  addVATask: (data: Omit<VATask, 'id'>) => Promise<VATask>;
  removeVATask: (id: string, clientId: string) => Promise<void>;
}
interface SOPSlice {
  sops: Record<string, SOP[]>;
  loadSOPs: (clientId: string) => Promise<void>;
  addSOP: (data: Omit<SOP, 'id'>) => Promise<SOP>;
  updateSOP: (id: string, clientId: string, data: Partial<Pick<SOP, 'title' | 'content' | 'sort_order'>>) => Promise<void>;
  removeSOP: (id: string, clientId: string) => Promise<void>;
}
interface TranslationCountSlice {
  translationCounts: Record<string, TranslationCount[]>;
  loadTranslationCounts: (timeEntryId: string) => Promise<void>;
  saveTranslationCount: (data: Omit<TranslationCount, 'id'>) => Promise<TranslationCount>;
}
interface LanguagePairSlice {
  languagePairs: Record<string, ProjectLanguagePair[]>;
  loadLanguagePairs: (projectId: string) => Promise<void>;
  addLanguagePair: (data: Omit<ProjectLanguagePair, 'id'>) => Promise<ProjectLanguagePair>;
  removeLanguagePair: (id: string, projectId: string) => Promise<void>;
}
interface ProjectQualitySlice {
  projectQualities: Record<string, ProjectQuality[]>;
  loadProjectQualities: (projectId: string) => Promise<void>;
  saveProjectQuality: (data: Omit<ProjectQuality, 'id'>) => Promise<ProjectQuality>;
}
interface GlossarySlice {
  glossaryTerms: Record<string, GlossaryTerm[]>;
  loadGlossaryTerms: (clientId: string) => Promise<void>;
  addGlossaryTerm: (data: Omit<GlossaryTerm, 'id'>) => Promise<GlossaryTerm>;
  updateGlossaryTerm: (id: string, clientId: string, data: Partial<Pick<GlossaryTerm, 'term' | 'approved_translation' | 'notes'>>) => Promise<void>;
  removeGlossaryTerm: (id: string, clientId: string) => Promise<void>;
}
interface SEODeliverableSlice {
  seoDeliverables: Record<string, SEODeliverable[]>;
  loadSEODeliverables: (clientId: string) => Promise<void>;
  addSEODeliverable: (data: Omit<SEODeliverable, 'id'>) => Promise<SEODeliverable>;
  updateSEODeliverable: (id: string, clientId: string, data: Partial<Pick<SEODeliverable, 'completed'>>) => Promise<void>;
  removeSEODeliverable: (id: string, clientId: string) => Promise<void>;
}
interface ClientReportSlice {
  clientReports: Record<string, ClientReport[]>;
  loadClientReports: (clientId: string) => Promise<void>;
  addClientReport: (data: Omit<ClientReport, 'id'>) => Promise<ClientReport>;
  removeClientReport: (id: string, clientId: string) => Promise<void>;
}
interface AnalysisDeliverableSlice {
  analysisDeliverables: Record<string, AnalysisDeliverable[]>;
  loadAnalysisDeliverables: (projectId: string) => Promise<void>;
  addAnalysisDeliverable: (data: Omit<AnalysisDeliverable, 'id'>) => Promise<AnalysisDeliverable>;
  removeAnalysisDeliverable: (id: string, projectId: string) => Promise<void>;
}
interface AnalysisComplexitySlice {
  analysisComplexities: Record<string, AnalysisComplexity[]>;
  loadAnalysisComplexities: (projectId: string) => Promise<void>;
  saveAnalysisComplexity: (data: Omit<AnalysisComplexity, 'id'>) => Promise<AnalysisComplexity>;
}
interface IncidentSlice {
  incidents: Record<string, Incident[]>;
  loadIncidents: (projectId: string) => Promise<void>;
  addIncident: (data: Omit<Incident, 'id'>) => Promise<Incident>;
  updateIncident: (id: string, projectId: string, data: Partial<Pick<Incident, 'status' | 'severity' | 'resolved_at'>>) => Promise<void>;
  removeIncident: (id: string, projectId: string) => Promise<void>;
}
interface AutomationSlice {
  automations: Record<string, Automation[]>;
  loadAutomations: (projectId: string) => Promise<void>;
  addAutomation: (data: Omit<Automation, 'id'>) => Promise<Automation>;
  removeAutomation: (id: string, projectId: string) => Promise<void>;
}
interface InfrastructureSlice {
  infrastructure: Record<string, InfrastructureItem[]>;
  loadInfrastructure: (projectId: string) => Promise<void>;
  addInfrastructure: (data: Omit<InfrastructureItem, 'id'>) => Promise<InfrastructureItem>;
  removeInfrastructure: (id: string, projectId: string) => Promise<void>;
}
interface SLASlice {
  slas: Record<string, SLA[]>;
  loadSLAs: (projectId: string) => Promise<void>;
  addSLA: (data: Omit<SLA, 'id'>) => Promise<SLA>;
  removeSLA: (id: string, projectId: string) => Promise<void>;
}
interface ExperimentSlice {
  experiments: Record<string, Experiment[]>;
  loadExperiments: (projectId: string) => Promise<void>;
  addExperiment: (data: Omit<Experiment, 'id'>) => Promise<Experiment>;
  updateExperiment: (id: string, projectId: string, data: Partial<Pick<Experiment, 'status' | 'metrics'>>) => Promise<void>;
  removeExperiment: (id: string, projectId: string) => Promise<void>;
}
interface AIModelSlice {
  aiModels: Record<string, AIModel[]>;
  loadAIModels: (projectId: string) => Promise<void>;
  addAIModel: (data: Omit<AIModel, 'id'>) => Promise<AIModel>;
  updateAIModel: (id: string, projectId: string, data: Partial<Pick<AIModel, 'status' | 'metrics'>>) => Promise<void>;
  removeAIModel: (id: string, projectId: string) => Promise<void>;
}
interface ComputeCostSlice {
  computeCosts: Record<string, ComputeCost[]>;
  loadComputeCosts: (projectId: string) => Promise<void>;
  addComputeCost: (data: Omit<ComputeCost, 'id'>) => Promise<ComputeCost>;
  removeComputeCost: (id: string, projectId: string) => Promise<void>;
}
interface DatasetVersionSlice {
  datasetVersions: Record<string, DatasetVersion[]>;
  loadDatasetVersions: (projectId: string) => Promise<void>;
  addDatasetVersion: (data: Omit<DatasetVersion, 'id'>) => Promise<DatasetVersion>;
  removeDatasetVersion: (id: string, projectId: string) => Promise<void>;
}
interface StudentSlice {
  students: Record<string, Student[]>;
  loadStudents: (clientId: string) => Promise<void>;
  addStudent: (data: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (id: string, clientId: string, data: Partial<Pick<Student, 'grade_level' | 'subject' | 'hourly_rate' | 'status'>>) => Promise<void>;
  removeStudent: (id: string, clientId: string) => Promise<void>;
}
interface CurriculumSlice {
  curriculumItems: Record<string, CurriculumItem[]>;
  loadCurriculumItems: (projectId: string) => Promise<void>;
  addCurriculumItem: (data: Omit<CurriculumItem, 'id'>) => Promise<CurriculumItem>;
  updateCurriculumItem: (id: string, projectId: string, data: Partial<Pick<CurriculumItem, 'title' | 'status' | 'notes'>>) => Promise<void>;
  removeCurriculumItem: (id: string, projectId: string) => Promise<void>;
}
interface ProgressReportSlice {
  progressReports: Record<string, ProgressReport[]>;
  loadProgressReports: (projectId: string) => Promise<void>;
  addProgressReport: (data: Omit<ProgressReport, 'id'>) => Promise<ProgressReport>;
  removeProgressReport: (id: string, projectId: string) => Promise<void>;
}
interface CancellationSlice {
  cancellations: Record<string, Cancellation[]>;
  loadCancellations: (clientId: string) => Promise<void>;
  addCancellation: (data: Omit<Cancellation, 'id'>) => Promise<Cancellation>;
  removeCancellation: (id: string, clientId: string) => Promise<void>;
}
interface IntakeFormSlice {
  intakeForms: Record<string, IntakeForm[]>;
  loadIntakeForms: (clientId: string) => Promise<void>;
  saveIntakeForm: (data: Omit<IntakeForm, 'id'>) => Promise<IntakeForm>;
}
interface ProgressNoteSlice {
  progressNotes: Record<string, ProgressNote[]>;
  loadProgressNotes: (clientId: string) => Promise<void>;
  addProgressNote: (data: Omit<ProgressNote, 'id'>) => Promise<ProgressNote>;
  removeProgressNote: (id: string, clientId: string) => Promise<void>;
}
interface ProgramSlice {
  programs: Record<string, Program[]>;
  loadPrograms: (clientId: string) => Promise<void>;
  addProgram: (data: Omit<Program, 'id'>) => Promise<Program>;
  updateProgram: (id: string, clientId: string, data: Partial<Pick<Program, 'name' | 'duration_weeks' | 'sessions_per_week' | 'notes'>>) => Promise<void>;
  removeProgram: (id: string, clientId: string) => Promise<void>;
}
interface AssessmentSlice {
  assessments: Record<string, Assessment[]>;
  loadAssessments: (clientId: string) => Promise<void>;
  addAssessment: (data: Omit<Assessment, 'id'>) => Promise<Assessment>;
  removeAssessment: (id: string, clientId: string) => Promise<void>;
}
interface ClientProgressSlice {
  clientProgresses: Record<string, ClientProgress[]>;
  loadClientProgresses: (clientId: string) => Promise<void>;
  addClientProgress: (data: Omit<ClientProgress, 'id'>) => Promise<ClientProgress>;
  removeClientProgress: (id: string, clientId: string) => Promise<void>;
}
interface CommissionTOSSlice {
  commissionTOS: CommissionTOS[];
  loadCommissionTOSList: () => Promise<void>;
  addCommissionTOSItem: (data: Omit<CommissionTOS, 'id'>) => Promise<CommissionTOS>;
  removeCommissionTOSItem: (id: string) => Promise<void>;
}

export type AppStore = ClientSlice & ProjectSlice & MilestoneSlice & ProposalSlice & ContractSlice & TimeSlice & InvoiceSlice & InvoicePaymentSlice & ExpenseSlice & ProfileSlice & CommunicationSlice & RecurringInvoiceSlice & ImportSlice & AttachmentSlice & MetricSlice & FollowUpSlice & ExportTemplateSlice & ContractTemplateSlice & ProjectTemplateSlice & ArchetypeRenderLogSlice & ArchetypeSessionSlice & ArchetypeShootSlice & ArchetypeRevisionSlice & ArchetypeBuildSlice & ArchetypeKeywordSlice & ArchetypeDatasetSlice & PhaseTrackerSlice;

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
};

export const useStore = create<AppStore>((set, get) => ({
  // Clients
  clients: [],
  loadClients: async () => {
    try {
      const clients = await invoke<Client[]>('get_clients');
      set({ clients });
    } catch (e) {
      console.error('[store] loadClients failed:', e);
    }
  },
  addClient: async (data) => {
    const client = await invoke<Client>('create_client', { payload: data });
    set({ clients: [...get().clients, client] });
    return client;
  },
  updateClient: async (data) => {
    await invoke('update_client', { payload: data });
    set({ clients: get().clients.map((c) => (c.id === data.id ? data : c)) });
  },
  removeClient: async (id) => {
    await invoke('delete_client', { id });
    set({ clients: get().clients.filter((c) => c.id !== id) });
  },
  refreshClient: async (id) => {
    const client = await invoke<Client | null>('get_client', { id });
    if (client) {
      set({ clients: get().clients.map((c) => (c.id === id ? client : c)) });
    }
    return client;
  },

  // Projects
  projects: [],
  loadProjects: async () => {
    try {
      const projects = await invoke<Project[]>('get_projects');
      set({ projects });
    } catch (e) {
      console.error('[store] loadProjects failed:', e);
    }
  },
  addProject: async (data) => {
    const project = await invoke<Project>('create_project', { payload: data });
    set({ projects: [...get().projects, project] });
    return project;
  },
  updateProject: async (data) => {
    await invoke('update_project', { payload: data });
    set({ projects: get().projects.map((p) => (p.id === data.id ? data : p)) });
  },
  removeProject: async (id) => {
    await invoke('delete_project', { id });
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
  refreshProject: async (id) => {
    const project = await invoke<Project | null>('get_project', { id });
    if (project) {
      set({ projects: get().projects.map((p) => (p.id === id ? project : p)) });
    }
    return project;
  },

  // Milestones
  milestones: {},
  loadMilestones: async (projectId) => {
    const milestones = await invoke<Milestone[]>('get_milestones', { projectId });
    set({ milestones: { ...get().milestones, [projectId]: milestones } });
  },
  addMilestone: async (data) => {
    const milestone = await invoke<Milestone>('create_milestone', { payload: data });
    const existing = get().milestones[data.project_id] || [];
    set({ milestones: { ...get().milestones, [data.project_id]: [...existing, milestone] } });
    return milestone;
  },
  updateMilestone: async (data) => {
    await invoke('update_milestone', { payload: data });
    const updated = { ...get().milestones };
    for (const key of Object.keys(updated)) {
      updated[key] = updated[key].map((m) => (m.id === data.id ? data : m));
    }
    set({ milestones: updated });
  },
  removeMilestone: async (id) => {
    await invoke('delete_milestone', { id });
    const updated = { ...get().milestones };
    for (const key of Object.keys(updated)) {
      updated[key] = updated[key].filter((m) => m.id !== id);
    }
    set({ milestones: updated });
  },

  // Proposals
  proposals: [],
  loadProposals: async () => {
    try {
      const proposals = await invoke<Proposal[]>('get_proposals');
      set({ proposals });
    } catch (e) {
      console.error('[store] loadProposals failed:', e);
    }
  },
  addProposal: async (data) => {
    const proposal = await invoke<Proposal>('create_proposal', { payload: data });
    set({ proposals: [...get().proposals, proposal] });
    return proposal;
  },
  updateProposal: async (data) => {
    await invoke('update_proposal', { payload: data });
    set({ proposals: get().proposals.map((p) => (p.id === data.id ? data : p)) });
  },
  removeProposal: async (id) => {
    await invoke('delete_proposal', { id });
    set({ proposals: get().proposals.filter((p) => p.id !== id) });
  },
  refreshProposal: async (id) => {
    const proposal = await invoke<Proposal | null>('get_proposal', { id });
    if (proposal) {
      set({ proposals: get().proposals.map((p) => (p.id === id ? proposal : p)) });
    }
    return proposal;
  },

  // Contracts
  contracts: [],
  loadContracts: async () => {
    try {
      const contracts = await invoke<Contract[]>('get_contracts');
      set({ contracts });
    } catch (e) {
      console.error('[store] loadContracts failed:', e);
    }
  },
  addContract: async (data) => {
    const contract = await invoke<Contract>('create_contract', { payload: data });
    set({ contracts: [...get().contracts, contract] });
    return contract;
  },
  updateContract: async (data) => {
    await invoke('update_contract', { payload: data });
    set({ contracts: get().contracts.map((c) => (c.id === data.id ? data : c)) });
  },
  removeContract: async (id) => {
    await invoke('delete_contract', { id });
    set({ contracts: get().contracts.filter((c) => c.id !== id) });
  },
  refreshContract: async (id) => {
    const contract = await invoke<Contract | null>('get_contract', { id });
    if (contract) {
      set({ contracts: get().contracts.map((c) => (c.id === id ? contract : c)) });
    }
    return contract;
  },

  // Time Entries
  timeEntries: [],
  loadTimeEntries: async () => {
    try {
      const timeEntries = await invoke<TimeEntry[]>('get_time_entries');
      set({ timeEntries });
    } catch (e) {
      console.error('[store] loadTimeEntries failed:', e);
    }
  },
  addTimeEntry: async (data) => {
    const entry = await invoke<TimeEntry>('create_time_entry', { payload: data });
    set({ timeEntries: [...get().timeEntries, entry] });
    return entry;
  },
  updateTimeEntry: async (data) => {
    await invoke('update_time_entry', { payload: data });
    set({ timeEntries: get().timeEntries.map((t) => (t.id === data.id ? data : t)) });
  },
  removeTimeEntry: async (id) => {
    await invoke('delete_time_entry', { id });
    set({ timeEntries: get().timeEntries.filter((t) => t.id !== id) });
  },
  refreshTimeEntry: async (id) => {
    const entry = await invoke<TimeEntry | null>('get_time_entry', { id });
    if (entry) {
      set({ timeEntries: get().timeEntries.map((t) => (t.id === id ? entry : t)) });
    }
    return entry;
  },

  // Invoices
  invoices: [],
  loadInvoices: async () => {
    try {
      const raw = await invoke<Invoice[]>('get_invoices');
      const invoices = raw.map((inv: Invoice) => ({
        ...inv,
        line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : inv.line_items,
      }));
      set({ invoices });
    } catch (e) {
      console.error('[store] loadInvoices failed:', e);
    }
  },
  addInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    const invoice = await invoke<Invoice>('create_invoice', { payload });
    const parsed = { ...invoice, line_items: typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items as string) : invoice.line_items };
    set({ invoices: [...get().invoices, parsed] });
    return parsed;
  },
  updateInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    await invoke('update_invoice', { payload });
    set({ invoices: get().invoices.map((i) => (i.id === data.id ? data : i)) });
  },
  removeInvoice: async (id) => {
    await invoke('delete_invoice', { id });
    set({ invoices: get().invoices.filter((i) => i.id !== id) });
  },
  refreshInvoice: async (id) => {
    const invoice = await invoke<Invoice | null>('get_invoice', { id });
    if (invoice) {
      set({ invoices: get().invoices.map((i) => (i.id === id ? invoice : i)) });
    }
    return invoice;
  },

  // Invoice Payments
  payments: {},
  loadPayments: async (invoiceId) => {
    try {
      const payments = await invoke<InvoicePayment[]>('get_invoice_payments', { invoiceId });
      set({ payments: { ...get().payments, [invoiceId]: payments } });
    } catch (e) {
      console.error('[store] loadPayments failed:', e);
    }
  },
  loadAllPayments: async () => {
    try {
      const allPayments = await invoke<InvoicePayment[]>('get_all_invoice_payments');
      const byInvoice: Record<string, InvoicePayment[]> = {};
      for (const p of allPayments) {
        if (!byInvoice[p.invoice_id]) byInvoice[p.invoice_id] = [];
        byInvoice[p.invoice_id].push(p);
      }
      set({ payments: byInvoice });
    } catch (e) {
      console.error('[store] loadAllPayments failed:', e);
    }
  },
  addPayment: async (data) => {
    const payment = await invoke<InvoicePayment>('create_invoice_payment', { payload: data });
    const existing = get().payments[data.invoice_id] || [];
    set({ payments: { ...get().payments, [data.invoice_id]: [payment, ...existing] } });
    return payment;
  },
  removePayment: async (id, invoiceId) => {
    await invoke('delete_invoice_payment', { id });
    const existing = get().payments[invoiceId] || [];
    set({ payments: { ...get().payments, [invoiceId]: existing.filter((p) => p.id !== id) } });
  },

  // Expenses
  expenses: [],
  loadExpenses: async () => {
    try {
      const expenses = await invoke<Expense[]>('get_expenses');
      set({ expenses });
    } catch (e) {
      console.error('[store] loadExpenses failed:', e);
    }
  },
  addExpense: async (data) => {
    const expense = await invoke<Expense>('create_expense', { payload: data });
    set({ expenses: [...get().expenses, expense] });
    return expense;
  },
  updateExpense: async (data) => {
    await invoke('update_expense', { payload: data });
    set({ expenses: get().expenses.map((e) => (e.id === data.id ? data : e)) });
  },
  removeExpense: async (id) => {
    await invoke('delete_expense', { id });
    set({ expenses: get().expenses.filter((e) => e.id !== id) });
  },

  // Profile
  profile: null,
  profileLoaded: false,
  isLicensed: false,
  loadProfile: async () => {
    try {
      const profile = await invoke<UserProfile | null>('get_user_profile');
      const licensed = !!(profile?.license_key && await validateLicenseKey(profile.license_key));
      set({ profile, profileLoaded: true, isLicensed: licensed });
    } catch (e) {
      console.error('[store] loadProfile failed:', e);
      set({ profileLoaded: true });
    }
  },
  saveProfile: async (data) => {
    await invoke('upsert_user_profile', { payload: data });
    const licensed = !!(data.license_key && await validateLicenseKey(data.license_key));
    set({ profile: data, isLicensed: licensed });
  },
  activateLicense: async (key) => {
    if (!await validateLicenseKey(key)) return false;
    const profile = get().profile;
    if (!profile) return false;
    const now = new Date().toISOString();
    const updated = { ...profile, license_key: key, licensed_at: now };
    await invoke('upsert_user_profile', { payload: updated });
    set({ profile: updated, isLicensed: true });
    return true;
  },
  removeLicense: async () => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, license_key: undefined, licensed_at: undefined };
    await invoke('upsert_user_profile', { payload: updated });
    set({ profile: updated, isLicensed: false });
  },

  // Communications
  communications: {},
  loadCommunications: async (clientId) => {
    const comms = await invoke<Communication[]>('get_communications', { clientId });
    set({ communications: { ...get().communications, [clientId]: comms } });
  },
  addCommunication: async (data) => {
    const comm = await invoke<Communication>('create_communication', { payload: data });
    const existing = get().communications[data.client_id] || [];
    const updated = [comm, ...existing].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    set({ communications: { ...get().communications, [data.client_id]: updated } });
    return comm;
  },
  updateCommunication: async (id, clientId, summary) => {
    await invoke('update_communication', { id, summary });
    const existing = get().communications[clientId] || [];
    const updated = existing.map((c) => (c.id === id ? { ...c, summary } : c));
    set({ communications: { ...get().communications, [clientId]: updated } });
  },
  removeCommunication: async (id, clientId) => {
    await invoke('delete_communication', { id });
    const existing = get().communications[clientId] || [];
    set({ communications: { ...get().communications, [clientId]: existing.filter((c) => c.id !== id) } });
  },

  // Recurring Invoices
  recurringInvoices: [],
  loadRecurringInvoices: async () => {
    try {
      const raw = await invoke<RecurringInvoice[]>('get_recurring_invoices');
      const items = raw.map((ri: RecurringInvoice) => ({
        ...ri,
        line_items: typeof ri.line_items === 'string' ? JSON.parse(ri.line_items as string) : ri.line_items,
      }));
      set({ recurringInvoices: items });
    } catch (e) {
      console.error('[store] loadRecurringInvoices failed:', e);
    }
  },
  addRecurringInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    const ri = await invoke<RecurringInvoice>('create_recurring_invoice', { payload });
    const parsed = { ...ri, line_items: typeof ri.line_items === 'string' ? JSON.parse(ri.line_items as string) : ri.line_items };
    set({ recurringInvoices: [...get().recurringInvoices, parsed] });
    return parsed;
  },
  updateRecurringInvoice: async (data) => {
    const payload = { ...data, line_items: JSON.stringify(data.line_items) };
    await invoke('update_recurring_invoice', { payload });
    set({ recurringInvoices: get().recurringInvoices.map((r) => (r.id === data.id ? data : r)) });
  },
  removeRecurringInvoice: async (id) => {
    await invoke('delete_recurring_invoice', { id });
    set({ recurringInvoices: get().recurringInvoices.filter((r) => r.id !== id) });
  },

  // Import History
  importHistory: [],
  loadImportHistory: async () => {
    try {
      const logs = await invoke<ImportLog[]>('get_import_log');
      set({ importHistory: logs });
    } catch (e) {
      console.error('[store] loadImportHistory failed:', e);
    }
  },
  saveImportFile: async (file: File) => {
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const path = await invoke<string>('save_import_file', { filename: file.name, data });
    return path;
  },
  logImport: async (data) => {
    const log = await invoke<ImportLog>('log_import', { payload: data });
    set({ importHistory: [log, ...get().importHistory] });
    return log;
  },
  getImportsDir: async () => {
    return invoke<string>('get_imports_dir');
  },

  // Attachments
  attachments: {},
  allAttachments: [],
  assetStats: null,
  loadAttachments: async (entityType, entityId) => {
    const key = `${entityType}:${entityId}`;
    const items = await invoke<Attachment[]>('get_attachments', { entityType, entityId });
    set({ attachments: { ...get().attachments, [key]: items } });
  },
  loadAllAttachments: async () => {
    try {
      const items = await invoke<Attachment[]>('get_all_attachments');
      set({ allAttachments: items });
    } catch (e) {
      console.error('[store] loadAllAttachments failed:', e);
    }
  },
  addAttachment: async (data) => {
    const attachment = await invoke<Attachment>('create_attachment', { payload: data });
    const key = `${data.entity_type}:${data.entity_id}`;
    const existing = get().attachments[key] || [];
    set({
      attachments: { ...get().attachments, [key]: [attachment, ...existing] },
      allAttachments: [attachment, ...get().allAttachments],
    });
    return attachment;
  },
  removeAttachment: async (id, entityType, entityId) => {
    await invoke('delete_attachment', { id });
    const key = `${entityType}:${entityId}`;
    const existing = get().attachments[key] || [];
    set({
      attachments: { ...get().attachments, [key]: existing.filter((a) => a.id !== id) },
      allAttachments: get().allAttachments.filter((a) => a.id !== id),
    });
  },
  saveAssetFile: async (file: File) => {
    const buffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    const path = await invoke<string>('save_asset_file', { filename: file.name, data });
    return path;
  },
  getAssetsDir: async () => {
    return invoke<string>('get_assets_dir');
  },
  renameAttachment: async (id, newFilename) => {
    const attachment = await invoke<Attachment>('rename_attachment', {
      payload: { id, new_filename: newFilename },
    });
    set({
      allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)),
      attachments: Object.fromEntries(
        Object.entries(get().attachments).map(([k, v]) => [
          k,
          v.map((a) => (a.id === id ? attachment : a)),
        ])
      ),
    });
    return attachment;
  },
  moveAttachment: async (id, entityType, entityId, oldEntityType, oldEntityId) => {
    const attachment = await invoke<Attachment>('move_attachment', {
      payload: { id, entity_type: entityType, entity_id: entityId },
    });
    const oldKey = `${oldEntityType}:${oldEntityId}`;
    const newKey = `${entityType}:${entityId}`;
    const oldList = (get().attachments[oldKey] || []).filter((a) => a.id !== id);
    const newList = [attachment, ...(get().attachments[newKey] || [])];
    set({
      attachments: { ...get().attachments, [oldKey]: oldList, [newKey]: newList },
      allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)),
    });
    return attachment;
  },
  updateAttachmentMeta: async (id, data) => {
    const attachment = await invoke<Attachment>('update_attachment_meta', {
      payload: { id, ...data },
    });
    set({
      allAttachments: get().allAttachments.map((a) => (a.id === id ? attachment : a)),
      attachments: Object.fromEntries(
        Object.entries(get().attachments).map(([k, v]) => [
          k,
          v.map((a) => (a.id === id ? attachment : a)),
        ])
      ),
    });
    return attachment;
  },
  loadAssetStats: async () => {
    try {
      const stats = await invoke<AssetStats>('get_asset_stats');
      set({ assetStats: stats });
    } catch (e) {
      console.error('[store] loadAssetStats failed:', e);
    }
  },
  searchAssets: async (query) => {
    return invoke<Attachment[]>('search_assets', { query });
  },

  // Metrics
  metricDefs: {},
  metricValues: {},
  headlineMetrics: [],
  metricTemplates: [],
  loadMetricDefs: async (clientId) => {
    try {
      const defs = await invoke<MetricDefinition[]>('get_metric_definitions', { clientId });
      set({ metricDefs: { ...get().metricDefs, [clientId]: defs } });
    } catch (e) {
      console.error('[store] loadMetricDefs failed:', e);
    }
  },
  addMetricDef: async (data) => {
    const def = await invoke<MetricDefinition>('create_metric_definition', { payload: data });
    const existing = get().metricDefs[data.client_id] || [];
    set({ metricDefs: { ...get().metricDefs, [data.client_id]: [...existing, def] } });
    return def;
  },
  updateMetricDef: async (data) => {
    await invoke('update_metric_definition', { payload: data });
    const updated = { ...get().metricDefs };
    for (const key of Object.keys(updated)) {
      updated[key] = updated[key].map((d) => (d.id === data.id ? { ...d, ...data } : d));
    }
    set({ metricDefs: updated });
  },
  removeMetricDef: async (id, clientId) => {
    await invoke('delete_metric_definition', { id });
    const updated = { ...get().metricDefs };
    updated[clientId] = (updated[clientId] || []).filter((d) => d.id !== id);
    set({ metricDefs: updated });
  },
  loadMetricValues: async (definitionId, limit) => {
    try {
      const values = await invoke<MetricValue[]>('get_metric_values', { definitionId, limit: limit ?? null });
      set({ metricValues: { ...get().metricValues, [definitionId]: values } });
    } catch (e) {
      console.error('[store] loadMetricValues failed:', e);
    }
  },
  logMetricValue: async (data) => {
    const val = await invoke<MetricValue>('log_metric_value', { payload: data });
    const existing = get().metricValues[data.definition_id] || [];
    set({ metricValues: { ...get().metricValues, [data.definition_id]: [...existing, val] } });
    return val;
  },
  removeMetricValue: async (id, definitionId) => {
    await invoke('delete_metric_value', { id });
    const existing = get().metricValues[definitionId] || [];
    set({ metricValues: { ...get().metricValues, [definitionId]: existing.filter((v) => v.id !== id) } });
  },
  loadHeadlineMetrics: async () => {
    try {
      const metrics = await invoke<HeadlineMetric[]>('get_all_headline_metrics');
      set({ headlineMetrics: metrics });
    } catch (e) {
      console.error('[store] loadHeadlineMetrics failed:', e);
    }
  },
  loadMetricTemplates: async () => {
    try {
      const templates = await invoke<MetricTemplate[]>('get_metric_templates');
      set({ metricTemplates: templates });
    } catch (e) {
      console.error('[store] loadMetricTemplates failed:', e);
    }
  },
  saveMetricTemplate: async (name, definitions) => {
    await invoke('save_metric_template', {
      payload: { name, definitions_json: JSON.stringify(definitions) },
    });
    await get().loadMetricTemplates();
  },
  removeMetricTemplate: async (id) => {
    await invoke('delete_metric_template', { id });
    set({ metricTemplates: get().metricTemplates.filter((t) => t.id !== id) });
  },
  applyMetricTemplate: async (templateName, clientId) => {
    const templates = get().metricTemplates;
    if (!templates.length) await get().loadMetricTemplates();
    const tmpl = get().metricTemplates.find((t) => t.name === templateName);
    if (!tmpl) return;
    const definitions: Array<Pick<MetricDefinition, 'name' | 'metric_type' | 'unit_label' | 'is_headline' | 'sort_order'>> = JSON.parse(tmpl.definitions_json);
    for (const def of definitions) {
      await get().addMetricDef({
        client_id: clientId,
        name: def.name,
        metric_type: def.metric_type as MetricDefinition['metric_type'],
        unit_label: def.unit_label,
        is_headline: def.is_headline,
        sort_order: def.sort_order,
      });
    }
  },

  // Follow-ups
  followUpLogs: {},
  pendingFollowUps: [],
  followUpSettings: { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {}, subject_templates: {} },
  loadFollowUpSettings: () => {
    try {
      const stored = localStorage.getItem('lance:follow-up-settings');
      if (stored) {
        const defaults = { enabled: true, proposal_delay_days: 3, invoice_delay_days: 0, templates: {}, subject_templates: {} };
        set({ followUpSettings: { ...defaults, ...JSON.parse(stored) } });
      }
    } catch { /* use defaults */ }
  },
  saveFollowUpSettings: (updates) => {
    const current = get().followUpSettings;
    const merged = { ...current, ...updates };
    set({ followUpSettings: merged });
    localStorage.setItem('lance:follow-up-settings', JSON.stringify(merged));
  },
  loadFollowUpLog: async (entityType, entityId) => {
    try {
      const key = `${entityType}:${entityId}`;
      const logs = await invoke<FollowUpLog[]>('get_follow_up_log', { entityType, entityId });
      set({ followUpLogs: { ...get().followUpLogs, [key]: logs } });
    } catch (e) {
      console.error('[store] loadFollowUpLog failed:', e);
    }
  },
  logFollowUp: async (data) => {
    const log = await invoke<FollowUpLog>('log_follow_up', { payload: data });
    const key = `${data.entity_type}:${data.entity_id}`;
    const existing = get().followUpLogs[key] || [];
    set({ followUpLogs: { ...get().followUpLogs, [key]: [log, ...existing] } });
    return log;
  },
  updateFollowUpStatus: async (id, status, action) => {
    await invoke('update_follow_up_status', { payload: { id, status, action: action ?? null } });
    const allLogs = { ...get().followUpLogs };
    for (const key of Object.keys(allLogs)) {
      allLogs[key] = allLogs[key].map((l) =>
          l.id === id ? { ...l, status: status as FollowUpLog['status'], action: action ?? l.action, actioned_at: new Date().toISOString() } : l
      );
    }
    set({
      followUpLogs: allLogs,
      pendingFollowUps: get().pendingFollowUps.filter((l) => l.id !== id),
    });
  },
  loadPendingFollowUps: async () => {
    try {
      const logs = await invoke<FollowUpLog[]>('get_all_pending_follow_ups');
      set({ pendingFollowUps: logs });
    } catch (e) {
      console.error('[store] loadPendingFollowUps failed:', e);
    }
  },

  // Export Templates
  exportTemplates: [],
  loadExportTemplates: async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ExportTemplate[]>('SELECT id, name, type, header, footer, sections, color_scheme, created_at FROM export_templates ORDER BY created_at DESC');
      const parsed = rows.map((r: ExportTemplate) => ({
        ...r,
        sections: typeof r.sections === 'string' ? JSON.parse(r.sections as string) : r.sections,
      }));
      set({ exportTemplates: parsed });
    } catch (e) {
      console.error('[store] loadExportTemplates failed:', e);
    }
  },
  addExportTemplate: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO export_templates (id, name, type, header, footer, sections, color_scheme, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.name, data.type, data.header || '', data.footer || '', JSON.stringify(data.sections || []), data.color_scheme || '', now]
    );
    const template: ExportTemplate = { id, ...data, created_at: now };
    set({ exportTemplates: [template, ...get().exportTemplates] });
    return template;
  },
  updateExportTemplate: async (data) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'UPDATE export_templates SET name = ?, type = ?, header = ?, footer = ?, sections = ?, color_scheme = ? WHERE id = ?',
      [data.name, data.type, data.header || '', data.footer || '', JSON.stringify(data.sections || []), data.color_scheme || '', data.id]
    );
    set({ exportTemplates: get().exportTemplates.map((t) => (t.id === data.id ? data : t)) });
  },
  removeExportTemplate: async (id) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM export_templates WHERE id = ?', [id]);
    set({ exportTemplates: get().exportTemplates.filter((t) => t.id !== id) });
  },

  // Contract Templates
  contractTemplates: [],
  loadContractTemplates: async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ContractTemplate[]>('SELECT id, name, category, body, variables, created_at FROM contract_templates ORDER BY created_at DESC');
      const parsed = rows.map((r: ContractTemplate) => ({
        ...r,
        variables: typeof r.variables === 'string' ? JSON.parse(r.variables as string) : r.variables,
      }));
      set({ contractTemplates: parsed });
    } catch (e) {
      console.error('[store] loadContractTemplates failed:', e);
    }
  },
  addContractTemplate: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO contract_templates (id, name, category, body, variables, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, data.category || '', data.body, JSON.stringify(data.variables || []), now]
    );
    const template: ContractTemplate = { id, ...data, created_at: now };
    set({ contractTemplates: [template, ...get().contractTemplates] });
    return template;
  },
  updateContractTemplate: async (data) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'UPDATE contract_templates SET name = ?, category = ?, body = ?, variables = ? WHERE id = ?',
      [data.name, data.category || '', data.body, JSON.stringify(data.variables || []), data.id]
    );
    set({ contractTemplates: get().contractTemplates.map((t) => (t.id === data.id ? data : t)) });
  },
  removeContractTemplate: async (id) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM contract_templates WHERE id = ?', [id]);
    set({ contractTemplates: get().contractTemplates.filter((t) => t.id !== id) });
  },

  // ── Project Templates ──
  projectTemplates: [],
  projectTemplateMilestones: {},
  loadProjectTemplates: async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ProjectTemplate[]>('SELECT id, name, description, default_budget, default_status, is_default, created_at FROM project_templates ORDER BY created_at DESC');
      const parsed = rows.map((r: ProjectTemplate) => ({
        ...r,
        is_default: !!(r as Record<string, unknown>).is_default,
      }));
      set({ projectTemplates: parsed });
    } catch (e) {
      console.error('[store] loadProjectTemplates failed:', e);
    }
  },
  loadTemplateMilestones: async (templateId) => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      const rows = await db.select<ProjectTemplateMilestone[]>('SELECT id, template_id, title, days_from_start, invoice_on_completion FROM project_template_milestones WHERE template_id = ? ORDER BY days_from_start ASC', [templateId]);
      set({ projectTemplateMilestones: { ...get().projectTemplateMilestones, [templateId]: rows } });
    } catch (e) {
      console.error('[store] loadTemplateMilestones failed:', e);
    }
  },
  addProjectTemplate: async (data, milestones) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute(
      'INSERT INTO project_templates (id, name, description, default_budget, default_status, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [id, data.name, data.description || null, data.default_budget ?? null, data.default_status || 'Active', now]
    );
    for (const m of milestones) {
      await db.execute(
        'INSERT INTO project_template_milestones (id, template_id, title, days_from_start, invoice_on_completion) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), id, m.title, m.days_from_start, m.invoice_on_completion ? 1 : 0]
      );
    }
    const template: ProjectTemplate = { id, name: data.name, description: data.description, default_budget: data.default_budget, default_status: data.default_status || 'Active', is_default: false, created_at: now };
    set({ projectTemplates: [template, ...get().projectTemplates] });
    return template;
  },
  updateProjectTemplate: async (id, data) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description || null); }
    if (data.default_budget !== undefined) { sets.push('default_budget = ?'); vals.push(data.default_budget ?? null); }
    if (data.default_status !== undefined) { sets.push('default_status = ?'); vals.push(data.default_status); }
    if (sets.length === 0) return;
    vals.push(id);
    await db.execute(`UPDATE project_templates SET ${sets.join(', ')} WHERE id = ?`, vals);
    set({ projectTemplates: get().projectTemplates.map((t) => (t.id === id ? { ...t, ...data } : t)) });
  },
  removeProjectTemplate: async (id) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM project_template_milestones WHERE template_id = ?', [id]);
    await db.execute('DELETE FROM project_templates WHERE id = ?', [id]);
    set({ projectTemplates: get().projectTemplates.filter((t) => t.id !== id) });
  },

  // ── Archetype: Render Log ──
  renderLogs: {},
  loadRenderLogs: async (projectId) => {
    try {
      const logs = await invoke<ArchetypeRenderLog[]>('get_render_logs', { projectId });
      set({ renderLogs: { ...get().renderLogs, [projectId]: logs } });
    } catch (e) {
      console.error('[store] loadRenderLogs failed:', e);
    }
  },
  addRenderLog: async (data) => {
    const log = await invoke<ArchetypeRenderLog>('create_render_log', { payload: data });
    const existing = get().renderLogs[log.project_id] || [];
    set({ renderLogs: { ...get().renderLogs, [log.project_id]: [log, ...existing] } });
    return log;
  },
  removeRenderLog: async (id, projectId) => {
    await invoke('delete_render_log', { id });
    const updated = { ...get().renderLogs };
    updated[projectId] = (updated[projectId] || []).filter((l) => l.id !== id);
    set({ renderLogs: updated });
  },

  // ── Archetype: Sessions ──
  sessions: [],
  loadSessions: async (clientId, projectId) => {
    try {
      const sessions = await invoke<ArchetypeSession[]>('get_sessions', { clientId: clientId ?? null, projectId: projectId ?? null });
      set({ sessions });
    } catch (e) {
      console.error('[store] loadSessions failed:', e);
    }
  },
  addSession: async (data) => {
    const session = await invoke<ArchetypeSession>('create_session', { payload: data });
    set({ sessions: [session, ...get().sessions] });
    return session;
  },
  removeSession: async (id) => {
    await invoke('delete_session', { id });
    set({ sessions: get().sessions.filter((s) => s.id !== id) });
  },

  // ── Archetype: Shoots ──
  shoots: {},
  loadShoots: async (projectId) => {
    try {
      const shoots = await invoke<ArchetypeShoot[]>('get_shoots', { projectId });
      set({ shoots: { ...get().shoots, [projectId]: shoots } });
    } catch (e) {
      console.error('[store] loadShoots failed:', e);
    }
  },
  addShoot: async (data) => {
    const shoot = await invoke<ArchetypeShoot>('create_shoot', { payload: data });
    const existing = get().shoots[shoot.project_id] || [];
    set({ shoots: { ...get().shoots, [shoot.project_id]: [shoot, ...existing] } });
    return shoot;
  },
  removeShoot: async (id, projectId) => {
    await invoke('delete_shoot', { id });
    const updated = { ...get().shoots };
    updated[projectId] = (updated[projectId] || []).filter((s) => s.id !== id);
    set({ shoots: updated });
  },

  // ── Archetype: Revisions ──
  revisions: {},
  loadRevisions: async (projectId) => {
    try {
      const revisions = await invoke<ArchetypeRevision[]>('get_revisions', { projectId });
      set({ revisions: { ...get().revisions, [projectId]: revisions } });
    } catch (e) {
      console.error('[store] loadRevisions failed:', e);
    }
  },
  addRevision: async (data) => {
    const revision = await invoke<ArchetypeRevision>('create_revision', { payload: data });
    const existing = get().revisions[revision.project_id] || [];
    set({ revisions: { ...get().revisions, [revision.project_id]: [revision, ...existing] } });
    return revision;
  },
  removeRevision: async (id, projectId) => {
    await invoke('delete_revision', { id });
    const updated = { ...get().revisions };
    updated[projectId] = (updated[projectId] || []).filter((r) => r.id !== id);
    set({ revisions: updated });
  },

  // ── Archetype: Builds ──
  builds: {},
  loadBuilds: async (projectId) => {
    try {
      const builds = await invoke<ArchetypeBuild[]>('get_builds', { projectId });
      set({ builds: { ...get().builds, [projectId]: builds } });
    } catch (e) {
      console.error('[store] loadBuilds failed:', e);
    }
  },
  addBuild: async (data) => {
    const build = await invoke<ArchetypeBuild>('create_build', { payload: data });
    const existing = get().builds[build.project_id] || [];
    set({ builds: { ...get().builds, [build.project_id]: [build, ...existing] } });
    return build;
  },
  removeBuild: async (id, projectId) => {
    await invoke('delete_build', { id });
    const updated = { ...get().builds };
    updated[projectId] = (updated[projectId] || []).filter((b) => b.id !== id);
    set({ builds: updated });
  },

  // ── Archetype: Keywords ──
  keywords: {},
  loadKeywords: async (clientId) => {
    try {
      const keywords = await invoke<ArchetypeKeyword[]>('get_keywords', { clientId });
      set({ keywords: { ...get().keywords, [clientId]: keywords } });
    } catch (e) {
      console.error('[store] loadKeywords failed:', e);
    }
  },
  addKeyword: async (data) => {
    const keyword = await invoke<ArchetypeKeyword>('create_keyword', { payload: data });
    const existing = get().keywords[keyword.client_id] || [];
    set({ keywords: { ...get().keywords, [keyword.client_id]: [keyword, ...existing] } });
    return keyword;
  },
  updateKeyword: async (id, clientId, positionCurrent, targetPosition) => {
    await invoke('update_keyword', { id, positionCurrent: positionCurrent ?? null, targetPosition: targetPosition ?? null });
    const updated = { ...get().keywords };
    updated[clientId] = (updated[clientId] || []).map((k) =>
      k.id === id ? { ...k, position_current: positionCurrent ?? k.position_current, target_position: targetPosition ?? k.target_position } : k
    );
    set({ keywords: updated });
  },
  removeKeyword: async (id, clientId) => {
    await invoke('delete_keyword', { id });
    const updated = { ...get().keywords };
    updated[clientId] = (updated[clientId] || []).filter((k) => k.id !== id);
    set({ keywords: updated });
  },

  // ── Archetype: Datasets ──
  datasets: {},
  loadDatasets: async (projectId) => {
    try {
      const datasets = await invoke<ArchetypeDataset[]>('get_datasets', { projectId });
      set({ datasets: { ...get().datasets, [projectId]: datasets } });
    } catch (e) {
      console.error('[store] loadDatasets failed:', e);
    }
  },
  addDataset: async (data) => {
    const dataset = await invoke<ArchetypeDataset>('create_dataset', { payload: data });
    const existing = get().datasets[dataset.project_id] || [];
    set({ datasets: { ...get().datasets, [dataset.project_id]: [dataset, ...existing] } });
    return dataset;
  },
  removeDataset: async (id, projectId) => {
    await invoke('delete_dataset', { id });
    const updated = { ...get().datasets };
    updated[projectId] = (updated[projectId] || []).filter((d) => d.id !== id);
    set({ datasets: updated });
  },

  // ── Phase Tracker ──
  projectPhases: {},
  loadProjectPhases: async (projectId) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    const rows = await db.select<(ProjectPhase & Record<string, unknown>)[]>('SELECT id, project_id, phase_name, status, color FROM project_phases WHERE project_id = ? ORDER BY id ASC', [projectId]);
    set({ projectPhases: { ...get().projectPhases, [projectId]: rows.map(r => ({ id: r.id as string, project_id: r.project_id as string, phase_name: r.phase_name as string, status: r.status as string, color: r.color as string | undefined })) } });
  },
  addProjectPhase: async (data) => {
    const id = crypto.randomUUID();
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('INSERT INTO project_phases (id, project_id, phase_name, status, color) VALUES (?, ?, ?, ?, ?)', [id, data.project_id, data.phase_name, data.status || 'pending', data.color || null]);
    const item: ProjectPhase = { id, ...data, status: data.status || 'pending' };
    const existing = get().projectPhases[data.project_id] || [];
    set({ projectPhases: { ...get().projectPhases, [data.project_id]: [item, ...existing] } });
    return item;
  },
  updateProjectPhase: async (id, projectId, pdata) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    if (pdata.phase_name !== undefined) await db.execute('UPDATE project_phases SET phase_name = ? WHERE id = ?', [pdata.phase_name, id]);
    if (pdata.status !== undefined) await db.execute('UPDATE project_phases SET status = ? WHERE id = ?', [pdata.status, id]);
    if (pdata.color !== undefined) await db.execute('UPDATE project_phases SET color = ? WHERE id = ?', [pdata.color, id]);
    const updated = { ...get().projectPhases };
    updated[projectId] = (updated[projectId] || []).map((p) => p.id === id ? { ...p, ...pdata } : p);
    set({ projectPhases: updated });
  },
  removeProjectPhase: async (id, projectId) => {
    const { getDb } = await import('../db');
    const db = await getDb();
    await db.execute('DELETE FROM project_phases WHERE id = ?', [id]);
    const updated = { ...get().projectPhases };
    updated[projectId] = (updated[projectId] || []).filter((p) => p.id !== id);
    set({ projectPhases: updated });
  },
}));
