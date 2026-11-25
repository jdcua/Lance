/**
 * ImportModal · Multi-step import wizard.
 * Step 1: Drop zone + file picker
 * Step 2: Scanning progress
 * Step 3: Review · per-file preview with column mapping
 * Step 4: Confirm summary
 * Step 5: Complete
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import ColumnMapper from './ColumnMapper';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Image,
  X,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  File,
  EyeOff,
  Info,
} from 'lucide-react';
import type { ImportDetection, DetectedEntityType } from '../../types';
import { processImportFiles, ACCEPTED_EXTENSIONS_STRING } from '../../import';
import { entityTypeLabel } from '../../import/classifier';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';

/**
 * A processed file counts as imported only if it created records.
 * Zero-record results (spreadsheet with no mappable rows, unknown entity)
 * are skipped — history and toasts must not claim work that never happened.
 * Exported for tests.
 */
export function tallyImport(
  created: number,
  tally: { imported: number; skipped: number },
): 'imported' | 'skipped' {
  if (created > 0) {
    tally.imported++;
    return 'imported';
  }
  tally.skipped++;
  return 'skipped';
}

function effectiveEntityType(detection: ImportDetection): DetectedEntityType {
  return detection.userOverride || detection.detectedEntity;
}

function landsInLibrary(detection: ImportDetection, effectiveType: DetectedEntityType): boolean {
  return detection.fileType === 'image' || effectiveType === 'attachment' || effectiveType === 'unknown';
}

function pluralSuffix(count: number): string {
  return count !== 1 ? 's' : '';
}

type ClientLike = { id: string; name?: string; email?: string };

function resolveClientId(
  list: ClientLike[],
  opts: { clientName?: string; email?: string; fallbackId?: string },
): string {
  if (opts.email) {
    const matched = list.find(c => (c.email || '').toLowerCase() === opts.email!.toLowerCase());
    if (matched) return matched.id;
  } else if (opts.clientName) {
    const matched = list.find(c => (c.name || '').toLowerCase() === opts.clientName!.toLowerCase());
    if (matched) return matched.id;
  }
  return opts.fallbackId || list[0]?.id || '_unknown';
}

async function addMany<T>(items: T[], add: (item: T) => Promise<unknown>): Promise<number> {
  for (const item of items) {
    await add(item);
  }
  return items.length;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  initialFiles?: File[];
}

type Step = 1 | 2 | 3 | 4 | 5;

const ICONS_BY_FILETYPE: Record<string, typeof FileSpreadsheet> = {
  spreadsheet: FileSpreadsheet,
  document: FileText,
  image: Image,
};

function fileIcon(fileType: string) {
  const Icon = ICONS_BY_FILETYPE[fileType] || File;
  return Icon;
}

function confidenceClass(confidence: number, dark: boolean): string {
  if (confidence >= 0.7) return 'bg-[var(--accent-bg)] text-[var(--accent-ink,var(--accent))]';
  if (confidence >= 0.3) {
    return dark
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
      : 'bg-[var(--medium-conf-bg)] text-[var(--medium-conf-text)]';
  }
  return 'bg-[var(--danger-bg)] text-[var(--danger)]';
}

function StepDots({ step, importing }: { step: Step; importing: boolean }) {
  return (
    <div className="flex justify-center gap-2 mb-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${
            s < step ? 'bg-[var(--accent)]' :
            s === step ? 'bg-[var(--accent)] scale-125' :
            'bg-[var(--border-color)]'
          } ${importing && s === 4 ? 'animate-pulse' : ''}`}
        />
      ))}
    </div>
  );
}

function DropZoneStep({
  importHistory,
  onFilesSelected,
  onClose,
  fileInputRef,
}: {
  importHistory: { id: string; filename: string; status: string }[];
  onFilesSelected: (files: File[]) => void;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-[var(--border-color)] rounded-[12px] p-10 text-center hover:border-[var(--accent)]/40 transition-colors cursor-pointer bg-[var(--bg-secondary)]/30"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drop-zone-active'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drop-zone-active')}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drop-zone-active');
          onFilesSelected(Array.from(e.dataTransfer.files));
        }}
      >
        <Upload size={40} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-primary)] font-medium mb-1">Drop files here or click to browse</p>
        <p className="text-xs text-[var(--text-tertiary)]">.xlsx, .csv, .pdf, .docx, .doc, .png, .jpg, .jpeg</p>
        <p className="text-[10px] text-[var(--text-tertiary)]/60">
          Spreadsheets &amp; documents are parsed for data. Images are saved as attachments.
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS_STRING}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
      </div>
      {importHistory.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-color)]">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-2">Recent imports ({importHistory.length})</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {importHistory.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-xs hover:bg-[var(--bg-secondary)]">
                <span className="truncate text-[var(--text-secondary)]" title={h.filename}>{h.filename}</span>
                <span className={`flex-shrink-0 ml-2 text-[10px] font-medium ${
                  h.status === 'imported' ? 'text-[var(--accent-ink,var(--accent))]'
                  : h.status === 'error' ? 'text-[var(--danger)]'
                  : 'text-[var(--text-tertiary)]'
                }`}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScanningStep({ scanProgress }: { scanProgress: { current: number; total: number; filename: string } }) {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[var(--accent-ink,var(--accent))]" />
        <p className="text-sm text-[var(--text-primary)] font-medium">Scanning files...</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{scanProgress.current} of {scanProgress.total}</p>
        {scanProgress.filename && (
          <p className="text-xs text-[var(--text-secondary)] mt-2 truncate max-w-[300px] mx-auto">
            Analyzing {scanProgress.filename}
          </p>
        )}
      </div>
      <div className="w-full h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-colors duration-300 ease-out rounded-full"
          style={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

function DetectionTabs({
  detections,
  reviewIndex,
  onSelect,
}: {
  detections: ImportDetection[];
  reviewIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {detections.map((d, i) => {
        const Icon = fileIcon(d.fileType);
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs transition-colors flex-shrink-0 ${
              i === reviewIndex
                ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] border border-[var(--accent)]/30'
                : d.skipped
                ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] line-through border border-transparent'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <Icon size={12} />
            <span className="max-w-[100px] truncate">{d.file.name}</span>
            {d.skipped && <EyeOff size={10} className="ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

function DetectionHeader({
  detection,
  onSkip,
  onUnskip,
}: {
  detection: ImportDetection;
  onSkip: () => void;
  onUnskip: () => void;
}) {
  const Icon = fileIcon(detection.fileType);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-[var(--accent-ink,var(--accent))]" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{detection.file.name}</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {(detection.file.size / 1024).toFixed(1)} KB &middot; {detection.preview.summary}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {detection.fileType !== 'image' && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${confidenceClass(detection.confidence, false)}`}>
            {Math.round(detection.confidence * 100)}% confidence
          </span>
        )}
        <Button variant={detection.skipped ? 'secondary' : 'ghost'} size="sm" onClick={detection.skipped ? onUnskip : onSkip}>
          {detection.skipped ? 'Unskip' : 'Skip'}
        </Button>
      </div>
    </div>
  );
}

function EntityOverride({
  detection,
  onOverride,
}: {
  detection: ImportDetection;
  onOverride: (type: DetectedEntityType) => void;
}) {
  return (
    <div className="p-3 rounded-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Detected as:</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceClass(detection.confidence, true)}`}>
          {entityTypeLabel(detection.detectedEntity)}
        </span>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-[var(--text-accent)] mb-1.5 block">Change:</label>
        <select aria-label="Currentdetection.useroverride || currentdetection.detectedentity"
          value={detection.userOverride || detection.detectedEntity}
          onChange={(e) => onOverride(e.target.value as DetectedEntityType)}
          className="w-full px-3 py-2 text-sm border-2 border-[var(--border-color)] rounded-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 font-medium"
        >
          {(['client_list', 'project_list', 'invoice', 'expense_list', 'contract', 'proposal', 'financial_data', 'attachment', 'unknown'] as DetectedEntityType[]).map(t => (
            <option key={t} value={t}>{entityTypeLabel(t)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DocumentPreview({ detection }: { detection: ImportDetection }) {
  return (
    <div className="space-y-3">
      {detection.preview.extractedFields && Object.keys(detection.preview.extractedFields).length > 0 && (
        <div>
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium mb-2 block">Extracted Fields</span>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(detection.preview.extractedFields).map(([key, value]) => (
              <div key={key} className="bg-[var(--bg-secondary)] rounded-xs px-3 py-1.5">
                <span className="text-[10px] text-[var(--text-tertiary)] block">{key.replace(/_/g, ' ')}</span>
                <span className="text-xs text-[var(--text-primary)] truncate block">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {detection.preview.extractedLineItems && detection.preview.extractedLineItems.length > 0 && (
        <div>
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium mb-2 block">
            Detected Line Items ({detection.preview.extractedLineItems.length})
          </span>
          <div className="border border-[var(--border-color)] rounded-sm overflow-x-auto">
            <table className="data-table w-full text-xs">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th scope="col" className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)]">Description</th>
                  <th scope="col" className="px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-secondary)]">Qty</th>
                  <th scope="col" className="px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-secondary)]">Price</th>
                  <th scope="col" className="px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-secondary)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {detection.preview.extractedLineItems.map((item, li) => (
                  <tr key={li} className="border-t border-[var(--border-color)]/50">
                    <td className="px-3 py-1 text-[var(--text-primary)] truncate max-w-[200px]">{item.description}</td>
                    <td className="px-3 py-1 text-right text-[var(--text-secondary)]">{item.quantity}</td>
                    <td className="px-3 py-1 text-right text-[var(--text-secondary)]">${item.unit_price.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right text-[var(--text-primary)] font-medium">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {detection.preview.rawText && (
        <details className="mt-2">
          <summary className="text-[10px] text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">View raw text</summary>
          <pre className="mt-1 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-xs p-3 max-h-[150px] overflow-y-auto whitespace-pre-wrap font-mono">
            {detection.preview.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}

function ImagePreview({ detection }: { detection: ImportDetection }) {
  return (
    <div className="flex gap-4 items-start">
      <img
        src={detection.preview.imageDataUrl}
        alt={detection.file.name}
        className="rounded-sm border border-[var(--border-color)] max-w-[200px] max-h-[200px] object-contain bg-[var(--bg-secondary)]"
      />
      <div className="text-xs text-[var(--text-secondary)] space-y-1">
        <p>{detection.file.name}</p>
        <p>{(detection.file.size / (1024 * 1024)).toFixed(2)} MB</p>
        {detection.preview.imageDimensions && (
          <p>{detection.preview.imageDimensions.width} x {detection.preview.imageDimensions.height}px</p>
        )}
        <p className="text-[var(--text-tertiary)]">Will be saved as attachment</p>
      </div>
    </div>
  );
}

function ReviewNavigation({
  reviewIndex,
  detections,
  onPrev,
  onNext,
  onImport,
}: {
  reviewIndex: number;
  detections: ImportDetection[];
  onPrev: () => void;
  onNext: () => void;
  onImport: () => void;
}) {
  const activeCount = detections.filter(d => !d.skipped).length;
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onPrev} disabled={reviewIndex === 0}>
          <ArrowLeft size={14} /> Previous
        </Button>
        <span className="text-xs text-[var(--text-tertiary)]">{reviewIndex + 1} of {detections.length}</span>
        <Button variant="ghost" size="sm" onClick={onNext} disabled={reviewIndex === detections.length - 1}>
          Next <ArrowRight size={14} />
        </Button>
      </div>
      <Button size="sm" onClick={onImport} disabled={activeCount === 0}>
        Import {activeCount} file{activeCount !== 1 ? 's' : ''} <ArrowRight size={14} />
      </Button>
    </div>
  );
}

function ReviewStep({
  detections,
  reviewIndex,
  classificationBannerDismissed,
  onDismissBanner,
  onSelect,
  onOverride,
  onUpdateMapping,
  onSkip,
  onUnskip,
  onPrev,
  onNext,
  onImport,
}: {
  detections: ImportDetection[];
  reviewIndex: number;
  classificationBannerDismissed: boolean;
  onDismissBanner: () => void;
  onSelect: (index: number) => void;
  onOverride: (index: number, type: DetectedEntityType) => void;
  onUpdateMapping: (index: number, mapping: Record<string, string>) => void;
  onSkip: (index: number) => void;
  onUnskip: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onImport: () => void;
}) {
  const current = detections[reviewIndex];
  return (
    <div className="space-y-4">
      {!classificationBannerDismissed && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Info size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">Classification is a suggestion</p>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
              Lance guessed the type of each file based on its content. Always review before importing, especially for financial documents.
            </p>
          </div>
          <button onClick={onDismissBanner} className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex-shrink-0 font-medium">
            Got it
            <X size={12} />
          </button>
        </div>
      )}
      <DetectionTabs detections={detections} reviewIndex={reviewIndex} onSelect={onSelect} />
      {current && (
        <div className="border border-[var(--border-color)] rounded-[12px] p-4 space-y-4">
          <DetectionHeader detection={current} onSkip={() => onSkip(reviewIndex)} onUnskip={() => onUnskip(reviewIndex)} />
          {!current.skipped && (
            <>
              {current.fileType !== 'image' && <EntityOverride detection={current} onOverride={(type) => onOverride(reviewIndex, type)} />}
              {current.fileType === 'spreadsheet' && current.preview.headers && current.preview.rows && (
                <ColumnMapper
                  headers={current.preview.headers}
                  columnMapping={current.columnMapping || {}}
                  entityType={current.userOverride || current.detectedEntity}
                  previewRows={current.preview.rows}
                  onChange={(mapping) => onUpdateMapping(reviewIndex, mapping)}
                />
              )}
              {current.fileType === 'document' && <DocumentPreview detection={current} />}
              {current.fileType === 'image' && current.preview.imageDataUrl && <ImagePreview detection={current} />}
            </>
          )}
          {current.skipped && (
            <div className="text-center py-4 text-sm text-[var(--text-tertiary)]">This file will be skipped during import.</div>
          )}
        </div>
      )}
      <ReviewNavigation reviewIndex={reviewIndex} detections={detections} onPrev={onPrev} onNext={onNext} onImport={onImport} />
    </div>
  );
}

function ImportingStep({ count }: { count: number }) {
  return (
    <div className="space-y-4 text-center py-6">
      <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[var(--accent-ink,var(--accent))]" />
      <p className="text-sm text-[var(--text-primary)] font-medium">
        Importing {count} file{count !== 1 ? 's' : ''}...
      </p>
      <p className="text-xs text-[var(--text-tertiary)]">Creating Lance entities from your files</p>
    </div>
  );
}

function CompleteStep({
  importedCount,
  skipCount,
  errorCount,
  onClose,
}: {
  importedCount: number;
  skipCount: number;
  errorCount: number;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 text-center py-6">
      <div className="w-14 h-14 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mx-auto mb-3">
        <Check size={28} className="text-[var(--accent-ink,var(--accent))]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Import Complete</h3>
      <div className="flex justify-center gap-6 text-xs">
        {importedCount > 0 && (
          <div className="text-center">
            <span className="block text-lg font-semibold text-[var(--accent-ink,var(--accent))]">{importedCount}</span>
            <span className="text-[var(--text-tertiary)]">Imported</span>
          </div>
        )}
        {skipCount > 0 && (
          <div className="text-center">
            <span className="block text-lg font-semibold text-[var(--text-tertiary)]">{skipCount}</span>
            <span className="text-[var(--text-tertiary)]">Skipped</span>
          </div>
        )}
        {errorCount > 0 && (
          <div className="text-center">
            <span className="block text-lg font-semibold text-[var(--danger)]">{errorCount}</span>
            <span className="text-[var(--text-tertiary)]">Failed</span>
          </div>
        )}
      </div>
      <Button onClick={onClose} size="sm">Done</Button>
    </div>
  );
}

export default function ImportModal({ open, onClose, initialFiles }: ImportModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [, setFiles] = useState<File[]>([]);
  const [detections, setDetections] = useState<ImportDetection[]>([]);
  const [, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, filename: '' });
  const [reviewIndex, setReviewIndex] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [classificationBannerDismissed, setClassificationBannerDismissed] = useState(
    sessionStorage.getItem('lance:import-classification-banner') === 'true'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    saveImportFile, saveAssetFile, logImport,
    addClient, addProject, addInvoice, addExpense, addAttachment,
    addProposal, addContract,
    clients, loadClients,
    importHistory, loadImportHistory,
  } = useStore();
  const addToast = useToasts((s) => s.add);

  const reset = useCallback(() => {
    setStep(1);
    setFiles([]);
    setDetections([]);
    setScanning(false);
    setScanProgress({ current: 0, total: 0, filename: '' });
    setReviewIndex(0);
    setImporting(false);
    setImportedCount(0);
    setSkipCount(0);
    setErrorCount(0);
  }, []);

  const startScan = useCallback(async (fileList: File[]) => {
    setStep(2);
    setScanning(true);
    setScanProgress({ current: 0, total: fileList.length, filename: '' });

    try {
      const results = await processImportFiles(fileList, (current, total, filename) => {
        setScanProgress({ current, total, filename });
      });
      setDetections(results);
      setStep(3);
      setReviewIndex(0);
    } catch (err) {
      addToast(`Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setStep(1);
    } finally {
      setScanning(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
      startScan(initialFiles);
    }
    if (open) {
      loadImportHistory().catch(() => { /* history is best-effort */ });
    }
  }, [open, initialFiles, startScan, loadImportHistory]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setFiles(newFiles);
    startScan(newFiles);
  }, [startScan]);

  const handleOverrideType = (index: number, type: DetectedEntityType) => {
    setDetections(prev => prev.map((d, i) =>
      i === index ? { ...d, userOverride: type } : d
    ));
  };

  const handleUpdateMapping = (index: number, mapping: Record<string, string>) => {
    setDetections(prev => prev.map((d, i) =>
      i === index ? { ...d, columnMapping: mapping } : d
    ));
  };

  const handleSkip = (index: number) => {
    setDetections(prev => prev.map((d, i) =>
      i === index ? { ...d, skipped: true } : d
    ));
  };

  const handleUnskip = (index: number) => {
    setDetections(prev => prev.map((d, i) =>
      i === index ? { ...d, skipped: false } : d
    ));
  };

  const handleImport = async () => {
    setStep(4);
    setImporting(true);
    const tally = { imported: 0, skipped: skipCount };
    let errors = 0;

    const active = detections.filter(d => !d.skipped);

    for (const detection of active) {
      try {
        const effectiveType = effectiveEntityType(detection);
        const isUnclassified = effectiveType === 'unknown';
        const landingInLibrary = landsInLibrary(detection, effectiveType);

        const filePath = landingInLibrary
          ? await saveAssetFile(detection.file)
          : await saveImportFile(detection.file);

        await logImport({
          filename: detection.file.name,
          file_type: detection.fileType,
          file_path: filePath,
          detected_type: effectiveType,
          target_entity: mapEntityTypeToTable(effectiveType),
          status: 'pending',
        });

        if (landingInLibrary) {
          const importDate = new Date().toISOString().split('T')[0];
          const tagList = ['imported', `date:${importDate}`, `type:${detection.fileType}`];
          if (isUnclassified) tagList.push('unclassified');
          const tags = JSON.stringify(tagList);
          await addAttachment({
            entity_type: 'library',
            entity_id: 'root',
            filename: detection.file.name,
            file_path: filePath,
            mime_type: detection.file.type || 'application/octet-stream',
            size_bytes: detection.file.size,
            tags,
          });
          await logImport({
            filename: detection.file.name,
            file_type: detection.fileType,
            file_path: filePath,
            detected_type: effectiveType,
            target_entity: 'attachment',
            status: 'imported',
          });
          tally.imported++;
          continue;
        }

        // Only a file that actually created records counts as imported.
        // Zero-record results (e.g. a spreadsheet with no mappable line
        // items) log as skipped, so the history and the success toast stop
        // claiming work that never happened.
        let created = 0;
        if (detection.fileType === 'spreadsheet') {
          created = await importSpreadsheet(detection, filePath);
        } else if (detection.fileType === 'document') {
          created = await importDocument(detection, filePath);
        }

        await logImport({
          filename: detection.file.name,
          file_type: detection.fileType,
          file_path: filePath,
          detected_type: effectiveType,
          target_entity: mapEntityTypeToTable(effectiveType),
          status: tallyImport(created, tally),
        });
      } catch (err) {
        errors++;
        console.error(`Import failed for ${detection.file.name}:`, err);
      }
    }

    setImportedCount(tally.imported);
    setSkipCount(tally.skipped + detections.filter(d => d.skipped).length);
    setErrorCount(errors);
    setImporting(false);
    setStep(5);

    if (tally.imported > 0) {
      addToast(`Successfully imported ${tally.imported} item${pluralSuffix(tally.imported)}`, 'success');
    }
    if (errors > 0) {
      addToast(`${errors} import${pluralSuffix(errors)} failed`, 'error');
    }
  };

  const ensureClients = async () => {
    if (!clients.length) await loadClients();
    return useStore.getState().clients;
  };

  const importSpreadsheet = async (detection: ImportDetection, _filePath: string): Promise<number> => {
    const mappers = await import('../../import/mappers');
    const mapping = detection.columnMapping || {};
    const rows = detection.preview.rows || [];
    const effectiveType = effectiveEntityType(detection);

    switch (effectiveType) {
      case 'client_list':
        return addMany(mappers.mapToClients(rows, mapping), addClient);
      case 'invoice': {
        const lineItems = mappers.mapToLineItems(rows, mapping);
        if (lineItems.length === 0) return 0;
        const subtotal = lineItems.reduce((sum: number, li) => sum + li.total, 0);
        const clientId = resolveClientId(await ensureClients(), { fallbackId: detection.targetEntityId });
        const invoiceNumber = `IMP-${Date.now().toString(36).toUpperCase()}`;
        await addInvoice({
          client_id: clientId,
          project_id: undefined,
          invoice_number: invoiceNumber,
          status: 'draft',
          line_items: lineItems,
          subtotal,
          tax_rate: undefined,
          total: subtotal,
          due_date: undefined,
          notes: `Imported from ${detection.file.name}`,
        });
        return 1;
      }
      case 'project_list': {
        const projectData = mappers.mapToProjects(rows, mapping);
        const latestClients = await ensureClients();
        for (const data of projectData) {
          await addProject({
            client_id: resolveClientId(latestClients, { clientName: data.client_name }),
            title: data.title,
            status: data.status,
            budget: data.budget,
            start_date: data.start_date,
            end_date: data.end_date,
            notes: data.notes,
          });
        }
        return projectData.length;
      }
      case 'expense_list':
      case 'financial_data':
        // Financial data is ambiguous · import as expense list
        return addMany(mappers.mapToExpenses(rows, mapping), addExpense);
      default:
        return 0;
    }
  };

  const importDocument = async (detection: ImportDetection, _filePath: string): Promise<number> => {
    const { extractDocumentPrefill } = await import('../../import/mappers');
    const prefill = extractDocumentPrefill(detection);

    switch (prefill.entityType) {
      case 'invoice': {
        const clientId = resolveClientId(await ensureClients(), { email: prefill.email, clientName: prefill.client_name });
        const lineItems = prefill.lineItems || [];
        const subtotal = lineItems.reduce((s, li) => s + li.total, 0) || prefill.total || 0;
        const invoiceNumber = prefill.invoice_number || `IMP-${Date.now().toString(36).toUpperCase()}`;

        await addInvoice({
          client_id: clientId,
          project_id: undefined,
          invoice_number: invoiceNumber,
          status: 'draft',
          line_items: lineItems,
          subtotal,
          tax_rate: undefined,
          total: subtotal,
          due_date: prefill.due_date,
          notes: `Imported from ${detection.file.name}`,
        });
        return 1;
      }
      case 'contract': {
        const clientId = resolveClientId(await ensureClients(), { clientName: prefill.client_name });
        await addContract({
          client_id: clientId,
          project_id: undefined,
          proposal_id: undefined,
          title: prefill.title || `Imported Contract · ${detection.file.name}`,
          status: 'draft',
          body: prefill.body,
        });
        return 1;
      }
      case 'proposal': {
        const clientId = resolveClientId(await ensureClients(), { clientName: prefill.client_name });
        await addProposal({
          client_id: clientId,
          project_id: undefined,
          title: prefill.title || `Imported Proposal · ${detection.file.name}`,
          status: 'draft',
          scope: undefined,
          timeline: undefined,
          rate: undefined,
          rate_type: 'flat',
          body: prefill.body,
        });
        return 1;
      }
      default:
        return 0;
    }
  };

  const activeDetections = detections.filter(d => !d.skipped);

  const handleClose = useCallback(() => {
    if (importing) return;
    reset();
    onClose();
  }, [importing, onClose, reset]);

  // Belt-and-suspenders: ensure Escape closes even if Modal's document listener misses it
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', handler, true); // capture phase
    return () => document.removeEventListener('keydown', handler, true);
  }, [open, handleClose]);

  const onDismissBanner = () => {
    setClassificationBannerDismissed(true);
    sessionStorage.setItem('lance:import-classification-banner', 'true');
  };
  const onImportClick = () => {
    const active = detections.filter(d => !d.skipped);
    if (active.length === 0) {
      addToast('No files selected for import', 'info');
      return;
    }
    handleImport();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Files" size="lg">
      <div className="space-y-5">
        <StepDots step={step} importing={importing} />

        {step === 1 && (
          <DropZoneStep
            importHistory={importHistory}
            onFilesSelected={handleFilesSelected}
            onClose={handleClose}
            fileInputRef={fileInputRef}
          />
        )}

        {step === 2 && <ScanningStep scanProgress={scanProgress} />}

        {step === 3 && (
          <ReviewStep
            detections={detections}
            reviewIndex={reviewIndex}
            classificationBannerDismissed={classificationBannerDismissed}
            onDismissBanner={onDismissBanner}
            onSelect={setReviewIndex}
            onOverride={handleOverrideType}
            onUpdateMapping={handleUpdateMapping}
            onSkip={handleSkip}
            onUnskip={handleUnskip}
            onPrev={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
            onNext={() => setReviewIndex(Math.min(detections.length - 1, reviewIndex + 1))}
            onImport={onImportClick}
          />
        )}

        {step === 4 && <ImportingStep count={activeDetections.length} />}

        {step === 5 && (
          <CompleteStep
            importedCount={importedCount}
            skipCount={skipCount}
            errorCount={errorCount}
            onClose={handleClose}
          />
        )}
      </div>
    </Modal>
  );
}

function mapEntityTypeToTable(type: DetectedEntityType): string {
  switch (type) {
    case 'client_list': return 'clients';
    case 'project_list': return 'projects';
    case 'invoice': return 'invoices';
    case 'expense_list':
    case 'financial_data': return 'expenses';
    case 'contract': return 'contracts';
    case 'proposal': return 'proposals';
    case 'attachment': return 'attachments';
    default: return 'attachments';
  }
}
