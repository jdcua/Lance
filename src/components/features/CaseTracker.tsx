/**
 * Case Tracker · Legal feature.
 * List of legal cases with status badges.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Briefcase } from 'lucide-react';

type Case = {
  id: string;
  client_id: string;
  case_number?: string;
  title?: string;
  status: string;
  filed_date?: string;
  court?: string;
  notes?: string;
};

const STATUSES = ['active', 'closed', 'on-hold'] as const;

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-[#2563EB]/15 text-[#2563EB]',
  closed: 'bg-[#16A34A]/15 text-[#16A34A]',
  'on-hold': 'bg-[#D97706]/15 text-[#D97706]',
};

export default function CaseTracker({ clientId }: { clientId: string }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    case_number: '',
    title: '',
    status: 'active',
    filed_date: '',
    court: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadCases = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Case & Record<string, unknown>)[]>(
        'SELECT id, client_id, case_number, title, status, filed_date, court, notes FROM cases WHERE client_id = ? ORDER BY filed_date DESC, id DESC',
        [clientId],
      );
      setCases(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          case_number: r.case_number as string | undefined,
          title: r.title as string | undefined,
          status: r.status as string,
          filed_date: r.filed_date as string | undefined,
          court: r.court as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[CaseTracker] load failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadCases();
  }, [clientId, loadCases]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO cases (id, client_id, case_number, title, status, filed_date, court, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.case_number.trim() || null,
          form.title.trim(),
          form.status,
          form.filed_date || null,
          form.court.trim() || null,
          form.notes.trim() || null,
        ],
      );
      const c: Case = {
        id,
        client_id: clientId,
        case_number: form.case_number.trim() || undefined,
        title: form.title.trim(),
        status: form.status,
        filed_date: form.filed_date || undefined,
        court: form.court.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      setCases((prev) =>
        [c, ...prev].sort((a, b) => (b.filed_date || '').localeCompare(a.filed_date || '')),
      );
      setForm({
        case_number: '',
        title: '',
        status: 'active',
        filed_date: '',
        court: '',
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[CaseTracker] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM cases WHERE id = ?', [id]);
      setCases((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[CaseTracker] delete failed:', e);
    }
  };

  const activeCount = cases.filter((c) => c.status === 'active').length;
  const closedCount = cases.filter((c) => c.status === 'closed').length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Cases
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Cases ({cases.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Case
        </Button>
      </div>

      {cases.length > 0 && (
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Briefcase size={11} className="text-[var(--text-tertiary)]" />
            <span className="font-medium">{activeCount}</span> active
          </span>
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <span className="font-medium">{closedCount}</span> closed
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Case number"
              value={form.case_number}
              onChange={(e) => setForm({ ...form, case_number: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              aria-label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.filed_date}
              onChange={(e) => setForm({ ...form, filed_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Court"
              value={form.court}
              onChange={(e) => setForm({ ...form, court: e.target.value })}
              className={inputClass}
            />
          </div>
          <input
            type="text"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {cases.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No cases yet. Add your first case.
        </p>
      ) : (
        <div className="space-y-1">
          {cases.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Briefcase size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                {c.case_number && (
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex-shrink-0">
                    {c.case_number}
                  </span>
                )}
                <span className="font-medium text-[var(--text-primary)] truncate">
                  {c.title || '--'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadgeClasses[c.status] || ''}`}
                >
                  {c.status}
                </span>
                {c.court && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-auto">
                    {c.court}
                  </span>
                )}
              </div>
              <button
                aria-label="Delete case tracker"
                onClick={() => handleDelete(c.id)}
                className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
