/**
 * Candidate Pipeline · Recruiter feature.
 * Kanban-style board by status: sourced, screening, interview, offer, hired, rejected.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Candidate = {
  id: string;
  client_id: string;
  name: string;
  role: string;
  status: string;
  source: string;
  contact: string;
  notes: string;
  created_at: string;
};

const COLUMNS = [
  { key: 'sourced', label: 'Sourced' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
] as const;

const columnColors: Record<string, string> = {
  sourced: 'bg-[var(--border-color)]',
  screening: 'bg-[#2563EB]',
  interview: 'bg-[#7C3AED]',
  offer: 'bg-[#D97706]',
  hired: 'bg-[#16A34A]',
  rejected: 'bg-[#DC2626]',
};

const SOURCE_OPTIONS = ['LinkedIn', 'Referral', 'Job Board', 'Agency', 'Direct', 'Other'] as const;

export default function CandidatePipeline({ clientId }: { clientId: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    role: '',
    status: 'sourced',
    source: 'LinkedIn',
    contact: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadCandidates = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Candidate & Record<string, unknown>)[]>(
        'SELECT * FROM candidates WHERE client_id = ? ORDER BY created_at DESC',
        [clientId],
      );
      setCandidates(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          name: r.name as string,
          role: r.role as string,
          status: r.status as string,
          source: r.source as string,
          contact: r.contact as string,
          notes: r.notes as string,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[CandidatePipeline] loadCandidates failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadCandidates();
  }, [clientId, loadCandidates]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO candidates (id, client_id, name, role, status, source, contact, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.name.trim(),
          form.role.trim() || null,
          form.status,
          form.source,
          form.contact.trim() || null,
          form.notes.trim() || null,
          new Date().toISOString(),
        ],
      );
      const candidate: Candidate = {
        id,
        client_id: clientId,
        name: form.name.trim(),
        role: form.role.trim() || '',
        status: form.status,
        source: form.source,
        contact: form.contact.trim() || '',
        notes: form.notes.trim() || '',
        created_at: new Date().toISOString(),
      };
      setCandidates((prev) => [candidate, ...prev]);
      setForm({
        name: '',
        role: '',
        status: 'sourced',
        source: 'LinkedIn',
        contact: '',
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[CandidatePipeline] add failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM candidates WHERE id = ?', [id]);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[CandidatePipeline] delete failed:', e);
    }
  };

  const handleMove = async (id: string, newStatus: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE candidates SET status = ? WHERE id = ?', [newStatus, id]);
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    } catch (e) {
      console.error('[CandidatePipeline] move failed:', e);
    }
  };

  const columnCandidates = (status: string) => candidates.filter((c) => c.status === status);
  const totalCount = candidates.length;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';
  const selectClass =
    'w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Pipeline
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse w-16 mb-1" />
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="h-12 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Pipeline ({totalCount})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Candidate
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Candidate name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            />
            <select
              aria-label="Source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className={selectClass}
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Contact (email/phone)"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            className={inputClass}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {candidates.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No candidates in the pipeline yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {COLUMNS.map((col) => {
            const items = columnCandidates(col.key);
            return (
              <div key={col.key} className="space-y-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-2 h-2 rounded-full ${columnColors[col.key] || ''}`} />
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    {col.label}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{items.length}</span>
                </div>
                {items.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="bg-[var(--bg-secondary)] rounded-[6px] p-2 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpanded(expanded === candidate.id ? null : candidate.id)}
                        className="font-medium text-[var(--text-primary)] truncate text-left hover:underline flex-1"
                      >
                        {candidate.name}
                      </button>
                      <button
                        aria-label="Delete candidate pipeline"
                        onClick={() => handleDelete(candidate.id)}
                        className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-1 flex-shrink-0"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {candidate.role && (
                      <p className="text-[10px] text-[var(--text-tertiary)]">{candidate.role}</p>
                    )}
                    {candidate.contact && (
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {candidate.contact}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 pt-1 border-t border-[var(--border-color)]/50">
                      <select aria-label="Candidate.status"
                        value={candidate.status}
                        onChange={(e) => handleMove(candidate.id, e.target.value)}
                        className="text-[9px] bg-transparent border border-[var(--border-color)] rounded-[4px] px-1 py-0.5 text-[var(--text-tertiary)] cursor-pointer w-full"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-[10px] text-[var(--text-tertiary)] px-1 italic">--</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
