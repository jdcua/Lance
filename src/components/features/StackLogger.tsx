/**
 * Stack Logger — Developer feature.
 * Tag-style input for project technology stack grouped by category.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, X, Layers } from 'lucide-react';

type ProjectStack = {
  id: string;
  project_id: string;
  technology: string;
  category: string;
};

const CATEGORIES = ['frontend', 'backend', 'database', 'devops', 'other'] as const;

const categoryLabel: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  devops: 'DevOps',
  other: 'Other',
};

const categoryColors: Record<string, string> = {
  frontend: 'bg-[#2563EB]/10 text-[#2563EB]',
  backend: 'bg-[#7C3AED]/10 text-[#7C3AED]',
  database: 'bg-[#059669]/10 text-[#059669]',
  devops: 'bg-[#D97706]/10 text-[#D97706]',
  other: 'bg-[var(--bg-card)] text-[var(--text-secondary)]',
};

export default function StackLogger({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ProjectStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ technology: '', category: 'frontend' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ProjectStack & Record<string, unknown>)[]>(
        'SELECT id, project_id, technology, category FROM project_stack WHERE project_id = ? ORDER BY category, technology',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        technology: r.technology as string,
        category: r.category as string,
      })));
    } catch (e) { console.error('[StackLogger] loadItems failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.technology.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO project_stack (id, project_id, technology, category) VALUES (?, ?, ?, ?)',
        [id, projectId, form.technology.trim(), form.category]
      );
      const item: ProjectStack = { id, project_id: projectId, technology: form.technology.trim(), category: form.category };
      setItems(prev => [...prev, item].sort((a, b) => a.category.localeCompare(b.category) || a.technology.localeCompare(b.technology)));
      setForm({ technology: '', category: 'frontend' });
    } catch (e) { console.error('[StackLogger] add failed:', e); }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM project_stack WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[StackLogger] remove failed:', e); }
  };

  const groupedItems = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {} as Record<string, ProjectStack[]>);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Tech Stack</h4>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse w-2/3" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Tech Stack ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Tech
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Technology name (e.g. React, PostgreSQL)"
              value={form.technology}
              onChange={(e) => setForm({ ...form, technology: e.target.value })}
              className={inputClass + ' flex-1'}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selectClass + ' w-[130px]'}>
              {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.technology.trim()}>Add</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No technologies added yet. Start building your stack.</p>
      ) : (
        <div className="space-y-2">
          {CATEGORIES.map(cat => {
            const catItems = groupedItems[cat];
            if (catItems.length === 0) return null;
            return (
              <div key={cat}>
                <div className={`text-[10px] font-semibold uppercase tracking-wide ${categoryColors[cat]} px-2 py-0.5 rounded-[4px] inline-block mb-1.5`}>
                  {categoryLabel[cat]}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {catItems.map(item => (
                    <span key={item.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--bg-secondary)] rounded-[6px] text-[var(--text-primary)] border border-[var(--border-color)]">
                      <Layers size={10} className="text-[var(--text-tertiary)]" />
                      {item.technology}
                      <button onClick={() => handleRemove(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
