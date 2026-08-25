/**
 * Incident Log -- DevOps feature.
 * Track incidents with severity, status, and resolution.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Incident = {
  id: string;
  project_id: string;
  title: string;
  severity: string;
  status: string;
  resolved_at?: string;
  notes?: string;
  created_at: string;
};

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;
const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'] as const;

const severityDotColors: Record<string, string> = {
  low: 'text-[#16A34A]',
  medium: 'text-[#D97706]',
  high: 'text-[#DC2626]',
  critical: 'text-[#991B1B]',
};

const severityBadgeClasses: Record<string, string> = {
  low: 'bg-[#16A34A]/15 text-[#16A34A]',
  medium: 'bg-[#D97706]/15 text-[#D97706]',
  high: 'bg-[#DC2626]/15 text-[#DC2626]',
  critical: 'bg-[#991B1B]/15 text-[#991B1B]',
};

const statusBadgeClasses: Record<string, string> = {
  open: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  resolved: 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function IncidentLog({ projectId }: { projectId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', severity: 'medium', status: 'open' });
  const [saving, setSaving] = useState(false);

  const loadIncidents = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Incident & Record<string, unknown>)[]>(
        'SELECT id, project_id, title, severity, status, resolved_at, notes, created_at FROM incidents WHERE project_id = ? ORDER BY CASE severity WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at DESC',
        [projectId]
      );
      setIncidents(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        title: r.title as string,
        severity: r.severity as string,
        status: r.status as string,
        resolved_at: r.resolved_at as string | undefined,
        notes: r.notes as string | undefined,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[IncidentLog] loadIncidents failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadIncidents(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO incidents (id, project_id, title, severity, status, resolved_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), form.severity, form.status, null, null, new Date().toISOString()]
      );
      const incident: Incident = { id, project_id: projectId, title: form.title.trim(), severity: form.severity, status: form.status, resolved_at: undefined, notes: undefined, created_at: new Date().toISOString() };
      setIncidents(prev => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return [incident, ...prev].sort((a, b) => (priorityOrder[a.severity] ?? 2) - (priorityOrder[b.severity] ?? 2));
      });
      setForm({ title: '', severity: 'medium', status: 'open' });
      setShowForm(false);
    } catch (e) { console.error('[IncidentLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM incidents WHERE id = ?', [id]);
      setIncidents(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[IncidentLog] delete failed:', e); }
  };

  const handleResolve = async (id: string) => {
    try {
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute('UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?', ['resolved', now, id]);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved', resolved_at: now } : i));
    } catch (e) { console.error('[IncidentLog] resolve failed:', e); }
  };

  const openCount = incidents.filter(i => i.status !== 'resolved').length;
  const criticalCount = incidents.filter(i => i.status !== 'resolved' && i.severity === 'critical').length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Incidents</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Incidents ({incidents.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Report Incident
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Incident title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={selectClass}>
              {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Add</Button>
          </div>
        </div>
      )}

      {incidents.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No incidents reported yet.</p>
      ) : (
        <div className="space-y-1">
          {incidents.map((incident) => (
            <div key={incident.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertTriangle size={8} className={`${severityDotColors[incident.severity] || severityDotColors.medium} fill-current flex-shrink-0`} />
                <span className={`font-medium ${incident.status === 'resolved' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} truncate`}>
                  {incident.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${severityBadgeClasses[incident.severity] || severityBadgeClasses.medium}`}>
                  {incident.severity}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[incident.status] || statusBadgeClasses.open}`}>
                  {incident.status === 'in_progress' ? 'in progress' : incident.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                {incident.status !== 'resolved' && (
                  <button onClick={() => handleResolve(incident.id)} className="text-[var(--text-tertiary)] hover:text-[#16A34A]">
                    <CheckCircle2 size={12} />
                  </button>
                )}
                <button onClick={() => handleDelete(incident.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 px-3 py-1.5 mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span>{openCount} open</span>
            {criticalCount > 0 && <span className="text-[#DC2626]">{criticalCount} critical</span>}
          </div>
        </div>
      )}
    </div>
  );
}
