/**
 * Prototype Log · Embedded feature.
 * Thin wrapper around PrototypeTracker with embedded-specific tool defaults (Altium, KiCad, EAGLE, other).
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ExternalLink, Layers } from 'lucide-react';

type Prototype = {
  id: string;
  project_id: string;
  tool: string;
  fidelity: string;
  iteration: number;
  link: string;
  feedback: string;
  created_at: string;
};

const TOOLS = ['Altium', 'KiCad', 'EAGLE', 'Figma', 'other'] as const;

const FIDELITY_OPTIONS = ['lo-fi', 'mid-fi', 'hi-fi'] as const;

const fidelityLabel: Record<string, string> = {
  'lo-fi': 'Lo-Fi',
  'mid-fi': 'Mid-Fi',
  'hi-fi': 'Hi-Fi',
};

const fidelityColors: Record<string, string> = {
  'lo-fi': 'bg-[#D97706]/10 text-[#D97706]',
  'mid-fi': 'bg-[#2563EB]/10 text-[#2563EB]',
  'hi-fi': 'bg-[#7C3AED]/10 text-[#7C3AED]',
};

export default function PrototypeLog({ projectId }: { projectId: string }) {
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tool: 'Altium', fidelity: 'mid-fi', link: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  const loadPrototypes = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Prototype & Record<string, unknown>)[]>(
        'SELECT id, project_id, tool, fidelity, iteration, link, feedback, created_at FROM prototypes WHERE project_id = ? ORDER BY iteration DESC, created_at DESC',
        [projectId]
      );
      setPrototypes(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        tool: r.tool as string,
        fidelity: r.fidelity as string,
        iteration: (r.iteration as number) || 1,
        link: r.link as string,
        feedback: r.feedback as string,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[PrototypeLog] loadPrototypes failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadPrototypes(); }, [projectId, loadPrototypes]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      const maxIteration = prototypes.length > 0
        ? Math.max(...prototypes.map(p => p.iteration))
        : 0;
      const nextIteration = maxIteration + 1;
      const id = crypto.randomUUID();
      await db.execute(
        'INSERT INTO prototypes (id, project_id, tool, fidelity, iteration, link, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.tool, form.fidelity, nextIteration, form.link.trim() || null, form.feedback.trim() || null, new Date().toISOString()]
      );
      const item: Prototype = {
        id, project_id: projectId, tool: form.tool, fidelity: form.fidelity,
        iteration: nextIteration,
        link: form.link.trim() || '',
        feedback: form.feedback.trim() || '',
        created_at: new Date().toISOString(),
      };
      setPrototypes(prev => [item, ...prev]);
      setForm({ tool: 'Altium', fidelity: 'mid-fi', link: '', feedback: '' });
      setShowForm(false);
    } catch (e) { console.error('[PrototypeLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM prototypes WHERE id = ?', [id]);
      setPrototypes(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error('[PrototypeLog] delete failed:', e); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Prototypes</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Prototypes ({prototypes.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Prototype
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.tool} onChange={(e) => setForm({ ...form, tool: e.target.value })} className={selectClass}>
              {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.fidelity} onChange={(e) => setForm({ ...form, fidelity: e.target.value })} className={selectClass}>
              {FIDELITY_OPTIONS.map(f => <option key={f} value={f}>{fidelityLabel[f]}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Prototype link (URL)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={inputClass} />
          <textarea
            placeholder="Feedback / notes..."
            value={form.feedback}
            onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Save</Button>
          </div>
        </div>
      )}

      {prototypes.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No prototypes yet. Add your first prototype iteration.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Iter</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Tool</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Fidelity</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Link</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Feedback</th>
                <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Date</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {prototypes.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="py-1.5 px-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent-ink,var(--accent))] text-[10px] font-semibold">
                      <Layers size={10} />
                      v{p.iteration}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-primary)]">{p.tool}</td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fidelityColors[p.fidelity] || ''}`}>
                      {fidelityLabel[p.fidelity] || p.fidelity}
                    </span>
                  </td>
                  <td className="py-1.5 px-2">
                    {p.link ? (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--accent-ink,var(--accent))] hover:underline">
                        <ExternalLink size={10} />
                        Open
                      </a>
                    ) : <span className="text-[var(--text-tertiary)]">--</span>}
                  </td>
                  <td className="py-1.5 px-2 text-[var(--text-secondary)] max-w-[200px] truncate">{p.feedback || '--'}</td>
                  <td className="py-1.5 px-2 text-[var(--text-tertiary)]">{formatDate(p.created_at)}</td>
                  <td className="py-1.5 px-2">
                    <button onClick={() => handleDelete(p.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
