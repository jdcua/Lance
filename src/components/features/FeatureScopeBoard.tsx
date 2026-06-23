/**
 * Feature Scope Board — Game Developer feature.
 * Grouped list by priority (must/should/nice-to-have) with status, hours, and scope indicator.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

type GameFeature = {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  status: string;
  hours_estimated?: number;
  hours_actual?: number;
  sort_order: number;
};

const PRIORITY_GROUPS = [
  { key: 'must', label: 'Must Have', color: 'text-[#DC2626]', bg: 'bg-[#DC2626]/10', border: 'border-l-[#DC2626]' },
  { key: 'should', label: 'Should Have', color: 'text-[#D97706]', bg: 'bg-[#D97706]/10', border: 'border-l-[#D97706]' },
  { key: 'nice-to-have', label: 'Nice to Have', color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10', border: 'border-l-[#16A34A]' },
];

const STATUS_OPTIONS = ['backlog', 'in_progress', 'done', 'cut'] as const;

const statusBadgeClasses: Record<string, string> = {
  backlog: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
  in_progress: 'bg-[#2563EB]/15 text-[#2563EB]',
  done: 'bg-[#16A34A]/15 text-[#16A34A]',
  cut: 'bg-[#DC2626]/10 text-[#DC2626] line-through',
};

const priorityBadgeClasses: Record<string, string> = {
  must: 'bg-[#DC2626]/15 text-[#DC2626]',
  should: 'bg-[#D97706]/15 text-[#D97706]',
  'nice-to-have': 'bg-[#16A34A]/15 text-[#16A34A]',
};

export default function FeatureScopeBoard({ projectId }: { projectId: string }) {
  const [features, setFeatures] = useState<GameFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'should', status: 'backlog', hours_estimated: '' });
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GameFeature>>({});

  const loadFeatures = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(GameFeature & Record<string, unknown>)[]>(
        "SELECT id, project_id, title, priority, status, hours_estimated, hours_actual, sort_order FROM game_features WHERE project_id = ? ORDER BY CASE priority WHEN 'must' THEN 0 WHEN 'should' THEN 1 WHEN 'nice-to-have' THEN 2 END, sort_order ASC",
        [projectId]
      );
      setFeatures(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        title: r.title as string,
        priority: r.priority as string,
        status: r.status as string,
        hours_estimated: r.hours_estimated as number | undefined,
        hours_actual: r.hours_actual as number | undefined,
        sort_order: r.sort_order as number,
      })));
    } catch (e) { console.error('[FeatureScopeBoard] loadFeatures failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadFeatures(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const maxOrder = features.filter(f => f.priority === form.priority).length;
      await db.execute(
        'INSERT INTO game_features (id, project_id, title, priority, status, hours_estimated, hours_actual, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.title.trim(), form.priority, form.status, form.hours_estimated ? parseFloat(form.hours_estimated) : null, null, maxOrder]
      );
      const feat: GameFeature = {
        id,
        project_id: projectId,
        title: form.title.trim(),
        priority: form.priority,
        status: form.status,
        hours_estimated: form.hours_estimated ? parseFloat(form.hours_estimated) : undefined,
        hours_actual: undefined,
        sort_order: maxOrder,
      };
      setFeatures(prev => [...prev, feat].sort((a, b) => {
        const pOrder: Record<string, number> = { must: 0, should: 1, 'nice-to-have': 2 };
        return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
      }));
      setForm({ title: '', priority: 'should', status: 'backlog', hours_estimated: '' });
      setShowForm(false);
    } catch (e) { console.error('[FeatureScopeBoard] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM game_features WHERE id = ?', [id]);
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (e) { console.error('[FeatureScopeBoard] delete failed:', e); }
  };

  const handleEditToggle = (feature: GameFeature) => {
    if (editingId === feature.id) {
      setEditingId(null);
      setEditForm({});
    } else {
      setEditingId(feature.id);
      setEditForm({
        title: feature.title,
        priority: feature.priority,
        status: feature.status,
        hours_estimated: feature.hours_estimated,
        hours_actual: feature.hours_actual,
      });
    }
  };

  const handleEditSave = async (featureId: string) => {
    try {
      const db = await getDb();
      const updates: string[] = [];
      const values: unknown[] = [];
      if (editForm.title !== undefined) { updates.push('title = ?'); values.push(editForm.title); }
      if (editForm.priority !== undefined) { updates.push('priority = ?'); values.push(editForm.priority); }
      if (editForm.status !== undefined) { updates.push('status = ?'); values.push(editForm.status); }
      if (editForm.hours_estimated !== undefined) { updates.push('hours_estimated = ?'); values.push(editForm.hours_estimated); }
      if (editForm.hours_actual !== undefined) { updates.push('hours_actual = ?'); values.push(editForm.hours_actual); }
      if (updates.length > 0) {
        values.push(featureId);
        await db.execute(`UPDATE game_features SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, title: editForm.title ?? f.title, priority: editForm.priority ?? f.priority, status: editForm.status ?? f.status, hours_estimated: editForm.hours_estimated as number | undefined ?? f.hours_estimated, hours_actual: editForm.hours_actual as number | undefined ?? f.hours_actual } : f));
      setEditingId(null);
      setEditForm({});
    } catch (e) { console.error('[FeatureScopeBoard] edit failed:', e); }
  };

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalEstimated = features.reduce((sum, f) => sum + (f.hours_estimated || 0), 0);
  const totalActual = features.reduce((sum, f) => sum + (f.hours_actual || 0), 0);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Feature Scope</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Feature Scope ({features.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Feature
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Feature title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClass}>
              {PRIORITY_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s}</option>)}
            </select>
            <input type="number" step="0.5" placeholder="Est. hours" value={form.hours_estimated} onChange={(e) => setForm({ ...form, hours_estimated: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.title.trim()}>Add</Button>
          </div>
        </div>
      )}

      {(totalEstimated > 0 || totalActual > 0) && (
        <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-[6px]">
          <span className="flex items-center gap-1">
            <Clock size={10} /> Total est: <span className="font-medium text-[var(--text-primary)]">{totalEstimated}h</span>
          </span>
          {totalActual > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle size={10} /> Total actual: <span className="font-medium text-[var(--text-primary)]">{totalActual}h</span>
            </span>
          )}
        </div>
      )}

      {features.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No features defined yet. Add your first feature.</p>
      ) : (
        <div className="space-y-2">
          {PRIORITY_GROUPS.map(group => {
            const groupFeatures = features.filter(f => f.priority === group.key);
            if (groupFeatures.length === 0) return null;
            const isCollapsed = collapsed[group.key];
            return (
              <div key={group.key}>
                <button
                  onClick={() => toggleCollapse(group.key)}
                  className={`flex items-center gap-1.5 w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${group.color} ${group.bg} rounded-[4px]`}
                >
                  {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                  {group.label} ({groupFeatures.length})
                </button>
                {!isCollapsed && (
                  <div className="space-y-1 mt-1">
                    {groupFeatures.map(feature => (
                      <div key={feature.id} className="group">
                        {editingId === feature.id ? (
                          <div className="p-2 bg-[var(--bg-card)] border border-[var(--accent)] rounded-[6px] space-y-1.5 ml-2">
                            <input type="text" value={editForm.title as string || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={inputClass} autoFocus />
                            <div className="grid grid-cols-2 gap-1">
                              <select value={editForm.priority as string || ''} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className={selectClass}>
                                {PRIORITY_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                              </select>
                              <select value={editForm.status as string || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={selectClass}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'in_progress' ? 'In Progress' : s}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <input type="number" step="0.5" placeholder="Est. hrs" value={editForm.hours_estimated ?? ''} onChange={(e) => setEditForm({ ...editForm, hours_estimated: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputClass} />
                              <input type="number" step="0.5" placeholder="Actual hrs" value={editForm.hours_actual ?? ''} onChange={(e) => setEditForm({ ...editForm, hours_actual: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputClass} />
                            </div>
                            <div className="flex justify-end gap-1">
                              <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</Button>
                              <Button size="sm" onClick={() => handleEditSave(feature.id)}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs cursor-pointer hover:brightness-110 ml-2 border-l-2 ${group.border}`}
                            onClick={() => handleEditToggle(feature)}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className={`font-medium ${feature.status === 'done' || feature.status === 'cut' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} truncate`}>
                                {feature.title}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[feature.status] || statusBadgeClasses.backlog}`}>
                                {feature.status === 'in_progress' ? 'in progress' : feature.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              {feature.hours_estimated != null && (
                                <span className="text-[10px] text-[var(--text-tertiary)]">
                                  est. {feature.hours_estimated}h
                                  {feature.hours_actual != null && ` / actual ${feature.hours_actual}h`}
                                </span>
                              )}
                              {feature.hours_estimated == null && feature.hours_actual != null && (
                                <span className="text-[10px] text-[var(--text-tertiary)]">actual {feature.hours_actual}h</span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(feature.id); }} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] opacity-0 group-hover:opacity-100">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
