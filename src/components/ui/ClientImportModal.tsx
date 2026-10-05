import { useState, useCallback, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import type { Client } from '../../types';

import { autoMapColumns, mapRowToClient, SOURCE_PRESETS, CLIENT_FIELDS, type CsvRow } from '../../utils/clientImport';

const MANDATORY_FIELD = 'name';

const MAX_ROWS = 500;


interface DedupResult {
  row: CsvRow;
  duplicate: boolean;
  matchedClient?: Client;
  matchReason?: string;
  action: 'import' | 'skip' | 'merge';
}

const SAMPLE_CSV_CONTENT =
  'Name,Email,Phone,Company,Notes\n' +
  'Jane Smith,jane@example.com,(555) 123-4567,Acme Inc.,Primary contact for design\n' +
  'Bob Wilson,bob@example.com,,Widget Corp,"Needs invoicing to AP, NET 30"\n' +
  'Maria Garcia,maria@example.com,(555) 987-6543,,Early-stage founder\n';

type Step = 1 | 2 | 3 | 4 | 5;


export default function ClientImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { loadClients, addClient, updateClient, addCommunication } = useStore();
  const addToast = useToasts((s) => s.add);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dedupResults, setDedupResults] = useState<DedupResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState<{
    imported: number;
    skipped: number;
    merged: number;
    failed: number;
    failures: string[];
  }>({ imported: 0, skipped: 0, merged: 0, failed: 0, failures: [] });
  const [toBeImported, setToBeImported] = useState(0);
  const [importSource, setImportSource] = useState<string>('generic');

  const reset = useCallback(() => {
    setStep(1);
    setRawHeaders([]);
    setAllRows([]);
    setColumnMapping({});
    setDedupResults([]);
    setImporting(false);
    setProgress({ current: 0, total: 0 });
    setSummary({ imported: 0, skipped: 0, merged: 0, failed: 0, failures: [] });
    setToBeImported(0);
  }, []);

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const handleDownloadSample = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({ defaultPath: 'lance_client_import_sample.csv' });
      if (!filePath) return;
      const encoder = new TextEncoder();
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const content = encoder.encode(SAMPLE_CSV_CONTENT);
      const combined = new Uint8Array(bom.length + content.length);
      combined.set(bom);
      combined.set(content);
      await writeFile(filePath, combined);
      addToast('Sample CSV saved', 'success');
    } catch {
      addToast('Failed to save sample CSV', 'error');
    }
  };

  const parseCSV = async (file: File) => {
    setStep(2);
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(arrayBuffer);
      const cleanText = text.replace(/^\uFEFF/, '');
      const workbook = XLSX.read(cleanText, { type: 'string', raw: true });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        addToast('No sheets found in file', 'error');
        setStep(1);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        addToast('No data rows found', 'error');
        setStep(1);
        return;
      }

      if (jsonData.length > MAX_ROWS) {
        addToast(`File has ${jsonData.length} rows. Maximum is ${MAX_ROWS}. Please split the file.`, 'error');
        setStep(1);
        return;
      }

      const headers = Object.keys(jsonData[0]);
      const rows = jsonData.map((row) => {
        const stringRow: Record<string, string> = {};
        for (const key of headers) {
          stringRow[key] = String(row[key] ?? '').trim();
        }
        return stringRow;
      });

      setRawHeaders(headers);
      setAllRows(rows);

      setColumnMapping(autoMapColumns(headers, importSource));
      setStep(3);
    } catch (err) {
      addToast(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setStep(1);
    }
  };

  const buildMappedRows = (): CsvRow[] => {
    return allRows
      .map((row, i) => mapRowToClient(row, i, columnMapping))
      .filter((r) => r.name.trim());
  };

  const handleGotoReview = async () => {
    const mapped = buildMappedRows();
    if (mapped.length === 0) {
      addToast('No rows to import after mapping', 'info');
      return;
    }
    setToBeImported(mapped.length);
    await loadClients();
    const latestClients = useStore.getState().clients;

    const results: DedupResult[] = [];

    for (const row of mapped) {
      const nameMatch = latestClients.find(
        (c) => (c.name || '').toLowerCase() === (row.name || '').toLowerCase()
      );
      const emailMatch =
        row.email &&
        latestClients.find(
          (c) => c.email && (c.email || '').toLowerCase() === (row.email || '').toLowerCase()
        );

      if (nameMatch) {
        results.push({
          row,
          duplicate: true,
          matchedClient: nameMatch,
          matchReason: `matches '${nameMatch.name}'`,
          action: 'skip',
        });
      } else if (emailMatch) {
        results.push({
          row,
          duplicate: true,
          matchedClient: emailMatch,
          matchReason: `email matches '${emailMatch.name}'`,
          action: 'skip',
        });
      } else {
        results.push({ row, duplicate: false, action: 'import' });
      }
    }

    setDedupResults(results);
    setToBeImported(results.filter((r) => r.action !== 'skip').length);
    setStep(4);
  };

  const handleActionChange = (index: number, action: 'import' | 'skip' | 'merge') => {
    setDedupResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, action } : r))
    );
    setToBeImported(
      dedupResults.map((r, i) => (i === index ? { ...r, action } : r)).filter((r) => r.action !== 'skip').length
    );
  };

  const handleBatchAction = (action: 'import' | 'skip') => {
    setDedupResults((prev) =>
      prev.map((r) => (r.duplicate ? { ...r, action } : r))
    );
    setToBeImported(
      dedupResults.map((r) => (r.duplicate ? { ...r, action } : r)).filter((r) => r.action !== 'skip').length
    );
  };

  const handleImport = async () => {
    setStep(4);
    setImporting(true);
    const toProcess = dedupResults.filter((r) => r.action !== 'skip');
    setProgress({ current: 0, total: toProcess.length });

    let imported = 0;
    let skipped = 0;
    let merged = 0;
    let failed = 0;
    const failures: string[] = [];
    const importDate = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      setProgress({ current: i + 1, total: toProcess.length });
      try {
        if (item.action === 'merge' && item.matchedClient) {
          const existing = item.matchedClient;
          const updates: Partial<Client> = {};
          if (item.row.email && !existing.email) updates.email = item.row.email;
          if (item.row.phone && !existing.phone) updates.phone = item.row.phone;
          if (item.row.company && !existing.company) updates.company = item.row.company;
          if (item.row.notes && !existing.notes) updates.notes = item.row.notes;
          if (Object.keys(updates).length > 0) {
            await updateClient({ ...existing, ...updates });
          }
          await addCommunication({
            id: crypto.randomUUID(),
            client_id: existing.id,
            type: 'note',
            summary: `Imported via CSV on ${importDate}`,
            date: importDate,
            created_at: now,
          });
          merged++;
        } else {
          const newClient = await addClient({
            name: item.row.name,
            email: item.row.email || undefined,
            phone: item.row.phone || undefined,
            company: item.row.company || undefined,
            notes: item.row.notes || undefined,
          });
          await addCommunication({
            id: crypto.randomUUID(),
            client_id: newClient.id,
            type: 'note',
            summary: `Imported via CSV on ${importDate}`,
            date: importDate,
            created_at: now,
          });
          imported++;
        }
      } catch (err) {
        failed++;
        failures.push(`Row ${item.row.__rowIndex + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    skipped = dedupResults.filter((r) => r.action === 'skip').length;
    setSummary({ imported, skipped, merged, failed, failures });
    setImporting(false);
    setStep(5);

    if (imported > 0 || merged > 0) {
      addToast(`${imported + merged} clients imported successfully`, 'success');
    }
    if (failed > 0) {
      addToast(`${failed} imports failed`, 'error');
    }
  };

  const handleDone = async () => {
    await loadClients();
    handleClose();
  };

  const stepDots = [1, 2, 3, 4, 5];

  const previewRows = allRows.slice(0, 3);

  return (
    <Modal open={open} onClose={handleClose} title="Import Clients from CSV" size="lg">
      <div className="space-y-5">
        <div className="flex justify-center gap-2 mb-2">
          {stepDots.map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                s < step
                  ? 'bg-[var(--accent)]'
                  : s === step
                  ? 'bg-[var(--accent)] scale-125'
                  : 'bg-[var(--border-color)]'
              } ${importing && s === 4 ? 'animate-pulse' : ''}`}
            />
          ))}
        </div>

        {/* Step 1 · Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-[var(--border-color)] rounded-[12px] p-10 text-center hover:border-[var(--accent)]/40 transition-colors cursor-pointer bg-[var(--bg-secondary)]/30"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('drop-zone-active');
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove('drop-zone-active')}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drop-zone-active');
                const dropped = Array.from(e.dataTransfer.files);
                const csvFile = dropped.find(
                  (f) =>
                    f.name.endsWith('.csv') ||
                    f.name.endsWith('.xlsx') ||
                    f.name.endsWith('.xls')
                );
                if (csvFile) parseCSV(csvFile);
                else addToast('Please drop a CSV or XLSX file', 'error');
              }}
            >
              <Upload size={40} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
                Drop a CSV or XLSX file here, or click to browse
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Max {MAX_ROWS} clients per import &middot; .csv, .xlsx
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="import-source" className="text-xs text-[var(--text-secondary)] flex-shrink-0">
                Switching from another tool?
              </label>
              <select aria-label="Importsource"
                id="import-source"
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {Object.entries(SOURCE_PRESETS).map(([id, preset]) => (
                  <option key={id} value={id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  parseCSV(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <div className="flex items-center justify-between">
              <button
                onClick={handleDownloadSample}
                className="flex items-center gap-1.5 text-xs text-[var(--accent-ink,var(--accent))] hover:underline"
              >
                <Download size={12} />
                Download sample CSV
              </button>
              <Button variant="ghost" onClick={handleClose} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 · Parsing */}
        {step === 2 && (
          <div className="space-y-4 text-center py-6">
            <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[var(--accent-ink,var(--accent))]" />
            <p className="text-sm text-[var(--text-primary)] font-medium">
              Parsing file...
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Reading and analyzing your CSV data
            </p>
          </div>
        )}

        {/* Step 3 · Column Mapping */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet size={16} className="text-[var(--accent-ink,var(--accent))]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Column Mapping
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {allRows.length} rows detected &middot; Map columns to client fields
                  </p>
                </div>
              </div>
            </div>

            {previewRows.length > 0 && (
              <div className="border border-[var(--border-color)] rounded-[8px] overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      {rawHeaders.map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-[var(--border-color)]/50">
                        {rawHeaders.map((h) => (
                          <td key={h} className="px-3 py-1 text-[var(--text-primary)] truncate max-w-[150px]">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Map file columns to client fields (Name is required)
              </label>
              <div className="space-y-2">
                {rawHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-secondary)] rounded-[8px]"
                  >
                    <span className="text-xs text-[var(--text-primary)] w-1/3 truncate">
                      {header}
                    </span>
                    <span className="text-[var(--text-tertiary)] text-xs">&rarr;</span>
                    <select aria-label="Columnmapping[header] || ''"
                      value={columnMapping[header] || ''}
                      onChange={(e) => {
                        setColumnMapping((prev) => {
                          const next = { ...prev };
                          if (e.target.value) {
                            next[header] = e.target.value;
                          } else {
                            delete next[header];
                          }
                          return next;
                        });
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">-- Skip --</option>
                      {Object.keys(CLIENT_FIELDS).map((field) => (
                        <option key={field} value={field}>
                          {field === MANDATORY_FIELD ? `${field} *` : field}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleGotoReview}
                disabled={!Object.values(columnMapping).includes(MANDATORY_FIELD)}
              >
                Review <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 · Import progress (overlay during import, or step indicator during review) */}
        {step === 4 && importing && (
          <div className="space-y-4 text-center py-6">
            <Loader2 size={36} className="animate-spin mx-auto mb-4 text-[var(--accent-ink,var(--accent))]" />
            <p className="text-sm text-[var(--text-primary)] font-medium">
              Importing clients...
            </p>
            <div className="w-full h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300 ease-out rounded-full"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {progress.current} of {progress.total}
            </p>
          </div>
        )}

        {/* Step 4 · Review & Deduplication (before importing) */}
        {step === 4 && !importing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Review & Deduplication
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {dedupResults.length} rows, {toBeImported} to import
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBatchAction('import')}
                >
                  Import all duplicates
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBatchAction('skip')}
                >
                  Skip all duplicates
                </Button>
              </div>
            </div>

            <div className="border border-[var(--border-color)] rounded-[8px] overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] sticky top-0">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                      Name
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                      Email
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                      Company
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                      Status
                    </th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dedupResults.map((dr, i) => (
                    <tr
                      key={i}
                      className={`border-t border-[var(--border-color)]/50 ${
                        dr.duplicate ? 'bg-[var(--warning-bg)]/30' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 text-[var(--text-primary)] truncate max-w-[180px]">
                        {dr.row.name}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--text-secondary)] truncate max-w-[180px]">
                        {dr.row.email}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--text-secondary)] truncate max-w-[120px]">
                        {dr.row.company}
                      </td>
                      <td className="px-3 py-1.5">
                        {dr.duplicate ? (
                          <span
                            className="flex items-center gap-1 text-[10px] text-[var(--warning-text)]"
                            title={dr.matchReason}
                          >
                            <AlertTriangle size={10} />
                            {dr.matchReason}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--accent-ink,var(--accent))]">
                            <Check size={10} className="inline mr-0.5" />
                            New
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {dr.duplicate ? (
                          <select aria-label="Dr.action"
                            value={dr.action}
                            onChange={(e) =>
                              handleActionChange(
                                i,
                                e.target.value as 'import' | 'skip' | 'merge'
                              )
                            }
                            className="px-2 py-1 text-[10px] border border-[var(--border-color)] rounded-[4px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none"
                          >
                            <option value="skip">Skip</option>
                            <option value="import">Import anyway</option>
                            <option value="merge">Merge</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            Will import
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ArrowLeft size={14} /> Back to mapping
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={toBeImported === 0}
              >
                Import {toBeImported} client{toBeImported !== 1 ? 's' : ''} <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5 · Summary */}
        {step === 5 && (
          <div className="space-y-4 text-center py-6">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mx-auto mb-3">
              <Check size={28} className="text-[var(--accent-ink,var(--accent))]" />
            </div>
            <h3
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Import Complete
            </h3>
            <div className="flex justify-center gap-6 text-xs">
              {summary.imported > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--accent-ink,var(--accent))]">
                    {summary.imported}
                  </span>
                  <span className="text-[var(--text-tertiary)]">Imported</span>
                </div>
              )}
              {summary.skipped > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--text-tertiary)]">
                    {summary.skipped}
                  </span>
                  <span className="text-[var(--text-tertiary)]">Skipped</span>
                </div>
              )}
              {summary.merged > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--accent-bg)]">
                    {summary.merged}
                  </span>
                  <span className="text-[var(--text-tertiary)]">Merged</span>
                </div>
              )}
              {summary.failed > 0 && (
                <div className="text-center">
                  <span className="block text-lg font-bold text-[var(--danger)]">
                    {summary.failed}
                  </span>
                  <span className="text-[var(--text-tertiary)]">Failed</span>
                </div>
              )}
            </div>
            {summary.failures.length > 0 && (
              <div className="text-left mt-4">
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                  Failed rows
                </p>
                <div className="bg-[var(--bg-secondary)] rounded-[6px] p-2 max-h-[120px] overflow-y-auto">
                  {summary.failures.map((f, i) => (
                    <p key={i} className="text-[10px] text-[var(--danger)]">{f}</p>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleDone} size="sm">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
