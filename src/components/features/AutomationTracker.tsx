/**
 * Automation Tracker -- DevOps feature.
 * Manage automations with type, frequency, and active/inactive toggle.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Zap, Play, Pause, Calendar } from 'lucide-react';

type Automation = {
  id: string;
  project_id: string;
  name: string;
  type: string;
  frequency?: string;
  last_run?: string;
  status: string;
};

const TYPE_OPTIONS = ['script', 'cron', 'ci-cd', 'webhook', 'other'] as const;
const STATUS_OPTIONS = ['active', 'inactive', 'error'] as const;

const typeBadgeClasses: Record<string, string> = {
  script: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  cron: 'bg-[#2563EB]/15 text-[#2563EB]',
  'ci-cd': 'bg-[#D97706]/15 text-[#D97706]',
  webhook: 'bg-[#059669]/15 text-[#059669]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-[#16A34A]/15 text-[#16A34A]',
  inactive: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
  error: 'bg-[#DC2626]/15 text-[#DC2626]',
};

export default function AutomationTracker({ projectId }: { projectId: string }) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'script', frequency: '', last_run: '' });
  const [saving, setSaving] = useState(false);

  const loadAutomations = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Automation & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, type, frequency, last_run, status FROM automations WHERE project_id = ? ORDER BY name ASC',
        [projectId]
      );
      setAutomations(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string,
        type: r.type as string,
        frequency: r.frequency as string | undefined,
        last_run: r.last_run as string | undefined,
        status: r.status as string,
      })));
    } catch (e) { console.error('[AutomationTracker] loadAutomations failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadAutomations(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO automations (id, project_id, name, type, frequency, last_run, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.type, form.frequency || null, form.last_run || null, 'active']
      );
      const automation: Automation = { id, project_id: projectId, name: form.name.trim(), type: form.type, frequency: form.frequency || undefined, last_run: form.last_run || undefined, status: 'active' };
      setAutomations(prev => [...prev, automation].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', type: 'script', frequency: '', last_run: '' });
      setShowForm(false);
    } catch (e) { console.error('[AutomationTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM automations WHERE id = ?', [id]);
      setAutomations(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error('[AutomationTracker] delete failed:', e); }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const db = await getDb();
      await db.execute('UPDATE automations SET status = ? WHERE id = ?', [nextStatus, id]);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
    } catch (e) { console.error('[AutomationTracker] toggle failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Automations</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Automations ({automations.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Automation
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Automation name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectClass}>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder="Frequency (e.g. daily, hourly)" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inputClass} />
          </div>
          <input type="date" placeholder="Last run date" value={form.last_run} onChange={(e) => setForm({ ...form, last_run: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {automations.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No automations configured yet.</p>
      ) : (
        <div className="space-y-1">
          {automations.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Zap size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)] truncate">{a.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadgeClasses[a.type] || typeBadgeClasses.other}`}>
                  {a.type}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[a.status] || statusBadgeClasses.inactive}`}>
                  {a.status}
                </span>
                {a.frequency && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{a.frequency}</span>
                )}
                {a.last_run && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5 flex-shrink-0">
                    <Calendar size={9} />
                    {formatDate(a.last_run)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                <button onClick={() => handleToggleStatus(a.id, a.status)} className="text-[var(--text-tertiary)] hover:text-[var(--accent)]" title={a.status === 'active' ? 'Deactivate' : 'Activate'}>
                  {a.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button onClick={() => handleDelete(a.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
