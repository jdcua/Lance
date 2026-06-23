/**
 * Gas Tracker — Blockchain feature.
 * Log gas usage with running total at top.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Flame, DollarSign } from 'lucide-react';

type GasEntry = {
  id: string;
  project_id: string;
  network?: string;
  gas_used: number;
  cost_native: number;
  cost_usd: number;
  date?: string;
};

const NETWORKS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche', 'other'] as const;

export default function GasTracker({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<GasEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ network: 'ethereum', gas_used: '', cost_native: '', cost_usd: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(GasEntry & Record<string, unknown>)[]>(
        'SELECT id, project_id, network, gas_used, cost_native, cost_usd, date FROM gas_tracker WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId]
      );
      setEntries(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        network: r.network as string | undefined,
        gas_used: r.gas_used as number,
        cost_native: r.cost_native as number,
        cost_usd: r.cost_usd as number,
        date: r.date as string | undefined,
      })));
    } catch (e) { console.error('[GasTracker] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [projectId]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO gas_tracker (id, project_id, network, gas_used, cost_native, cost_usd, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.network, form.gas_used ? parseFloat(form.gas_used) : 0, form.cost_native ? parseFloat(form.cost_native) : 0, form.cost_usd ? parseFloat(form.cost_usd) : 0, form.date || null]
      );
      const entry: GasEntry = { id, project_id: projectId, network: form.network, gas_used: form.gas_used ? parseFloat(form.gas_used) : 0, cost_native: form.cost_native ? parseFloat(form.cost_native) : 0, cost_usd: form.cost_usd ? parseFloat(form.cost_usd) : 0, date: form.date || undefined };
      setEntries(prev => [entry, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      setForm({ network: 'ethereum', gas_used: '', cost_native: '', cost_usd: '', date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
    } catch (e) { console.error('[GasTracker] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM gas_tracker WHERE id = ?', [id]);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error('[GasTracker] delete failed:', e); }
  };

  const totalGas = entries.reduce((sum, e) => sum + (e.gas_used || 0), 0);
  const totalCostUSD = entries.reduce((sum, e) => sum + (e.cost_usd || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Gas Tracker</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Gas Tracker ({entries.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Gas
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <Flame size={10} /> Total Gas
            </span>
            <span className="font-medium text-[var(--text-primary)]">{totalGas.toLocaleString()}</span>
          </div>
          <div className="px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
            <span className="text-[var(--text-tertiary)] flex items-center gap-1">
              <DollarSign size={10} /> Total Cost
            </span>
            <span className="font-medium text-[var(--text-primary)]">${totalCostUSD.toFixed(2)}</span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className={inputClass}>
              {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="0.01" placeholder="Gas used" value={form.gas_used} onChange={(e) => setForm({ ...form, gas_used: e.target.value })} className={inputClass} />
            <input type="number" step="0.0001" placeholder="Cost (native)" value={form.cost_native} onChange={(e) => setForm({ ...form, cost_native: e.target.value })} className={inputClass} />
            <input type="number" step="0.01" placeholder="Cost (USD)" value={form.cost_usd} onChange={(e) => setForm({ ...form, cost_usd: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No gas entries logged yet. Add your first entry.</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {entry.network && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] flex-shrink-0">{entry.network}</span>
                )}
                <span className="text-[var(--text-primary)] flex items-center gap-0.5">
                  <Flame size={10} className="text-[var(--text-tertiary)]" /> {(entry.gas_used || 0).toLocaleString()}
                </span>
                <span className="text-[var(--text-tertiary)]">{(entry.cost_native || 0).toFixed(4)} ETH</span>
                <span className="text-[var(--text-tertiary)] flex items-center gap-0.5 ml-auto">
                  <DollarSign size={10} /> ${(entry.cost_usd || 0).toFixed(2)}
                </span>
              </div>
              <button onClick={() => handleDelete(entry.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
