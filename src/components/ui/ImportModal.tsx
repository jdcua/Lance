/**
 * ImportModal -- Multi-step import wizard.
 * Step 1: Drop zone + file picker
 * Step 2: Scanning progress
 * Step 3: Review -- per-file preview with column mapping
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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  File,
  EyeOff,
  Info,
} from 'lucide-react';
import type { ImportDetection, DetectedEntityType } from '../../types';
import { processImportFiles, ACCEPTED_EXTENSIONS_STRING } from '../../import';
import { entityTypeLabel, getAvailableFields } from '../../import/classifier';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';

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

export default function ImportModal({ open, onClose, initialFiles }: ImportModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [detections, setDetections] = useState<ImportDetection[]>([]);
  const [scanning, setScanning] = useState(false);
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

  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
      startScan(initialFiles);
    }
  }, [open, initialFiles]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setFiles(newFiles);
    startScan(newFiles);
  }, []);

  const startScan = async (fileList: File[]) => {
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
  };

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
    let imported = 0;
    const skipped = skipCount;
    let errors = 0;

    const active = detections.filter(d => !d.skipped);

    for (const detection of active) {
      try {
        const effectiveType = detection.userOverride || detection.detectedEntity;
        const isUnclassified = effectiveType === 'unknown';
        const landingInLibrary = detection.fileType === 'image' || effectiveType === 'attachment' || isUnclassified;

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
          imported++;
          continue;
        }

        if (detection.fileType === 'spreadsheet') {
          await importSpreadsheet(detection, filePath);
        } else if (detection.fileType === 'document') {
          await importDocument(detection, filePath);
        }

        await logImport({
          filename: detection.file.name,
          file_type: detection.fileType,
          file_path: filePath,
          detected_type: effectiveType,
          target_entity: mapEntityTypeToTable(effectiveType),
          status: 'imported',
        });
        imported++;
      } catch (err) {
        errors++;
        console.error(`Import failed for ${detection.file.name}:`, err);
      }
    }

    setImportedCount(imported);
    setSkipCount(skipped + detections.filter(d => d.skipped).length);
    setErrorCount(errors);
    setImporting(false);
    setStep(5);

    if (imported > 0) {
      addToast(`Successfully imported ${imported} item${imported !== 1 ? 's' : ''}`, 'success');
    }
    if (errors > 0) {
      addToast(`${errors} import${errors !== 1 ? 's' : ''} failed`, 'error');
    }
  };

  const importSpreadsheet = async (detection: ImportDetection, filePath: string) => {
    const mappers = await import('../../import/mappers');
    const mapping = detection.columnMapping || {};
    const rows = detection.preview.rows || [];
    const effectiveType = detection.userOverride || detection.detectedEntity;

    switch (effectiveType) {
      case 'client_list': {
        const clientData = mappers.mapToClients(rows, mapping);
        for (const data of clientData) {
          await addClient(data);
        }
        break;
      }
      case 'invoice': {
        const lineItems = mappers.mapToLineItems(rows, mapping);
        if (lineItems.length === 0) return;
        const subtotal = lineItems.reduce((sum: number, li) => sum + li.total, 0);
        if (!clients.length) await loadClients();
        const latestClients = useStore.getState().clients;
        const clientId = detection.targetEntityId || latestClients[0]?.id || '_unknown';
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
        break;
      }
      case 'project_list': {
        const projectData = mappers.mapToProjects(rows, mapping);
        if (!clients.length) await loadClients();
        const latestClients = useStore.getState().clients;
        for (const data of projectData) {
          const client = data.client_name
            ? latestClients.find(c => (c.name || '').toLowerCase() === (data.client_name || '').toLowerCase())
            : latestClients[0];
          await addProject({
            client_id: client?.id || latestClients[0]?.id || '_unknown',
            title: data.title,
            status: data.status,
            budget: data.budget,
            start_date: data.start_date,
            end_date: data.end_date,
            notes: data.notes,
          });
        }
        break;
      }
      case 'expense_list': {
        const expenseData = mappers.mapToExpenses(rows, mapping);
        for (const data of expenseData) {
          await addExpense(data);
        }
        break;
      }
      case 'financial_data': {
        // Financial data is ambiguous -- import as expense list
        const expenseData = mappers.mapToExpenses(rows, mapping);
        for (const data of expenseData) {
          await addExpense(data);
        }
        break;
      }
    }
  };

  const importDocument = async (detection: ImportDetection, _filePath: string) => {
    const { extractDocumentPrefill } = await import('../../import/mappers');
    const prefill = extractDocumentPrefill(detection);

    switch (prefill.entityType) {
      case 'invoice': {
        if (!clients.length) await loadClients();
        const latestClients = useStore.getState().clients;
        let clientId = latestClients[0]?.id || '_unknown';
        if (prefill.email) {
          const matched = latestClients.find(c => (c.email || '').toLowerCase() === (prefill.email || '').toLowerCase());
          if (matched) clientId = matched.id;
        } else if (prefill.client_name) {
          const matched = latestClients.find(c => (c.name || '').toLowerCase() === (prefill.client_name || '').toLowerCase());
          if (matched) clientId = matched.id;
        }

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
        break;
      }
      case 'contract': {
        if (!clients.length) await loadClients();
        const latestClients = useStore.getState().clients;
        let clientId = latestClients[0]?.id || '_unknown';
        if (prefill.client_name) {
          const matched = latestClients.find(c => (c.name || '').toLowerCase() === (prefill.client_name || '').toLowerCase());
          if (matched) clientId = matched.id;
        }

        await addContract({
          client_id: clientId,
          project_id: undefined,
          proposal_id: undefined,
          title: prefill.title || `Imported Contract -- ${detection.file.name}`,
          status: 'draft',
          body: prefill.body,
        });
        break;
      }
      case 'proposal': {
        if (!clients.length) await loadClients();
        const latestClients = useStore.getState().clients;
        let clientId = latestClients[0]?.id || '_unknown';
        if (prefill.client_name) {
          const matched = latestClients.find(c => (c.name || '').toLowerCase() === (prefill.client_name || '').toLowerCase());
          if (matched) clientId = matched.id;
        }

        await addProposal({
          client_id: clientId,
          project_id: undefined,
          title: prefill.title || `Imported Proposal -- ${detection.file.name}`,
          status: 'draft',
          scope: undefined,
          timeline: undefined,
          rate: undefined,
          rate_type: 'flat',
          body: prefill.body,
        });
        break;
      }
    }
  };

  const activeDetections = detections.filter(d => !d.skipped);
  const currentDetection = detections[reviewIndex];

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

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
  }, [open, handleClose, importing]);

  const stepDots = [1, 2, 3, 4, 5];

  return (
    <Modal open={open} onClose={handleClose} title="Import Files" size="lg">
      <div className="space-y-5">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-2">
          {stepDots.map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                s < step ? 'bg-[var(--accent)]' :
                s === step ? 'bg-[var(--accent)] scale-125' :
                'bg-[var(--border-color)]'
              } ${importing && s === 4 ? 'animate-pulse' : ''}`}
            />
          ))}
        </div>

        {/* Step 1 -- Drop Zone */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-[var(--border-color)] rounded-[12px] p-10 text-center hover:border-[var(--accent)]/40 transition-colors cursor-pointer bg-[var(--bg-secondary)]/30"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drop-zone-active'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('drop-zone-active')}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drop-zone-active');
                const dropped = Array.from(e.dataTransfer.files);
                handleFilesSelected(dropped);
              }}
            >
              <Upload size={40} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                .xlsx, .csv, .pdf, .docx, .doc, .png, .jpg, .jpeg
              </p>
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
                if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose} size="sm">Cancel</Button>
            </div>
          </div>
        )}

        {/* Step 2 -- Scanning */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[var(--accent)]" />
              <p className="text-sm text-[var(--text-primary)] font-medium">
                Scanning files...
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {scanProgress.current} of {scanProgress.total}
              </p>
              {scanProgress.filename && (
                <p className="text-xs text-[var(--text-secondary)] mt-2 truncate max-w-[300px] mx-auto">
                  Analyzing {scanProgress.filename}
                </p>
              )}
            </div>
            {/* Scanning progress bar */}
            <div className="w-full h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300 ease-out rounded-full"
                style={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 3 -- Review */}
        {step === 3 && (
          <div className="space-y-4">
            {!classificationBannerDismissed && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Info size={14} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">Classification is a suggestion</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                    Lance guessed the type of each file based on its content. Always review before importing, especially for financial documents.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setClassificationBannerDismissed(true);
                    sessionStorage.setItem('lance:import-classification-banner', 'true');
                  }}
                  className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex-shrink-0 font-medium"
                >
                  Got it
                  <X size={12} />
                </button>
              </div>
            )}

            {/* File navigation tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {detections.map((d, i) => {
                const Icon = fileIcon(d.fileType);
                const isSkipped = d.skipped;
                const isCurrent = i === reviewIndex;
                const effectiveType = d.userOverride || d.detectedEntity;
                return (
                  <button
                    key={i}
                    onClick={() => setReviewIndex(i)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs transition-colors flex-shrink-0 ${
                      isCurrent
                        ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] border border-[var(--accent)]/30'
                        : isSkipped
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] line-through border border-transparent'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="max-w-[100px] truncate">{d.file.name}</span>
                    {isSkipped && <EyeOff size={10} className="ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {currentDetection && (
              <div className="border border-[var(--border-color)] rounded-[12px] p-4 space-y-4">
                {/* File header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = fileIcon(currentDetection.fileType);
                      return <Icon size={18} className="text-[var(--accent)]" />;
                    })()}
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {currentDetection.file.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        {(currentDetection.file.size / 1024).toFixed(1)} KB &middot; {currentDetection.preview.summary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Confidence badge */}
                    {currentDetection.fileType !== 'image' && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        currentDetection.confidence >= 0.7
                          ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                          : currentDetection.confidence >= 0.3
                          ? 'bg-[var(--medium-conf-bg)] text-[var(--medium-conf-text)]'
                          : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                      }`}>
                        {Math.round(currentDetection.confidence * 100)}% confidence
                      </span>
                    )}
                    <Button
                      variant={currentDetection.skipped ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => currentDetection.skipped ? handleUnskip(reviewIndex) : handleSkip(reviewIndex)}
                    >
                      {currentDetection.skipped ? 'Unskip' : 'Skip'}
                    </Button>
                  </div>
                </div>

                {!currentDetection.skipped && (
                  <>
                    {/* Entity type override */}
                    {currentDetection.fileType !== 'image' && (
                      <div className="p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Detected as:</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            currentDetection.confidence >= 0.7
                              ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                              : currentDetection.confidence >= 0.3
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                              : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                          }`}>
                            {entityTypeLabel(currentDetection.detectedEntity)}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[var(--text-accent)] uppercase tracking-wide mb-1.5 block">
                            Change:
                          </label>
                          <select
                            value={currentDetection.userOverride || currentDetection.detectedEntity}
                            onChange={(e) => handleOverrideType(reviewIndex, e.target.value as DetectedEntityType)}
                            className="w-full px-3 py-2 text-sm border-2 border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 font-medium"
                          >
                            {(['client_list', 'project_list', 'invoice', 'expense_list', 'contract', 'proposal', 'financial_data', 'attachment', 'unknown'] as DetectedEntityType[]).map(t => (
                              <option key={t} value={t}>{entityTypeLabel(t)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Spreadsheet -- Column mapping */}
                    {currentDetection.fileType === 'spreadsheet' && currentDetection.preview.headers && currentDetection.preview.rows && (
                      <ColumnMapper
                        headers={currentDetection.preview.headers}
                        columnMapping={currentDetection.columnMapping || {}}
                        entityType={currentDetection.userOverride || currentDetection.detectedEntity}
                        previewRows={currentDetection.preview.rows}
                        onChange={(mapping) => handleUpdateMapping(reviewIndex, mapping)}
                      />
                    )}

                    {/* Document -- Extracted fields preview */}
                    {currentDetection.fileType === 'document' && (
                      <div className="space-y-3">
                        {currentDetection.preview.extractedFields && Object.keys(currentDetection.preview.extractedFields).length > 0 && (
                          <div>
                            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium mb-2 block">
                              Extracted Fields
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(currentDetection.preview.extractedFields).map(([key, value]) => (
                                <div key={key} className="bg-[var(--bg-secondary)] rounded-[6px] px-3 py-1.5">
                                  <span className="text-[10px] text-[var(--text-tertiary)] block">{key.replace(/_/g, ' ')}</span>
                                  <span className="text-xs text-[var(--text-primary)] truncate block">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentDetection.preview.extractedLineItems && currentDetection.preview.extractedLineItems.length > 0 && (
                          <div>
                            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium mb-2 block">
                              Detected Line Items ({currentDetection.preview.extractedLineItems.length})
                            </span>
                            <div className="border border-[var(--border-color)] rounded-[8px] overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-[var(--bg-secondary)]">
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase">Description</th>
                                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-secondary)] uppercase">Qty</th>
                                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-secondary)] uppercase">Price</th>
                                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-[var(--text-secondary)] uppercase">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentDetection.preview.extractedLineItems.map((item, li) => (
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

                        {currentDetection.preview.rawText && (
                          <details className="mt-2">
                            <summary className="text-[10px] text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">
                              View raw text
                            </summary>
                            <pre className="mt-1 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-[6px] p-3 max-h-[150px] overflow-y-auto whitespace-pre-wrap font-mono">
                              {currentDetection.preview.rawText}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Image -- Thumbnail preview */}
                    {currentDetection.fileType === 'image' && currentDetection.preview.imageDataUrl && (
                      <div className="flex gap-4 items-start">
                        <img
                          src={currentDetection.preview.imageDataUrl}
                          alt={currentDetection.file.name}
                          className="rounded-[8px] border border-[var(--border-color)] max-w-[200px] max-h-[200px] object-contain bg-[var(--bg-secondary)]"
                        />
                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                          <p>{currentDetection.file.name}</p>
                          <p>{(currentDetection.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          {currentDetection.preview.imageDimensions && (
                            <p>{currentDetection.preview.imageDimensions.width} x {currentDetection.preview.imageDimensions.height}px</p>
                          )}
                          <p className="text-[var(--text-tertiary)]">Will be saved as attachment</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {currentDetection.skipped && (
                  <div className="text-center py-4 text-sm text-[var(--text-tertiary)]">
                    This file will be skipped during import.
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
                  disabled={reviewIndex === 0}
                >
                  <ArrowLeft size={14} /> Previous
                </Button>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {reviewIndex + 1} of {detections.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewIndex(Math.min(detections.length - 1, reviewIndex + 1))}
                  disabled={reviewIndex === detections.length - 1}
                >
                  Next <ArrowRight size={14} />
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const active = detections.filter(d => !d.skipped);
                  if (active.length === 0) {
                    addToast('No files selected for import', 'info');
                    return;
                  }
                  handleImport();
                }}
                disabled={detections.filter(d => !d.skipped).length === 0}
              >
                Import {detections.filter(d => !d.skipped).length} file{detections.filter(d => !d.skipped).length !== 1 ? 's' : ''} <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 -- Importing progress */}
        {step === 4 && (
          <div className="space-y-4 text-center py-6">
            <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[var(--accent)]" />
            <p className="text-sm text-[var(--text-primary)] font-medium">
              Importing {activeDetections.length} file{activeDetections.length !== 1 ? 's' : ''}...
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Creating Lance entities from your files
            </p>
          </div>
        )}

        {/* Step 5 -- Complete */}
        {step === 5 && (
          <div className="space-y-4 text-center py-6">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mx-auto mb-3">
              <Check size={28} className="text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>
              Import Complete
            </h3>
            <div className="flex justify-center gap-6 text-xs">
              {importedCount > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--accent)]">{importedCount}</span>
                  <span className="text-[var(--text-tertiary)]">Imported</span>
                </div>
              )}
              {skipCount > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--text-tertiary)]">{skipCount}</span>
                  <span className="text-[var(--text-tertiary)]">Skipped</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--danger)]">{errorCount}</span>
                  <span className="text-[var(--text-tertiary)]">Failed</span>
                </div>
              )}
            </div>
            <Button onClick={handleClose} size="sm">
              Done
            </Button>
          </div>
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
