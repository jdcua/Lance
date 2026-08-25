/**
 * Model Registry -- AI Engineer feature.
 * Track ML models with framework, version, status, and metrics.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Box } from 'lucide-react';

type Model = {
  id: string;
  project_id: string;
  name: string;
  framework?: string;
  version?: string;
  status: string;
  metrics?: string;
  created_at: string;
};

const FRAMEWORK_OPTIONS = ['PyTorch', 'TensorFlow', 'JAX', 'Scikit-learn', 'HuggingFace', 'other'] as const;
const STATUS_OPTIONS = ['development', 'training', 'evaluated', 'deployed', 'retired'] as const;

const frameworkBadgeClasses: Record<string, string> = {
  PyTorch: 'bg-[#EE4C2C]/15 text-[#EE4C2C]',
  TensorFlow: 'bg-[#FF6F00]/15 text-[#FF6F00]',
  JAX: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  'Scikit-learn': 'bg-[#3498DB]/15 text-[#3498DB]',
  HuggingFace: 'bg-[#FFD21E]/15 text-[#B8860B]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

const statusBadgeClasses: Record<string, string> = {
  development: 'bg-[#7C3AED]/15 text-[#7C3AED]',
  training: 'bg-[#2563EB]/15 text-[#2563EB]',
  evaluated: 'bg-[#D97706]/15 text-[#D97706]',
  deployed: 'bg-[#16A34A]/15 text-[#16A34A]',
  retired: 'bg-[var(--border-color)] text-[var(--text-tertiary)]',
};

export default function ModelRegistry({ projectId }: { projectId: string }) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', framework: 'PyTorch', version: '', status: 'development', metrics: '' });
  const [saving, setSaving] = useState(false);

  const loadModels = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Model & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, framework, version, status, metrics, created_at FROM models WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      setModels(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        name: r.name as string,
        framework: r.framework as string | undefined,
        version: r.version as string | undefined,
        status: r.status as string,
        metrics: r.metrics as string | undefined,
        created_at: r.created_at as string,
      })));
    } catch (e) { console.error('[ModelRegistry] loadModels failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadModels(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO models (id, project_id, name, framework, version, status, metrics, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.name.trim(), form.framework, form.version || null, form.status, form.metrics || null, new Date().toISOString()]
      );
      const model: Model = { id, project_id: projectId, name: form.name.trim(), framework: form.framework, version: form.version || undefined, status: form.status, metrics: form.metrics || undefined, created_at: new Date().toISOString() };
      setModels(prev => [model, ...prev]);
      setForm({ name: '', framework: 'PyTorch', version: '', status: 'development', metrics: '' });
      setShowForm(false);
    } catch (e) { console.error('[ModelRegistry] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM models WHERE id = ?', [id]);
      setModels(prev => prev.filter(m => m.id !== id));
    } catch (e) { console.error('[ModelRegistry] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Models</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Models ({models.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Register Model
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Model name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} className={selectClass}>
              {FRAMEWORK_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input type="text" placeholder="Version (e.g. v1.0)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Metrics (e.g. accuracy:0.95)" value={form.metrics} onChange={(e) => setForm({ ...form, metrics: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.name.trim()}>Add</Button>
          </div>
        </div>
      )}

      {models.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No models registered yet.</p>
      ) : (
        <div className="space-y-1">
          {models.map((model) => (
            <div key={model.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Box size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="font-medium text-[var(--text-primary)] truncate">{model.name}</span>
                {model.framework && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${frameworkBadgeClasses[model.framework] || frameworkBadgeClasses.other}`}>
                    {model.framework}
                  </span>
                )}
                {model.version && (
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">{model.version}</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClasses[model.status] || statusBadgeClasses.development}`}>
                  {model.status}
                </span>
                {model.metrics && (
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate flex-shrink-0">{model.metrics}</span>
                )}
              </div>
              <button onClick={() => handleDelete(model.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
