import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Hash } from 'lucide-react';

type RevisionSet = {
  id: string;
  project_id: string;
  set_number: number;
  date?: string;
  changes_summary?: string;
  distributed_to?: string;
};

export default function RevisionSetLog({ projectId }: { projectId: string }) {
  const [sets, setSets] = useState<RevisionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', changes_summary: '', distributed_to: '' });
  const [saving, setSaving] = useState(false);

  const loadSets = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(RevisionSet & Record<string, unknown>)[]>(
        'SELECT id, project_id, set_number, date, changes_summary, distributed_to FROM revision_sets WHERE project_id = ? ORDER BY set_number DESC',
        [projectId]
      );
      setSets(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        set_number: r.set_number as number,
        date: r.date as string | undefined,
        changes_summary: r.changes_summary as string | undefined,
        distributed_to: r.distributed_to as string | undefined,
      })));
    } catch (e) { console.error('[RevisionSetLog] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadSets(); }, [projectId, loadSets]);

  const getNextSetNumber = (): number => {
    const max = sets.reduce((max, s) => Math.max(max, s.set_number), 0);
    return max + 1;
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const setNumber = getNextSetNumber();
      const db = await getDb();
      await db.execute(
        'INSERT INTO revision_sets (id, project_id, set_number, date, changes_summary, distributed_to) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, setNumber, form.date || null, form.changes_summary.trim() || null, form.distributed_to.trim() || null]
      );
      const set: RevisionSet = {
        id, project_id: projectId, set_number: setNumber,
        date: form.date || undefined,
        changes_summary: form.changes_summary.trim() || undefined,
        distributed_to: form.distributed_to.trim() || undefined,
      };
      setSets(prev => [set, ...prev]);
      setForm({ date: '', changes_summary: '', distributed_to: '' });
      setShowForm(false);
    } catch (e) { console.error('[RevisionSetLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM revision_sets WHERE id = ?', [id]);
      setSets(prev => prev.filter(s => s.id !== id));
    } catch (e) { console.error('[RevisionSetLog] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Revision Sets</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Revision Sets ({sets.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Set
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <textarea
            placeholder="Changes summary"
            value={form.changes_summary}
            onChange={(e) => setForm({ ...form, changes_summary: e.target.value })}
            className={inputClass + " resize-none h-16"}
            autoFocus
          />
          <input type="text" placeholder="Distributed to" value={form.distributed_to} onChange={(e) => setForm({ ...form, distributed_to: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      {sets.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No revision sets yet. Add your first set.</p>
      ) : (
        <div className="space-y-1">
          {sets.map((s) => (
            <div key={s.id} className="flex items-start justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[var(--accent-ink,var(--accent))] font-semibold text-sm">
                    <Hash size={12} />
                    {s.set_number}
                  </span>
                  {s.date && <span className="text-[10px] text-[var(--text-tertiary)]">{s.date}</span>}
                </div>
                {s.changes_summary && <p className="text-[var(--text-secondary)] leading-relaxed">{s.changes_summary}</p>}
                {s.distributed_to && <p className="text-[10px] text-[var(--text-tertiary)]">Distributed to: {s.distributed_to}</p>}
              </div>
              <button
                aria-label="Delete revision set log"
                onClick={() => handleDelete(s.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0 mt-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
