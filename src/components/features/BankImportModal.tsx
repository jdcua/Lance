import { useState, useRef, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Upload, ArrowRight, Check, Banknote } from 'lucide-react';
import { useStore } from '../../store';
import { useToasts } from '../../store/toastStore';
import { checkAndNotify } from '../../achievements/notify';
import { sanitizeInput } from '../../utils/sanitize';
import { formatCurrency } from '../../utils/format';
import { celebrationLevel, recordCelebration, celebrationToast } from '../../lib/celebration';
import {
  suggestInvoiceMatches,
  invoiceRemaining,
  type RowMatch,
} from '../../utils/reconcile';
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
 * (deduplicated); inflows match open invoices so a deposit becomes a
 * recorded payment with one confirm — never auto-applied.
 */
export default function BankImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    expenses, addExpense, invoices, payments, clients,
    createPayment, deletePayment, updateInvoice,
    pendingFollowUps, updateFollowUpStatus,
  } = useStore();
  const addToast = useToasts((s) => s.add);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ParsedBankRow[]>([]);
  const [incomeRows, setIncomeRows] = useState<ParsedBankRow[]>([]);
  const [recorded, setRecorded] = useState<Set<number>>(new Set());
  const [recording, setRecording] = useState<number | null>(null);
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
    setIncomeRows([]);
    setRecorded(new Set());
    setRecording(null);
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
      const incoming = parsed.filter((r) => r.direction === 'in');
      setIncomeRows(incoming);
      setRecorded(new Set());
      setIncome(incoming.length);
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

  const matches: RowMatch[] = useMemo(
    () =>
      suggestInvoiceMatches(
        incomeRows,
        invoices,
        payments,
        (id) => clients.find((c) => c.id === id)?.name,
      ),
    [incomeRows, invoices, payments, clients],
  );

  const invoiceById = (id: string) => invoices.find((i) => i.id === id);

  const handleRecordMatch = async (rowIdx: number, invoiceId: string) => {
    const inv = invoiceById(invoiceId);
    const row = incomeRows[rowIdx];
    if (!inv || !row || recording !== null) return;
    // Invoice-side truth: record the remaining balance, never the row.
    // Exact matches agree to the cent; anything else never reaches here.
    const remaining = invoiceRemaining(inv, payments);
    if (remaining <= 0) {
      addToast('That invoice is already fully paid', 'info');
      return;
    }
    setRecording(rowIdx);
    try {
      const prev = { ...inv };
      const payment = await createPayment({
        invoice_id: inv.id,
        amount: Math.round(remaining * 100) / 100,
        payment_date: row.date,
        payment_method: 'Bank Transfer',
        reference: sanitizeInput(row.description).slice(0, 500),
        notes: 'Matched from bank import',
      });
      const updated = useStore
        .getState()
        .payments.filter((p) => p.invoice_id === inv.id);
      const paidTotal = updated.reduce((s, p) => s + p.amount, 0);
      const fullyPaid = Math.round(paidTotal * 100) >= Math.round(inv.total * 100);
      const next = fullyPaid ? 'paid' : paidTotal > 0 ? 'partial' : inv.status;
      if (next !== inv.status) {
        await updateInvoice({
          ...inv,
          status: next as typeof inv.status,
          paid_at: next === 'paid' ? new Date().toISOString() : inv.paid_at,
        });
      }
      if (fullyPaid) {
        const fu = useStore
          .getState()
          .pendingFollowUps.find((f) => f.entity_type === 'invoice' && f.entity_id === inv.id);
        if (fu) await updateFollowUpStatus(fu.id, 'paid', 'auto-resolved').catch(() => {});
        const level = celebrationLevel('invoice-paid');
        if (level === 'full') addToast(celebrationToast('invoice-paid'), 'success');
        else if (level === 'reduced') addToast(celebrationToast('invoice-paid'), 'success');
        recordCelebration('invoice-paid');
      }
      await checkAndNotify(useStore.getState(), addToast);
      setRecorded((prevSet) => new Set(prevSet).add(rowIdx));
      addToast(`Matched ${inv.invoice_number} — payment recorded.`, 'success', undefined, [
        {
          label: 'Undo',
          onClick: async () => {
            try {
              await deletePayment(payment.id);
              await updateInvoice(prev);
              setRecorded((prevSet) => {
                const nextSet = new Set(prevSet);
                nextSet.delete(rowIdx);
                return nextSet;
              });
              addToast('Undone — payment removed, status restored.', 'info');
            } catch (err) {
              addToast(`Couldn't undo: ${String(err)}`, 'error');
            }
          },
        },
      ]);
    } catch (err) {
      addToast(`Couldn't record payment: ${String(err)}`, 'error');
    } finally {
      setRecording(null);
    }
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
              Works with most banks. Outflows import as expenses; inflows match open invoices below.
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
              <span className="text-[var(--text-tertiary)]">. {income} incoming row{income === 1 ? '' : 's'} below — match them to invoices.</span>
            )}
            {skipped > 0 && (
              <span className="text-[var(--text-tertiary)]"> {skipped} unreadable row{skipped === 1 ? '' : 's'} skipped.</span>
            )}
          </p>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Category for all imported rows
            </label>
            <select aria-label="Category"
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
          {matches.length > 0 && (
            <div className="pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-2 mt-1">
                <Banknote size={14} className="text-[var(--accent-ink,var(--accent))]" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Incoming deposits matched to invoices
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
                Confirm each one — recording creates the real payment with the invoice's
                remaining balance, never the row alone.
              </p>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {matches.map((m, i) => {
                  const top = m.matches[0];
                  const inv = top ? invoiceById(top.invoiceId) : undefined;
                  const done = recorded.has(i);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[var(--text-primary)] truncate">{m.row.description}</p>
                        <p className="text-[var(--text-tertiary)]">
                          {m.row.date} · {formatCurrency(m.row.amount)}
                          {inv && top && (
                            <> → {inv.invoice_number} ({top.confidence})</>
                          )}
                          {!inv && ' · no open invoice matches'}
                        </p>
                        {inv && top && (
                          <p className="text-[var(--text-tertiary)] truncate" title={top.reasons.join(' · ')}>
                            {top.reasons.join(' · ')}
                          </p>
                        )}
                      </div>
                      {inv && top && !done && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={recording !== null}
                          onClick={() => handleRecordMatch(i, top.invoiceId)}
                        >
                          {recording === i ? 'Recording…' : 'Record payment'}
                        </Button>
                      )}
                      {done && (
                        <span className="text-[11px] font-medium text-[var(--accent-ink,var(--accent))] flex-shrink-0">
                          Recorded
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
