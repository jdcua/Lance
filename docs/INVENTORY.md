# Lance — Codebase Inventory

> Auto-generated inventory for open-source readiness. Generated from the repository at commit 4d0b64b.

## 1. Purpose & scope

This document maps every page, route, component, utility, hook, service, store slice, database table, Rust command, archetype, and dependency in Lance. It also flags dead code, duplicated logic, hardcoded values, and open-source-readiness gaps. The goal: a stranger can clone, run, understand, and contribute.

## 2. Repository overview

| Item | Value |
|---|---|
| App | Lance — Freelancer OS (desktop, offline-first) |
| Version | 0.9.9-5 (see package.json / src-tauri/tauri.conf.json) |
| Frontend | React 18 + TypeScript + Vite 8 + Tailwind 3 |
| State | Zustand 4 (single store) |
| Backend | Tauri 2 (Rust) + SQLite (rusqlite, bundled) |
| Client portal | Axum 0.7 local HTTP server |
| Frontend LOC | ~94,798 (src) |
| Tests | 68 test files (vitest) |
| Routes | 18 (17 app + share portal) |
| Screens | 17 route-level + 9 sub-screen modules |
| UI components | 44 (src/components/ui) |
| Feature components | 186 (src/components/features) |
| Utility modules | 30 (src/utils) |
| Lib modules | 16 (src/lib) |
| Archetypes | 41 profession configs |
| DB tables | 37 (CREATE TABLE) |
| Rust command modules | 16 (lib.rs registers ~130 handlers) |

### Entry points
- `src/main.tsx` — React mount, idle-callback polyfill, crypto.randomUUID backfill, trial service worker.
- `src/App.tsx` — root shell (2,021 lines): state, outlet, background engines, modals.
- `src/router.tsx` — browser router, lazy routes, basename handling for `/try`.
- `src-tauri/src/main.rs` / `lib.rs` — Tauri bootstrap, plugin init, command registration, Axum portal.
- `index.html` — Vite entry.

## 3. Routes & pages

| Path | Screen component | Skeleton | Notes |
|---|---|---|---|
| `/` | `Dashboard` | dashboard | Main dashboard |
| `/archetype` | `ArchetypePicker` | cards | Profession selection during onboarding |
| `/proposals` | `Proposals` | table | Proposal list |
| `/proposals/new` | `NewProposal` | form | Proposal editor |
| `/contracts` | `Contracts` | table | Contract list |
| `/projects` | `Projects` | cards | Project list + milestones |
| `/time` | `Time` | list | Time tracking + timer |
| `/invoices` | `Invoices` | table | Invoices, payments, recurring |
| `/follow-ups` | `FollowUps` | table | Follow-up queue |
| `/pipeline` | `Pipeline` | cards | Deal pipeline |
| `/clients` | `Clients` | detail | Client CRM |
| `/finance` | `Finance` | dashboard | Expenses + forecasting |
| `/insights` | `Insights` | cards | Archetype insight panels |
| `/settings` | `Settings` | form | Preferences, license, backups |
| `/achievements` | `Achievements` | cards | Achievement gallery |
| `/assets` | `Assets` | cards | Attachments & files |
| `/search` | `Search` | list | Global search |
| `*` | `NotFound` | list | 404 |
| `share/:token` | `ShareView` | — | Public client portal (no app shell) |

## 4. Screens (route-level)

- `src/screens/Achievements.tsx` — exports: AchievementsPage
- `src/screens/ArchetypePicker.tsx` — exports: ArchetypePicker
- `src/screens/Assets.tsx` — exports: Assets
- `src/screens/Clients.tsx` — exports: Clients
- `src/screens/Contracts.tsx` — exports: Contracts
- `src/screens/Dashboard.tsx` — exports: Dashboard
- `src/screens/Finance.split.test.tsx` — exports: (default)
- `src/screens/Finance.tsx` — exports: Finance
- `src/screens/FollowUps.tsx` — exports: FollowUps
- `src/screens/Insights.tsx` — exports: Insights
- `src/screens/Invoices.split.test.tsx` — exports: (default)
- `src/screens/Invoices.tsx` — exports: Invoices
- `src/screens/NewProposal.tsx` — exports: NewProposal
- `src/screens/NotFound.tsx` — exports: NotFound
- `src/screens/Pipeline.tsx` — exports: Pipeline
- `src/screens/Projects.tsx` — exports: Projects
- `src/screens/Proposals.tsx` — exports: Proposals
- `src/screens/Search.tsx` — exports: SearchScreen
- `src/screens/Settings.split.test.tsx` — exports: (default)
- `src/screens/Settings.tsx` — exports: Settings
- `src/screens/ShareView.tsx` — exports: sanitizeShareHtml, ShareView
- `src/screens/Time.tsx` — exports: TimeScreen

### Screen sub-modules
- `src/screens/finance/` — AffordabilityBanner, AgingReport, ForecastSection, OverviewSection, shared
- `src/screens/invoices/` — InvoiceList, InvoiceModals, RecurringList, shared
- `src/screens/settings/` — AppearanceSection, DangerSection, DataSection, GeneralSection, NotificationsSection, shared

## 5. Components

### 5.1 Layout (`src/components/layout/`)

- `AIBar.tsx` — AIBar
- `SideLink.tsx` — SideLink
- `Sidebar.tsx` — Sidebar
- `Topbar.tsx` — Topbar

### 5.2 Motion (`src/components/motion/`)

- `AnimatedNumber.tsx` — AnimatedNumber
- `Fade.tsx` — Fade
- `Magnetic.tsx` — Magnetic
- `OrbitField.tsx` — OrbitField
- `SharedView.tsx` — SharedView
- `Stagger.tsx` — StaggerGroup, StaggerItem

### 5.3 Shared UI (`src/components/ui/`)

- `Badge.tsx` — Badge
- `BrandLogo.tsx` — BrandLogo
- `Button.tsx` — Button
- `Card.tsx` — Card
- `ClientImportModal.test.tsx` — 
- `ClientImportModal.tsx` — ClientImportModal
- `ClientSelect.tsx` — ClientSelect
- `ColumnMapper.tsx` — ColumnMapper
- `CommandPalette.tsx` — CommandPalette
- `ConfirmDialog.tsx` — ConfirmDialog
- `DocPreview.tsx` — DocLine, DocTotal, DocPreview
- `DropZoneOverlay.tsx` — DropZoneOverlay
- `EmptyState.tsx` — EmptyState
- `ErrorBoundary.tsx` — ErrorBoundary
- `ImportModal.tsx` — tallyImport, ImportModal
- `LoadError.test.tsx` — 
- `LoadError.tsx` — LoadError
- `MetricCard.tsx` — MetricCard
- `Modal.tsx` — Modal
- `MoneyFlow.tsx` — loadSetAsidePct, MoneyFlow
- `OnboardingComfort.tsx` — OnboardingComfort
- `PrefToggle.tsx` — PrefToggle
- `ProWelcome.tsx` — ProWelcome
- `ProgressBar.tsx` — ProgressBar
- `QuickTimeLogModal.tsx` — QuickTimeLogModal
- `RecordTracker.tsx` — RecordTracker
- `RichEditor.tsx` — RichEditor
- `RunwayScrubber.tsx` — RunwayScrubber
- `ShortcutsModal.tsx` — ShortcutsModal
- `Skeleton.tsx` — SkeletonVariant, Skeleton
- `Sparkline.tsx` — Sparkline
- `SplashScreen.tsx` — SplashScreen
- `SpotlightTour.tsx` — SpotlightTour
- `SyncChip.tsx` — SyncChip
- `Timeline.tsx` — TimelineKind, TimelineItem, Timeline
- `TimerRing.tsx` — TimerRing
- `Toast.tsx` — ToastContainer
- `TodayQueue.tsx` — TodayQueue
- `UpdaterModal.tsx` — UpdaterModal
- `UpgradeModal.test.tsx` — 
- `UpgradeModal.tsx` — UpgradeModal
- `Walkthrough.tsx` — Walkthrough
- `WeekView.tsx` — WeekView
- `useVisibleList.tsx` — useVisibleList, MoreRows

### 5.4 Feature components (`src/components/features/`)

Count: 186. Registered in `src/components/features/registry.ts` and resolved at runtime by archetype config. Aliases (re-export another component) are marked.

Aliases (thin wrappers):
- `AuditTracker` → `AuditFindingLog`
- `CATToolLog` → `ToolComputeLog`
- `CommissionCalculatorWidget` → `CommissionCalculator`
- `RecurringTaskTemplates` → `SOPStore`
- `SpendPacingDashboard` → `SpendPacing`

All feature component names:

```
ABVariantLog  ActionItemTracker  AnalysisDeliverableLog  AnalysisPhaseTracker  ArchetypeFeatureTabs  AssessmentLog
AssetComplexityLog  AuditFindingLog  AuditTracker  AuditionLog  AutomationTracker  BOMTracker
BankImportModal  BiomarkerTracker  BookingTracker  BrandVault  BrandVoiceNotes  BudgetVsActualTracker
BugLog  BuildDeliveryLog  BuildLog  CATToolLog  CTALibrary  CampaignBudgetTracker
CampaignTracker  CancellationMonitor  CandidatePipeline  CaseTracker  ChainLog  ChannelLog
ClientFinancialSummary  ClientLoadMonitor  ClientProgressWidget  ClientSearchTracker  CollectionTracker  CommissionCalculator
CommissionCalculatorWidget  CommissionQueue  CommissionTOS  ComparableTracker  ComplexityTagger  ComplianceFrameworkLog
ComponentCount  ComponentInventory  ComputeCostLog  ConflictCheckLog  ConsultantLog  ContentCalendar
ContentTypeBreakdown  ContentTypeLibrary  CreativeRotationLog  CreditLog  CullingTracker  CurriculumTracker
CutTracker  DatasetLog  DatasetVersioning  DeadlineBoard  DeliverableFormatLog  DeliverableLog
DeliverableSpecs  DeliverableTracker  DeliveryTracker  DependencyTracker  DietaryAssessment  DocumentVersionLog
EquipmentInventory  EquipmentLog  ExperimentTracker  FabricationTracker  FeaturePrioritization  FeatureScopeBoard
FeedbackAggregator  FeedbackLog  FilingDeadlineCalendar  FittingLog  FoodDiaryReviews  FunnelTracker
GasTracker  Glossary  GuestList  HandoffChecklist  HypothesisBacklog  ImpactMeasurement
IncidentLog  InfraDashboard  IntakeFormStorage  JourneyMapBuilder  KanbanBoard  KanbanCard
KanbanCardModal  KanbanColumn  KeywordTracker  LanguagePairTracker  LedgerLog  LicensingTracker
ListingTracker  Lookbook  MealPlanBuilder  MetricSnapshot  ModelRegistry  MoodBoard
OutcomeNotes  PerformanceSnapshot  PhaseGateTracker  PhaseTracker.test  PhaseTracker  PlaceholderFeaturePanel
PlacementLog  PlatformLog  PlatformTracker  PostVolumeLog  PostingPerformanceNotes  ProInsights
ProductSpecBuilder  ProductionPhaseTracker  ProgramBuilder  ProgramTrackerWidget  ProgressReports  ProgressTracker
PrototypeLog  PrototypeTracker  PublicationLog  QALog  QualityLevelLog  ROICalculator
RateBenchmarking  RateCalculator  RecentInvoicesWidget  RecentTimeWidget  ReconciliationTracker  RecurringTaskTemplates
ReferenceBoard  RemediationTracker  RenderLog  ReportCadence  ReportLog  ResearchLog
ResourceAllocation  RetainerBurnDown  RetainerHealthScore  RetainerManager  RevisionCounter  RevisionSetLog
RevisionTracker  RoadmapView  RunOfShowBuilder  SLATracker  SOPStore  SatisfactionTrendWidget
ScopeAlert  ServiceBlueprint  SessionLog  SessionRecorderLog  ShootLog  ShotList
ShowingLog  SiteVisitLog  SmartContractRegistry  SoftwareSubscriptionTracker  SourcingLog  SpendPacing
SpendPacingDashboard  SprintBoard  StackLogger  StakeholderLog  StatusReportGenerator  StemTracker
StorageTracker  StudentRoster  StudioCostTracker  StyleGuide  StyleTagSystem  SubmissionTracker
SyncLicenseLog  TaskLog  TaxDeadlineCalendar  TaxPack  TimelineView  ToolComputeLog
UsabilityTestLog  VendorDirectory  VulnerabilityLog  WordCharacterCounter  WordTracker  YearSummary
```

Shared feature infra: `ArchetypeFeatureTabs.tsx` (injects panels/tabs per screen), `registry.ts` (name→lazy component map).

## 6. Utilities, hooks, helpers, services

### 6.1 Hooks (`src/hooks/`)

- `useAutoUpdater.ts` — useAutoUpdater, compareVersions
- `useFeatureGate.ts` — useFeatureGate, useTrialStatus

### 6.2 Library modules (`src/lib/`)

- `auth.ts` — auth
- `celebration.test.ts` — 
- `celebration.ts` — CelebrationKind, CelebrationLevel, celebrationLevel, recordCelebration, celebrationToast
- `commands.ts` — CommandRegistry, commands
- `constants.ts` — INVOICE_STATUS, InvoiceStatus, PROPOSAL_STATUS, ProposalStatus, CONTRACT_STATUS, ContractStatus, PROJECT_STATUS, ProjectStatus, FOLLOW_UP_STATUS, FollowUpStatus, FOLLOW_UP_INTERVALS, FOLLOW_UP_STAGES, COMMUNICATION_TYPE, CommunicationType, RECURRING_FREQUENCY, RecurringFrequency, PAYMENT_TERMS, CURRENCY_CODES, CurrencyCode, CURRENCY_SYMBOLS, THEME_IDS, ThemeId, ACHIEVEMENT_KEYS, AchievementKey, TIMING, DEFAULT_PAYMENT_TERMS, DEFAULT_CURRENCY, DEFAULT_FOLLOW_UP_SETTINGS, STORAGE_KEYS, ATTACHMENT_ENTITY_TYPE, AttachmentEntityType, RATE_TYPE, RateType, WRITING_STYLE, WritingStyle, DENSITY, Density, FOLLOW_UP_TEMPLATE_KEYS, FollowUpTemplateKey, SHARE_TOKEN_ENTITY_TYPE, BUILT_IN_TEMPLATE_NAMES, DASHBOARD_MAX_RECENT, DASHBOARD_MAX_FOLLOW_UPS, DASHBOARD_MAX_PORTAL_ACTIVITY, SEARCH_MAX_PER_GROUP, MAX_PREVIEW_ROWS, SPREADSHEET_EXTS, DOCUMENT_EXTS, IMAGE_EXTS, LICENSE_TIERS, LicenseTier, TRIAL, FEATURE_FLAGS, getFeatureFlags
- `currency.test.ts` — 
- `currency.ts` — CURRENCIES, getCurrencySymbol, CurrencyCode, defaultCurrency, getInvoiceCurrency, formatCurrency, sanitizeRates, normalizeRates, ratesCover, convertAmount, convertByCurrency
- `forecast.ts` — ForecastMonth, RevenueForecastItem, ExpenseForecastItem, CashFlowItem, ScenarioParams, ForecastMetrics, getNextMonths, getMonthKey, monthDiff, computeAvgMonthlyPaid, computeAvgMonthlyExpenses, computeAvgClientRevenue, computeRevenueForecast, computeExpenseForecast, computeCashFlow, applyScenario, computeForecastMetrics
- `heatmap.ts` — HeatmapCell, HourCell, DOWBar, StreakStats, MonthLabel, getDateKey, parseLocalDateKey, getIntensity, getIntensityColor, formatTooltip, computeHeatmapGrid, computeStreakStats, computeDayOfWeekBreakdown, computeHourOfDayHeatmap, getMaxHourCount, computeMonthLabels, computeProjectColor, getHoursLabel, formatHourLabel, INTENSITY_LEVELS, DOW_LABELS_SPARSE
- `mobileNav.ts` — setMobileNavOpen, useMobileNavOpen
- `prefs.test.ts` — 
- `prefs.ts` — MotionPref, ContrastPref, TextScalePref, Prefs, DEFAULT_PREFS, getPrefs, setPref, usePrefs
- `pricing.ts` — PRO_PRICES, TRIAL_DAYS
- `trial.test.ts` — 
- `trial.ts` — trialDaysRemaining
- `version.ts` — getRuntimeVersion

### 6.3 Utility modules (`src/utils/`)

- `backup.ts` — BackupEnvelope, ImportValidationResult, ImportResult, AutoBackupConfig, createExportEnvelope, validateImportEnvelope, BACKUP_TABLES, AttachmentBlob, ATTACHMENT_BLOB_TABLE, ATTACHMENT_BLOB_MAX_PER_FILE, ATTACHMENT_BLOB_MAX_TOTAL, MAX_IMPORT_MB, MAX_IMPORT_BYTES, BlobMaterializer, base64ToBytes, sanitizeBlobName, TABLE_INSERT_MAP, formatTableCounts
- `bankCsv.ts` — BankRow, BankColumnMap, detectBankColumns, parseBankDate, ParsedBankRow, parseBankRows, expenseFingerprint
- `changelog.ts` — ChangelogEntry, sanitizeChangelogItems, useChangelog
- `clientImport.ts` — CsvRow, CLIENT_FIELDS, NAME_PART_ALIASES, SOURCE_PRESETS, normalizeHeader, autoMapColumns, mapRowToClient
- `firstWin.ts` — maybeFirstSendMoment
- `followUpTemplates.ts` — DunningTone, resolveDunningTone, DEFAULT_TEMPLATES, TEMPLATE_LABELS, DEFAULT_SUBJECT_TEMPLATES, getTemplateKey, getStage, FollowUpDraftData, generateFollowUpDraft, generateSubjectLine, truncateForMailTo
- `format.ts` — DAY_MS, formatCurrency, parseDateString, todayLocalISO, formatDate, relativeDate, formatMonth
- `htmlToText.ts` — htmlToPlainText
- `invoiceNumber.ts` — generateInvoiceNumber, sanitizeInvoiceNumber, sanitizeFilenamePart
- `lateFees.ts` — LateFee, computeLateFee, lateFeeParagraph
- `paymentBehavior.ts` — PaymentRisk, PaymentBehavior, clientPaymentBehavior, RISK_LABEL
- `portalActivity.ts` — ProposalViews, parseViewCount, getProposalViews, snapshotOpens, detectNewOpens
- `proInsightsMath.ts` — ForecastMonth, Forecast, computeForecast, EffectiveRate, computeEffectiveRate, ClientWinRate, isProposalResolved, computeClientWinRates
- `proposalHeat.ts` — ProposalHeat, HeatInput, scoreProposalHeat, compareHeat
- `reconcile.ts` — MatchConfidence, InvoiceMatch, RowMatch, invoiceRemaining, suggestInvoiceMatches
- `recurringEngine.ts` — getNextDueDate, effectiveDueDate, shouldGenerate, countCyclesBehind, getCatchUpCount, shouldShowCatchUpWarning
- `retainerBurn.ts` — RetainerRow, BurnStatus, BurnResult, computeBurn, minutesByClient, currentMonthBounds
- `sanitize.ts` — sanitizeText, sanitizeSql, sanitizeInput, sanitizePhone, truncate, MAX_LENGTHS
- `searchRank.ts` — matchScore, rankSearch
- `seedData.ts` — seedSampleData
- `shortcuts.ts` — getShortcutModifierLabel, formatShortcutCombo
- `tauri.ts` — isTauri, isTauriSqlAvailable, isCheckoutConfigured
- `taxPack.ts` — TaxQuarter, TaxClientRow, TaxPack, taxPackYears, buildTaxPack, taxPackCsv, downloadTextFile
- `telemetry.ts` — TelemetryEventName, TelemetryEvent, recordTelemetry, getTelemetryEvents, clearTelemetry, eventCounts, CoachTipId, CoachContext, evaluateStruggle, markTipFired, wasTipFired
- `textToHtml.ts` — textToHtml, ensureHtml
- `trash.ts` — TrashEntry, TRASH_RETENTION_DAYS, trashLabel, loadTrash, pushTrashEntry, removeTrashEntry, clearTrash
- `trialValue.ts` — TrialValueKind, TrialValueEvent, TrialValueSummary, recordTrialValue, getTrialValue, resetTrialValue, ProRoi, computeProRoi
- `uuid.ts` — safeRandomUUID
- `weeklyDigest.ts` — WeeklyDigest, weekStart, weekKey, buildWeeklyDigest
- `yearSummary.ts` — YearQuarter, YearClientRow, YearSummary, yearSummaryYears, taxPackYears, buildYearSummary, buildTaxPack, yearSummaryCsv, taxPackCsv, downloadTextFile

### 6.4 Other domains

**achievements/**
- `checker.ts` — StoreState
- `index.ts` — AchievementKey, Achievement, ACHIEVEMENTS, getAchievementByKey
- `notify.ts` — 

**ai/**
- `index.ts` — 
- `proposalGenerator.ts` — ProposalInputs, ScopeWarning, checkScopeWarnings, generateProposalBody

**demo/**
- `AssetImg.tsx` — AssetImg
- `TestModeBanner.tsx` — TestModeBanner
- `TestModePanel.tsx` — TestModePanel
- `TrialBanner.tsx` — TrialBanner
- `VerifyPanel.tsx` — VerifyPanel
- `assetStore.ts` — IDB_PREFIX, useAssetSrc
- `importToolDraft.ts` — 
- `isDemo.ts` — isTrialBuild, hasTrialQuery, hasTrialPath, isTrial
- `storageProof.ts` — StorageEntry, trialStorageEntries, trialStorageBytes, formatBytes
- `testMode.ts` — TestModeState, loadTestMode, snapshotProfile, restoreProfileSnapshot, activateTestMode, deactivateTestMode
- `trialExport.ts` — trialHasUnportableFiles

**export/**
- `common.ts` — getProfileName
- `docx.ts` — 
- `index.ts` — exportProposalDOCX, exportInvoiceDOCX, exportContractDOCX
- `pdf.tsx` — ProposalPDF, InvoicePDF, ContractPDF

**import/**
- `classifier.ts` — classifySpreadsheet, classifyDocument, suggestColumnMapping, entityTypeLabel, getAvailableFields
- `index.ts` — ACCEPTED_EXTENSIONS_STRING, isFileSupported
- `mappers.ts` — mapToClients, mapToLineItems, mapToProjects, mapToExpenses, extractDocumentPrefill

**license/**
- `index.ts` — validateLicenseKeyFormat

**design/**
- `tokens.ts` — radii, spacing, typeScale, shadows, motion, Intensity, INTENSITY_DEFAULT

**tour/**
- `copy.ts` — speak, SpotlightStep, buildSteps
- `voice.ts` — VoiceFamily, VoiceTempo, FAMILY_TEMPO, ARCHETYPE_VOICE, DriveAxis, DRIVE_AXES, driveAxisFor, DriveSetting, loadDrive, saveDrive, ResolvedVoice, resolveVoice, TourStop, QuickAction, TourPlan, getTourPlan

## 7. State management (Zustand)

- Single store: `src/store/index.ts` (2,802 lines) — `useStore`, `AppStore`/`UnifiedStore`.
- Slices: `src/store/slices/base.ts` (startLoad/endLoad/setError), `meta.ts`, `toasts.ts`, `updater.ts`.
- Toast queue: `src/store/toastStore.ts` (`useToasts`).
- Updater state: `src/store/updaterStore.ts`.
- Entity CRUD stays in index.ts; cross-slice uses `get()` at call time.
- Store test files: financeSummary, licenseGrace, trialStart.

## 8. Archetypes

- 41 profession configs in `src/archetypes/*.ts` + `default.ts`, `custom.ts`, `registry.ts`, `types.ts`, `queries/index.ts`.
- Config-driven: metadata, dashboard metrics, sidebar order, insight panels, feature injections, proposal types, theme, shortcuts.
- `src/archetypes/queries/index.ts` — SQL-backed metric queries (~300+ lines) feeding insight panels.

## 9. Database & backend

- SQLite schema: 37 tables (see docs/ARCHITECTURE.md). Migrations inline in `src-tauri/src/db.rs`.
- Frontend DB layer: `src/db/index.ts` — browser-mode mock SQL over localStorage + `browserStoreTableNames`, `getCurrentSchemaVersion`.
- Rust commands: 15 modules under `src-tauri/src/commands/` (clients, projects, proposals, contracts, time, invoices, finance, communications, imports, metrics, follow_ups, sharing, mailto, archetypes, license, kanban).
- `src-tauri/src/server.rs` — Axum client portal (rate limits, lockout, ammonia sanitization).
- `src-tauri/src/error.rs` — LanceError.

## 10. Themes & design tokens

- `src/themes/themes.ts` — 7 themes (Default, Studio, Terminal, Craft, Motion, Lens, Scale) + applyTheme.
- `src/themes/index.ts` — ThemeId, Profession, PROFESSION_THEME.
- `src/design/tokens.ts` — radii, spacing, typeScale, shadows, motion, intensity.

## 11. Dependencies (package.json)

### Runtime dependencies

| Dependency | Why it's there |
|---|---|
| `@dnd-kit/core` | Drag-and-drop primitives for Kanban board |
| `@dnd-kit/sortable` | Sortable lists for Kanban columns/cards |
| `@dnd-kit/utilities` | DnD helper utilities |
| `@react-pdf/renderer` | PDF generation (proposals, invoices, contracts) |
| `@tauri-apps/api` | Tauri IPC (invoke) from frontend |
| `@tauri-apps/plugin-dialog` | Native open/save dialogs |
| `@tauri-apps/plugin-fs` | Filesystem access (attachments, backups) |
| `@tauri-apps/plugin-opener` | Open files/URLs with system handler |
| `@tauri-apps/plugin-process` | Quit/restart for updater |
| `@tauri-apps/plugin-shell` | Shell open (mailto etc.) |
| `@tauri-apps/plugin-sql` | SQLite frontend driver |
| `@tauri-apps/plugin-updater` | Auto-update checks |
| `@tiptap/core` | Rich-text editor core |
| `@tiptap/extension-placeholder` | Editor placeholder |
| `@tiptap/extension-typography` | Smart typography |
| `@tiptap/pm` | ProseMirror (transitive of TipTap) |
| `@tiptap/react` | React bindings for TipTap |
| `@tiptap/starter-kit` | TipTap starter extensions |
| `docx` | DOCX export |
| `lucide-react` | Icon set (line icons) |
| `mammoth` | DOCX parsing for import |
| `motion` | Animations (MotionConfig) |
| `pdfjs-dist` | PDF preview/parsing |
| `react` | UI framework |
| `react-dom` | React DOM renderer |
| `react-router-dom` | Client-side routing |
| `xlsx` | Spreadsheet import/export (SheetJS, vendored tarball) |
| `zustand` | State management |

### Dev dependencies

| Dependency | Why it's there |
|---|---|
| `@eslint/js` | ESLint base config |
| `@playwright/test` | E2E tests (playwright.config.ts) |
| `@tauri-apps/cli` | Tauri build/dev CLI |
| `@testing-library/jest-dom` | DOM matchers for vitest |
| `@testing-library/react` | Component testing |
| `@types/react` | React types |
| `@types/react-dom` | ReactDOM types |
| `@vitejs/plugin-react` | Vite React plugin |
| `autoprefixer` | PostCSS autoprefixer |
| `axe-core` | Accessibility gate (scripts/axe-gate.mjs) |
| `eslint` | Linting |
| `eslint-plugin-react-hooks` | Hooks lint rules |
| `eslint-plugin-react-refresh` | HMR lint rules |
| `jsdom` | DOM env for vitest |
| `postcss` | CSS processing |
| `prettier` | Formatting |
| `tailwindcss` | Utility CSS |
| `terser` | Minification |
| `typescript` | Type checking |
| `typescript-eslint` | TS eslint parser/rules |
| `vite` | Build tool |
| `vitest` | Unit tests |

### Lockfiles
- Both `package-lock.json` (npm) and `pnpm-lock.yaml` are present; `pnpm-workspace.yaml` declares a single package. Pick one package manager for contributors (recommend npm, since scripts use npm).

## 12. Tests

- Vitest config: `vitest.config.ts`. Setup: `src/test/setup.ts`.
- Test files: 68 (co-located *.test.ts/tsx under src).
- E2E: `e2e/`, Playwright config `playwright.config.ts`.
- One pre-existing failure: `licenseGrace` (unrelated, do not weaken).

## 13. Flags — dead code

- `src/components/features/PlaceholderFeaturePanel.tsx` — unused (no references).
- `src/components/features/TaxDeadlineCalendar.tsx` — unused (no references).
- `src/components/features/CommissionCalculatorWidget.tsx` — unused alias.
- `src/hooks/useFeatureGate.ts` — `useFeatureGate`/`useTrialStatus` unused.
- Alias wrappers that exist only for registry name resolution: `AuditTracker`, `CATToolLog`, `RecurringTaskTemplates`, `SpendPacingDashboard` (keep only if referenced by archetype configs).
- `src/ai/index.ts` is a v1 stub (`queryLocalAI` returns '') but is wired into `AIBar.tsx`; keep gated behind `ai_enabled` flag (default false).
- `src/store/updaterStore.ts` and `src/store/toastStore.ts` duplicate state surfaces alongside slices; verify consolidation (Constitution: one store).

## 14. Flags — duplicated logic

- Currency formatting: `utils/format.ts` defines `formatCurrency`, while `archetypes/queries/index.ts` defines its own local `formatCurrency`. Consolidate to the shared one.
- Currency lists duplicated: `screens/settings/shared.tsx` and `screens/invoices/shared.tsx` both export `currencies = ['CAD','USD','EUR','GBP','AUD']`. Also `screens/finance/shared.tsx`.
- Default currency `'CAD'` hardcoded in ~40 sites instead of `DEFAULT_CURRENCY` from `lib/constants.ts`.
- Status/enum constants exist in `lib/constants.ts` (INVOICE_STATUS etc.) but many screens use string literals.
- `yearSummary.ts` and `taxPack.ts` both export `buildTaxPack`/`taxPackCsv`/`downloadTextFile` — likely copy-paste duplication; verify.

## 15. Flags — hardcoded values that should be config/constants

- Default currency `'CAD'` (use `DEFAULT_CURRENCY`).
- Currency list (use a single `CURRENCIES` constant).
- Paddle price IDs and license worker URL baked via env (`.env.example`); `.env.local` contains live values — ensure not committed (it is gitignored).
- Tauri updater endpoint & pubkey in `tauri.conf.json` (expected for updater, but document).
- Trial length `TRIAL_DAYS` in `lib/pricing.ts`; verify single source.
- Magic numbers for pagination (`DASHBOARD_MAX_RECENT` etc.) already in constants — good; audit screens for raw literals.
- Color hex values in themes (acceptable, but ensure all via theme tokens).

## 16. Flags — embarrassing if opened tomorrow

- `src/App.tsx` is 2,021 lines; `src/store/index.ts` is 2,802 lines; `src/db/index.ts` is ~1,700 lines. Splitting is partially done via slices but entity CRUD remains monolithic.
- `console.log` statements in production code (`store/index.ts` license flow, `ai/index.ts`).
- 187 feature components, many are thin aliases; high surface area for a small core team.
- 37 database tables for archetype-specific trackers; schema is large but indexed.
- Both npm and pnpm lockfiles; unclear canonical package manager.
- Docs overstate component counts (ARCHITECTURE.md says 21 ui components; actual 47).
- `src/components/ui/emptyCopy.ts`, `useVisibleList.tsx` etc. are helpers mixed into ui folder.
- `.DS_Store` files present in repo working tree (gitignored, but cleanup).
- `qa-shots/`, `dist/`, `.playwright-mcp/` untracked artifacts in working tree; ensure gitignored (they are).
- LANCE_V2_AUDIT.md (34KB) and LANCE_V2... suggests unfinished migration; review before open-sourcing.

## 17. Open-source readiness checklist

- [ ] Add LICENSE file at root (LICENSE.md exists but confirm OSS license choice).
- [ ] CONTRIBUTING.md exists; verify build instructions work on clean clone (`npm install && npm run tauri dev`).
- [ ] Remove console.logs; gate debug behind env.
- [ ] Pick one package manager; delete the other lockfile.
- [ ] Document required Rust toolchain + platform deps (DEVELOPMENT.md covers).
- [ ] Provide `.env.example` without live Paddle IDs? Currently contains live catalog IDs (public, ok) but checkout URL empty.
- [ ] Add a top-level `ARCHITECTURE.md` link in README (exists in docs/).
- [ ] Run `npm run build`, `npm run lint`, `npm run test` green (one pre-existing failure).
- [ ] Rust: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`.
- [ ] Remove or document trial/demo code paths if not intended for OSS.

## Appendix A — Feature component names

```
ABVariantLog, ActionItemTracker, AnalysisDeliverableLog, AnalysisPhaseTracker, ArchetypeFeatureTabs, AssessmentLog, AssetComplexityLog, AuditFindingLog, AuditTracker, AuditionLog, AutomationTracker, BOMTracker, BankImportModal, BiomarkerTracker, BookingTracker, BrandVault, BrandVoiceNotes, BudgetVsActualTracker, BugLog, BuildDeliveryLog, BuildLog, CATToolLog, CTALibrary, CampaignBudgetTracker, CampaignTracker, CancellationMonitor, CandidatePipeline, CaseTracker, ChainLog, ChannelLog, ClientFinancialSummary, ClientLoadMonitor, ClientProgressWidget, ClientSearchTracker, CollectionTracker, CommissionCalculator, CommissionCalculatorWidget, CommissionQueue, CommissionTOS, ComparableTracker, ComplexityTagger, ComplianceFrameworkLog, ComponentCount, ComponentInventory, ComputeCostLog, ConflictCheckLog, ConsultantLog, ContentCalendar, ContentTypeBreakdown, ContentTypeLibrary, CreativeRotationLog, CreditLog, CullingTracker, CurriculumTracker, CutTracker, DatasetLog, DatasetVersioning, DeadlineBoard, DeliverableFormatLog, DeliverableLog, DeliverableSpecs, DeliverableTracker, DeliveryTracker, DependencyTracker, DietaryAssessment, DocumentVersionLog, EquipmentInventory, EquipmentLog, ExperimentTracker, FabricationTracker, FeaturePrioritization, FeatureScopeBoard, FeedbackAggregator, FeedbackLog, FilingDeadlineCalendar, FittingLog, FoodDiaryReviews, FunnelTracker, GasTracker, Glossary, GuestList, HandoffChecklist, HypothesisBacklog, ImpactMeasurement, IncidentLog, InfraDashboard, IntakeFormStorage, JourneyMapBuilder, KanbanBoard, KanbanCard, KanbanCardModal, KanbanColumn, KeywordTracker, LanguagePairTracker, LedgerLog, LicensingTracker, ListingTracker, Lookbook, MealPlanBuilder, MetricSnapshot, ModelRegistry, MoodBoard, OutcomeNotes, PerformanceSnapshot, PhaseGateTracker, PhaseTracker.test, PhaseTracker, PlaceholderFeaturePanel, PlacementLog, PlatformLog, PlatformTracker, PostVolumeLog, PostingPerformanceNotes, ProInsights, ProductSpecBuilder, ProductionPhaseTracker, ProgramBuilder, ProgramTrackerWidget, ProgressReports, ProgressTracker, PrototypeLog, PrototypeTracker, PublicationLog, QALog, QualityLevelLog, ROICalculator, RateBenchmarking, RateCalculator, RecentInvoicesWidget, RecentTimeWidget, ReconciliationTracker, RecurringTaskTemplates, ReferenceBoard, RemediationTracker, RenderLog, ReportCadence, ReportLog, ResearchLog, ResourceAllocation, RetainerBurnDown, RetainerHealthScore, RetainerManager, RevisionCounter, RevisionSetLog, RevisionTracker, RoadmapView, RunOfShowBuilder, SLATracker, SOPStore, SatisfactionTrendWidget, ScopeAlert, ServiceBlueprint, SessionLog, SessionRecorderLog, ShootLog, ShotList, ShowingLog, SiteVisitLog, SmartContractRegistry, SoftwareSubscriptionTracker, SourcingLog, SpendPacing, SpendPacingDashboard, SprintBoard, StackLogger, StakeholderLog, StatusReportGenerator, StemTracker, StorageTracker, StudentRoster, StudioCostTracker, StyleGuide, StyleTagSystem, SubmissionTracker, SyncLicenseLog, TaskLog, TaxDeadlineCalendar, TaxPack, TimelineView, ToolComputeLog, UsabilityTestLog, VendorDirectory, VulnerabilityLog, WordCharacterCounter, WordTracker, YearSummary
```

## Appendix B — Utility module exports

### `src/utils/backup.ts`

BackupEnvelope, ImportValidationResult, ImportResult, AutoBackupConfig, createExportEnvelope, validateImportEnvelope, BACKUP_TABLES, AttachmentBlob, ATTACHMENT_BLOB_TABLE, ATTACHMENT_BLOB_MAX_PER_FILE, ATTACHMENT_BLOB_MAX_TOTAL, MAX_IMPORT_MB, MAX_IMPORT_BYTES, BlobMaterializer, base64ToBytes, sanitizeBlobName, TABLE_INSERT_MAP, formatTableCounts

### `src/utils/bankCsv.ts`

BankRow, BankColumnMap, detectBankColumns, parseBankDate, ParsedBankRow, parseBankRows, expenseFingerprint

### `src/utils/changelog.ts`

ChangelogEntry, sanitizeChangelogItems, useChangelog

### `src/utils/clientImport.ts`

CsvRow, CLIENT_FIELDS, NAME_PART_ALIASES, SOURCE_PRESETS, normalizeHeader, autoMapColumns, mapRowToClient

### `src/utils/firstWin.ts`

maybeFirstSendMoment

### `src/utils/followUpTemplates.ts`

DunningTone, resolveDunningTone, DEFAULT_TEMPLATES, TEMPLATE_LABELS, DEFAULT_SUBJECT_TEMPLATES, getTemplateKey, getStage, FollowUpDraftData, generateFollowUpDraft, generateSubjectLine, truncateForMailTo

### `src/utils/format.ts`

DAY_MS, formatCurrency, parseDateString, todayLocalISO, formatDate, relativeDate, formatMonth

### `src/utils/htmlToText.ts`

htmlToPlainText

### `src/utils/invoiceNumber.ts`

generateInvoiceNumber, sanitizeInvoiceNumber, sanitizeFilenamePart

### `src/utils/lateFees.ts`

LateFee, computeLateFee, lateFeeParagraph

### `src/utils/paymentBehavior.ts`

PaymentRisk, PaymentBehavior, clientPaymentBehavior, RISK_LABEL

### `src/utils/portalActivity.ts`

ProposalViews, parseViewCount, getProposalViews, snapshotOpens, detectNewOpens

### `src/utils/proInsightsMath.ts`

ForecastMonth, Forecast, computeForecast, EffectiveRate, computeEffectiveRate, ClientWinRate, isProposalResolved, computeClientWinRates

### `src/utils/proposalHeat.ts`

ProposalHeat, HeatInput, scoreProposalHeat, compareHeat

### `src/utils/reconcile.ts`

MatchConfidence, InvoiceMatch, RowMatch, invoiceRemaining, suggestInvoiceMatches

### `src/utils/recurringEngine.ts`

getNextDueDate, effectiveDueDate, shouldGenerate, countCyclesBehind, getCatchUpCount, shouldShowCatchUpWarning

### `src/utils/retainerBurn.ts`

RetainerRow, BurnStatus, BurnResult, computeBurn, minutesByClient, currentMonthBounds

### `src/utils/sanitize.ts`

sanitizeText, sanitizeSql, sanitizeInput, sanitizePhone, truncate, MAX_LENGTHS

### `src/utils/searchRank.ts`

matchScore, rankSearch

### `src/utils/seedData.ts`

seedSampleData

### `src/utils/shortcuts.ts`

getShortcutModifierLabel, formatShortcutCombo

### `src/utils/tauri.ts`

isTauri, isTauriSqlAvailable, isCheckoutConfigured

### `src/utils/taxPack.ts`

TaxQuarter, TaxClientRow, TaxPack, taxPackYears, buildTaxPack, taxPackCsv, downloadTextFile

### `src/utils/telemetry.ts`

TelemetryEventName, TelemetryEvent, recordTelemetry, getTelemetryEvents, clearTelemetry, eventCounts, CoachTipId, CoachContext, evaluateStruggle, markTipFired, wasTipFired

### `src/utils/textToHtml.ts`

textToHtml, ensureHtml

### `src/utils/trash.ts`

TrashEntry, TRASH_RETENTION_DAYS, trashLabel, loadTrash, pushTrashEntry, removeTrashEntry, clearTrash

### `src/utils/trialValue.ts`

TrialValueKind, TrialValueEvent, TrialValueSummary, recordTrialValue, getTrialValue, resetTrialValue, ProRoi, computeProRoi

### `src/utils/uuid.ts`

safeRandomUUID

### `src/utils/weeklyDigest.ts`

WeeklyDigest, weekStart, weekKey, buildWeeklyDigest

### `src/utils/yearSummary.ts`

YearQuarter, YearClientRow, YearSummary, yearSummaryYears, taxPackYears, buildYearSummary, buildTaxPack, yearSummaryCsv, taxPackCsv, downloadTextFile

## Appendix C — UI component exports

- `src/components/ui/Badge.tsx`: Badge
- `src/components/ui/BrandLogo.tsx`: BrandLogo
- `src/components/ui/Button.tsx`: Button
- `src/components/ui/Card.tsx`: Card
- `src/components/ui/ClientImportModal.test.tsx`: 
- `src/components/ui/ClientImportModal.tsx`: ClientImportModal
- `src/components/ui/ClientSelect.tsx`: ClientSelect
- `src/components/ui/ColumnMapper.tsx`: ColumnMapper
- `src/components/ui/CommandPalette.tsx`: CommandPalette
- `src/components/ui/ConfirmDialog.tsx`: ConfirmDialog
- `src/components/ui/DocPreview.tsx`: DocLine, DocTotal, DocPreview
- `src/components/ui/DropZoneOverlay.tsx`: DropZoneOverlay
- `src/components/ui/EmptyState.tsx`: EmptyState
- `src/components/ui/ErrorBoundary.tsx`: ErrorBoundary
- `src/components/ui/ImportModal.tsx`: tallyImport, ImportModal
- `src/components/ui/LoadError.test.tsx`: 
- `src/components/ui/LoadError.tsx`: LoadError
- `src/components/ui/MetricCard.tsx`: MetricCard
- `src/components/ui/Modal.tsx`: Modal
- `src/components/ui/MoneyFlow.tsx`: loadSetAsidePct, MoneyFlow
- `src/components/ui/OnboardingComfort.tsx`: OnboardingComfort
- `src/components/ui/PrefToggle.tsx`: PrefToggle
- `src/components/ui/ProWelcome.tsx`: ProWelcome
- `src/components/ui/ProgressBar.tsx`: ProgressBar
- `src/components/ui/QuickTimeLogModal.tsx`: QuickTimeLogModal
- `src/components/ui/RecordTracker.tsx`: RecordTracker
- `src/components/ui/RichEditor.tsx`: RichEditor
- `src/components/ui/RunwayScrubber.tsx`: RunwayScrubber
- `src/components/ui/ShortcutsModal.tsx`: ShortcutsModal
- `src/components/ui/Skeleton.tsx`: SkeletonVariant, Skeleton
- `src/components/ui/Sparkline.tsx`: Sparkline
- `src/components/ui/SplashScreen.tsx`: SplashScreen
- `src/components/ui/SpotlightTour.tsx`: SpotlightTour
- `src/components/ui/SyncChip.tsx`: SyncChip
- `src/components/ui/Timeline.tsx`: TimelineKind, TimelineItem, Timeline
- `src/components/ui/TimerRing.tsx`: TimerRing
- `src/components/ui/Toast.tsx`: ToastContainer
- `src/components/ui/TodayQueue.tsx`: TodayQueue
- `src/components/ui/UpdaterModal.tsx`: UpdaterModal
- `src/components/ui/UpgradeModal.test.tsx`: 
- `src/components/ui/UpgradeModal.tsx`: UpgradeModal
- `src/components/ui/Walkthrough.tsx`: Walkthrough
- `src/components/ui/WeekView.tsx`: WeekView
- `src/components/ui/useVisibleList.tsx`: useVisibleList, MoreRows
