/**
 * Stakeholder Log — Product Manager feature.
 * Track project stakeholders with influence level.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Stakeholder = {
  id: string;
  project_id: string;
  name: string;
  role?: string;
  contact?: string;
  influence?: string;
  notes?: string;
};

const INFLUENCE_OPTIONS = ['high', 'medium', 'low'] as const;

const influenceBadge: Record<string, string> = {
  high: 'bg-[#DC2626]/15 text-[#DC2626]',
  medium: 'bg-[#D97706]/15 text-[#D97706]',
  low: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function StakeholderLog({ projectId }: { projectId: string }) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: '',
    contact: '',
    influence: 'medium',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadStakeholders = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Stakeholder & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, role, contact, influence, notes FROM stakeholder_logs WHERE project_id = ? ORDER BY name ASC',
        [projectId]
      );
      setStakeholders(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          name: r.name as string,
          role: r.role as string | undefined,
          contact: r.contact as string | undefined,
          influence: r.influence as string | undefined,
          notes: r.notes as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[StakeholderLog] loadStakeholders failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStakeholders();
  }, [projectId]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO stakeholder_logs (id, project_id, name, role, contact, influence, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.role || null, form.contact || null, form.influence, form.notes || null]
      );
      const item: Stakeholder = {
        id,
        project_id: projectId,
        name: form.name.trim(),
        role: form.role || undefined,
        contact: form.contact || undefined,
        influence: form.influence,
        notes: form.notes || undefined,
      };
      setStakeholders((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', role: '', contact: '', influence: 'medium', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[StakeholderLog] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM stakeholder_logs WHERE id = ?', [id]);
      setStakeholders((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('[StakeholderLog] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Stakeholders</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Stakeholders ({stakeholders.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Stakeholder
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Name"
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
            <input
              type="text"
              placeholder="Contact"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className={inputClass}
            />
          </div>
          <select value={form.influence} onChange={(e) => setForm({ ...form, influence: e.target.value })} className={inputClass}>
            {INFLUENCE_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {stakeholders.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No stakeholders logged yet.</p>
      ) : (
        <div className="space-y-1">
          {stakeholders.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
                {s.role && <span className="text-[var(--text-tertiary)]">{s.role}</span>}
                {s.contact && <span className="text-[10px] text-[var(--text-tertiary)]">{s.contact}</span>}
                {s.influence && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${influenceBadge[s.influence] || influenceBadge.medium}`}>
                    {s.influence}
                  </span>
                )}
                {s.notes && <span className="text-[10px] text-[var(--text-tertiary)] truncate">{s.notes}</span>}
              </div>
              <button onClick={() => handleDelete(s.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
