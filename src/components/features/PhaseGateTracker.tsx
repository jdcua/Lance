import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Check, Circle } from 'lucide-react';

type ArchPhase = {
  id: string;
  project_id: string;
  phase_name: string;
  completion_percent: number;
  invoice_trigger: boolean;
  completed: boolean;
  sort_order: number;
};

const DEFAULT_PHASES = [
  'Schematic Design',
  'Design Development',
  'Construction Documents',
  'Construction Administration',
];

export default function PhaseGateTracker({ projectId }: { projectId: string }) {
  const [phases, setPhases] = useState<ArchPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phase_name: '', completion_percent: 0, invoice_trigger: false });
  const [saving, setSaving] = useState(false);

  const loadPhases = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ArchPhase & Record<string, unknown>)[]>(
        'SELECT id, project_id, phase_name, completion_percent, invoice_trigger, completed, sort_order FROM arch_phases WHERE project_id = ? ORDER BY sort_order ASC',
        [projectId]
      );
      const loaded = rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        phase_name: r.phase_name as string,
        completion_percent: r.completion_percent as number,
        invoice_trigger: !!(r.invoice_trigger),
        completed: !!(r.completed),
        sort_order: r.sort_order as number,
      }));
      if (loaded.length === 0) {
        const created: ArchPhase[] = [];
        for (let i = 0; i < DEFAULT_PHASES.length; i++) {
          const id = crypto.randomUUID();
          await db.execute(
            'INSERT INTO arch_phases (id, project_id, phase_name, completion_percent, invoice_trigger, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, projectId, DEFAULT_PHASES[i], 0, 0, 0, i]
          );
          created.push({ id, project_id: projectId, phase_name: DEFAULT_PHASES[i], completion_percent: 0, invoice_trigger: false, completed: false, sort_order: i });
        }
        setPhases(created);
      } else {
        setPhases(loaded);
      }
    } catch (e) { console.error('[PhaseGateTracker] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadPhases(); }, [projectId, loadPhases]);

  const handleAdd = async () => {
    if (!form.phase_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const sortOrder = phases.length;
      const db = await getDb();
      await db.execute(
        'INSERT INTO arch_phases (id, project_id, phase_name, completion_percent, invoice_trigger, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.phase_name.trim(), form.completion_percent, form.invoice_trigger ? 1 : 0, 0, sortOrder]
      );
      const phase: ArchPhase = {
        id, project_id: projectId, phase_name: form.phase_name.trim(),
        completion_percent: form.completion_percent, invoice_trigger: form.invoice_trigger,
        completed: false, sort_order: sortOrder,
      };
      setPhases(prev => [...prev, phase]);
      setForm({ phase_name: '', completion_percent: 0, invoice_trigger: false });
      setShowForm(false);
    } catch (e) { console.error('[PhaseGateTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM arch_phases WHERE id = ?', [id]);
      setPhases(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error('[PhaseGateTracker] delete failed:', e); }
  };

  const handlePercentChange = async (id: string, percent: number) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE arch_phases SET completion_percent = ? WHERE id = ?', [percent, id]);
      setPhases(prev => prev.map(p => p.id === id ? { ...p, completion_percent: percent } : p));
    } catch (e) { console.error('[PhaseGateTracker] update percent failed:', e); }
  };

  const handleToggleInvoice = async (id: string, val: boolean) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE arch_phases SET invoice_trigger = ? WHERE id = ?', [val ? 1 : 0, id]);
      setPhases(prev => prev.map(p => p.id === id ? { ...p, invoice_trigger: val } : p));
    } catch (e) { console.error('[PhaseGateTracker] toggle invoice failed:', e); }
  };

  const handleToggleComplete = async (id: string, val: boolean) => {
    try {
      const pct = val ? 100 : 0;
      const db = await getDb();
      await db.execute('UPDATE arch_phases SET completed = ?, completion_percent = ? WHERE id = ?', [val ? 1 : 0, pct, id]);
      setPhases(prev => prev.map(p => p.id === id ? { ...p, completed: val, completion_percent: pct } : p));
    } catch (e) { console.error('[PhaseGateTracker] toggle complete failed:', e); }
  };

  const overallPercent = phases.length > 0
    ? Math.round(phases.reduce((sum, p) => sum + p.completion_percent, 0) / phases.length)
    : 0;

  const completedCount = phases.filter(p => p.completed).length;

  const barColor = overallPercent === 100 ? 'bg-[#2ECC71]' : overallPercent >= 50 ? 'bg-[#F1C40F]' : 'bg-[var(--border-color)]';

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Phase Gates</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Phase Gates ({completedCount}/{phases.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Phase
        </Button>
      </div>

      {phases.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <span>Overall progress: {overallPercent}%</span>
          </div>
          <div className="h-2 w-full bg-[var(--border-color)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-colors ${barColor}`} style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input type="text" placeholder="Phase name" value={form.phase_name} onChange={(e) => setForm({ ...form, phase_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-tertiary)]">Start %:</span>
              <input type="range" min="0" max="100" value={form.completion_percent} onChange={(e) => setForm({ ...form, completion_percent: parseInt(e.target.value) })} className="flex-1 accent-[var(--accent)]" />
              <span className="text-[var(--text-primary)] w-8 text-right">{form.completion_percent}%</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={form.invoice_trigger} onChange={(e) => setForm({ ...form, invoice_trigger: e.target.checked })} className="accent-[var(--accent)]" />
            Invoice on completion
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.phase_name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {phases.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No phases yet. Add your first phase gate.</p>
      ) : (
        <div className="space-y-1">
          {phases.map((phase) => (
            <div key={phase.id} className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs ${phase.completed ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleComplete(phase.id, !phase.completed)} className="flex-shrink-0">
                    {phase.completed ? <Check size={14} className="text-[#2ECC71]" /> : <Circle size={14} className="text-[var(--text-tertiary)]" />}
                  </button>
                  <span className={`font-medium ${phase.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>{phase.phase_name}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{phase.completion_percent}%</span>
                  {phase.invoice_trigger && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink,var(--accent))]">invoice</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={phase.completion_percent}
                    onChange={(e) => handlePercentChange(phase.id, parseInt(e.target.value))}
                    className="flex-1 h-1 accent-[var(--accent)]"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={phase.invoice_trigger}
                      onChange={(e) => handleToggleInvoice(phase.id, e.target.checked)}
                      className="accent-[var(--accent)] w-3 h-3"
                    />
                    invoice
                  </label>
                </div>
              </div>
              <button
                aria-label="Delete phase gate tracker"
                onClick={() => handleDelete(phase.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
