import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Upload, ArrowRight, Check } from 'lucide-react';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import {
  detectBankColumns,
  parseBankRows,
  expenseFingerprint,
  type ParsedBankRow,
  type BankColumnMap,
} from '../../utils/bankCsv';

const CATEGORIES = ['Software', 'Equipment', 'Office', 'Travel', 'Marketing', 'Fees', 'Other'];

/**
 * Bank statement import: maps any bank CSV to expenses. Outflows import
 * (deduplicated); inflows are counted and skipped with an explanation
 * because revenue belongs to invoices, not expenses.
 */
export default function BankImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { expenses, addExpense } = useStore();
  const addToast = useToasts((s) => s.add);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ParsedBankRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [income, setIncome] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const [mapping, setMapping] = useState<BankColumnMap>({});
  const [category, setCategory] = useState('Other');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const reset = () => {
    setStep(1);
    setRows([]);
    setSkipped(0);
    setIncome(0);
    setDuplicates(0);
    setMapping({});
    setCategory('Other');
    setImporting(false);
    setImported(0);
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const parseFile = async (file: File) => {
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
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
      if (jsonData.length === 0) {
        addToast('No data rows found', 'error');
        setStep(1);
        return;
      }
      const headers = Object.keys(jsonData[0]);
      const map = detectBankColumns(headers);
      if (!map.date || !map.description || (!map.amount && !map.debit && !map.credit)) {
        addToast('Could not find date, description, and amount columns', 'error');
        setStep(1);
        return;
      }
      const stringRows = jsonData.map((row) => {
        const stringRow: Record<string, unknown> = {};
        for (const key of headers) stringRow[key] = row[key];
        return stringRow;
      });
      const { parsed, skipped: bad } = parseBankRows(stringRows, map);
      const existing = new Set(
        expenses.map((e) => expenseFingerprint(e.date, e.amount, e.description)),
      );
      const fresh = parsed.filter((r) => r.direction === 'out');
      const dupes = fresh.filter((r) =>
        existing.has(expenseFingerprint(r.date, r.amount, r.description)),
      ).length;
      setRows(fresh.filter((r) => !existing.has(expenseFingerprint(r.date, r.amount, r.description))));
      setDuplicates(dupes);
      setIncome(parsed.filter((r) => r.direction === 'in').length);
      setSkipped(bad);
      setMapping(map);
      setStep(2);
    } catch {
      addToast('Failed to parse file', 'error');
      setStep(1);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let count = 0;
    try {
      for (const row of rows) {
        await addExpense({
          category,
          description: row.description,
          amount: Math.abs(row.amount),
          date: row.date,
        });
        count += 1;
      }
      setImported(count);
      setStep(3);
    } catch {
      addToast('Import failed partway through', 'error');
    }
    setImporting(false);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import bank statement" size="md">
      {step === 1 && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-[var(--border-color)] rounded-[12px] p-10 text-center hover:border-[var(--accent)]/40 transition-colors cursor-pointer bg-[var(--bg-secondary)]/30"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
              Drop a bank CSV here, or click to browse
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Works with most banks. Outflows import as expenses; inflows are skipped.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                parseFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Columns detected
            {[mapping.date && `date: ${mapping.date}`, mapping.description && `description: ${mapping.description}`, mapping.amount && `amount: ${mapping.amount}`, mapping.debit && `out: ${mapping.debit}`, mapping.credit && `in: ${mapping.credit}`].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Found <strong className="text-[var(--text-primary)]">{rows.length}</strong> expenses to import
            {duplicates > 0 && (
              <span className="text-[var(--text-tertiary)]"> ({duplicates} already imported, skipped)</span>
            )}
            {income > 0 && (
              <span className="text-[var(--text-tertiary)]">. {income} incoming row{income === 1 ? '' : 's'} skipped: revenue belongs to invoices.</span>
            )}
            {skipped > 0 && (
              <span className="text-[var(--text-tertiary)]"> {skipped} unreadable row{skipped === 1 ? '' : 's'} skipped.</span>
            )}
          </p>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Category for all imported rows
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {rows.slice(0, 30).map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <span className="text-[var(--text-primary)] truncate">{r.description}</span>
                <span className="text-[var(--text-secondary)] flex-shrink-0 ml-2">
                  {r.date} · {Math.abs(r.amount).toFixed(2)}
                </span>
              </div>
            ))}
            {rows.length > 30 && (
              <p className="text-xs text-[var(--text-tertiary)] text-center">+ {rows.length - 30} more</p>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)} size="sm" disabled={importing}>
              Back
            </Button>
            <Button onClick={handleImport} size="sm" disabled={importing || rows.length === 0}>
              {importing ? 'Importing...' : <>Import {rows.length} expenses <ArrowRight size={14} /></>}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mx-auto">
            <Check size={20} className="text-[var(--accent-ink,var(--accent))]" />
          </div>
          <p className="text-sm text-[var(--text-primary)] font-medium">
            Imported {imported} expense{imported === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Recategorize anytime from the expenses list.</p>
          <Button onClick={handleClose} size="sm">
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
