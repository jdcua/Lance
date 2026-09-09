import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, DollarSign, User } from 'lucide-react';

type ArchConsultant = {
  id: string;
  project_id: string;
  name: string;
  discipline?: string;
  fee?: number;
  fee_type?: string;
  status: string;
};

const DISCIPLINES = ['structural', 'MEP', 'civil', 'landscape', 'geotechnical', 'other'];
const FEE_TYPES = ['fixed', 'percentage', 'hourly'];
const STATUSES = ['contracted', 'invoiced', 'paid'];

const statusBadgeClasses: Record<string, string> = {
  contracted: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  invoiced: 'bg-[#3498DB]/15 text-[#3498DB]',
  paid: 'bg-[#2ECC71]/15 text-[#2ECC71]',
};

export default function ConsultantLog({ projectId }: { projectId: string }) {
  const [consultants, setConsultants] = useState<ArchConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', discipline: DISCIPLINES[0], fee: '', fee_type: FEE_TYPES[0], status: STATUSES[0] });
  const [saving, setSaving] = useState(false);

  const loadConsultants = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ArchConsultant & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, discipline, fee, fee_type, status FROM arch_consultants WHERE project_id = ? ORDER BY name ASC',
        [projectId]
      );
      setConsultants(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string,
        discipline: r.discipline as string | undefined,
        fee: r.fee as number | undefined,
        fee_type: r.fee_type as string | undefined,
        status: r.status as string,
      })));
    } catch (e) { console.error('[ConsultantLog] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadConsultants(); }, [projectId, loadConsultants]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO arch_consultants (id, project_id, name, discipline, fee, fee_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.discipline, form.fee ? parseFloat(form.fee) : null, form.fee_type, form.status]
      );
      const consultant: ArchConsultant = {
        id, project_id: projectId, name: form.name.trim(), discipline: form.discipline,
        fee: form.fee ? parseFloat(form.fee) : undefined, fee_type: form.fee_type, status: form.status,
      };
      setConsultants(prev => [...prev, consultant]);
      setForm({ name: '', discipline: DISCIPLINES[0], fee: '', fee_type: FEE_TYPES[0], status: STATUSES[0] });
      setShowForm(false);
    } catch (e) { console.error('[ConsultantLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM arch_consultants WHERE id = ?', [id]);
      setConsultants(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[ConsultantLog] delete failed:', e); }
  };

  const totalCost = consultants.reduce((sum, c) => sum + (c.fee || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Consultants</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Consultants ({consultants.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Consultant
        </Button>
      </div>

      {consultants.length > 0 && (
        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[8px] text-xs">
          <span className="text-[var(--text-tertiary)]">
            <DollarSign size={10} className="inline mr-0.5" />
            Total consultant cost: <span className="font-medium text-[var(--accent)]">${totalCost.toFixed(2)}</span>
          </span>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Consultant name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} className={inputClass}>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Fee" step="0.01" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className={inputClass} />
            <select value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })} className={inputClass}>
              {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {consultants.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No consultants yet. Add your first consultant.</p>
      ) : (
        <div className="space-y-1">
          {consultants.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <User size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)]">{c.name}</span>
                {c.discipline && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{c.discipline}</span>}
                {c.fee_type && <span className="text-[10px] text-[var(--text-tertiary)]">{c.fee_type}</span>}
                {c.fee != null && <span className="text-[var(--accent)] font-medium">${c.fee.toFixed(2)}</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadgeClasses[c.status] || statusBadgeClasses.contracted}`}>{c.status}</span>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
