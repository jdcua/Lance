/**
 * Compliance Framework Log — Cybersecurity feature.
 * Track compliance controls with framework name, control ID, status, and evidence.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, FileCheck, CheckCircle2 } from 'lucide-react';

type ComplianceItem = {
  id: string;
  project_id: string;
  framework_name: string;
  control_id: string;
  description: string;
  status: string;
  evidence: string;
  last_review: string;
};

const STATUS_OPTIONS = ['compliant', 'non_compliant', 'in_progress', 'not_applicable'] as const;

const statusBadgeClasses: Record<string, string> = {
  compliant: 'bg-[#16A34A]/15 text-[#16A34A]',
  non_compliant: 'bg-[#DC2626]/15 text-[#DC2626]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  not_applicable: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

export default function ComplianceFrameworkLog({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ framework_name: '', control_id: '', description: '', status: 'in_progress', evidence: '', last_review: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ComplianceItem & Record<string, unknown>)[]>(
        'SELECT * FROM compliance_frameworks WHERE project_id = ? ORDER BY framework_name, control_id',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        framework_name: r.framework_name as string,
        control_id: r.control_id as string,
        description: r.description as string,
        status: r.status as string,
        evidence: r.evidence as string,
        last_review: r.last_review as string,
      })));
    } catch (e) { console.error('[ComplianceFrameworkLog] loadItems failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.control_id.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO compliance_frameworks (id, project_id, framework_name, control_id, description, status, evidence, last_review) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.framework_name.trim() || null, form.control_id.trim(), form.description.trim() || null, form.status, form.evidence.trim() || null, form.last_review || null]
      );
      const item: ComplianceItem = {
        id, project_id: projectId, framework_name: form.framework_name.trim() || '',
        control_id: form.control_id.trim(), description: form.description.trim() || '',
        status: form.status, evidence: form.evidence.trim() || '', last_review: form.last_review,
      };
      setItems(prev => [...prev, item].sort((a, b) => a.framework_name.localeCompare(b.framework_name) || a.control_id.localeCompare(b.control_id)));
      setForm({ framework_name: '', control_id: '', description: '', status: 'in_progress', evidence: '', last_review: new Date().toISOString().split('T')[0] });
      setShowForm(false);
    } catch (e) { console.error('[ComplianceFrameworkLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM compliance_frameworks WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[ComplianceFrameworkLog] delete failed:', e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE compliance_frameworks SET status = ? WHERE id = ?', [status, id]);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch (e) { console.error('[ComplianceFrameworkLog] status update failed:', e); }
  };

  const compliantCount = items.filter(i => i.status === 'compliant').length;
  const nonCompliantCount = items.filter(i => i.status === 'non_compliant').length;

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Compliance</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Compliance ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Control
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Framework (e.g. SOC2, ISO27001)" value={form.framework_name} onChange={(e) => setForm({ ...form, framework_name: e.target.value })} className={inputClass} autoFocus />
            <input type="text" placeholder="Control ID (e.g. CC5.1)" value={form.control_id} onChange={(e) => setForm({ ...form, control_id: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <input type="date" value={form.last_review} onChange={(e) => setForm({ ...form, last_review: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Evidence / reference" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} className={inputClass} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.control_id.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No compliance controls added yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileCheck size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="font-medium text-[var(--text-primary)] truncate hover:underline text-left"
                  >
                    {item.framework_name || 'No Framework'} — {item.control_id}
                  </button>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[item.status] || ''}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  {item.last_review && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{item.last_review}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    className="text-[10px] bg-transparent border-none text-[var(--text-tertiary)] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D]">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === item.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-[6px] text-xs space-y-1">
                  {item.description && <p className="text-[var(--text-secondary)]">{item.description}</p>}
                  {item.evidence && <p className="text-[var(--text-tertiary)]">Evidence: {item.evidence}</p>}
                  {!item.description && !item.evidence && <p className="text-[var(--text-tertiary)] italic">No additional details.</p>}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 px-3 py-1.5 mt-1 text-[10px] text-[var(--text-tertiary)]">
            <span className="text-[#16A34A]">{compliantCount} compliant</span>
            {nonCompliantCount > 0 && <span className="text-[#DC2626]">{nonCompliantCount} non-compliant</span>}
          </div>
        </div>
      )}
    </div>
  );
}
