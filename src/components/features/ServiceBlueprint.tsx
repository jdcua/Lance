/**
 * Service Blueprint — service design components with frontstage/backstage mapping.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type BlueprintItem = {
  id: string;
  project_id: string;
  component?: string;
  frontstage?: string;
  backstage?: string;
  support_process?: string;
  notes?: string;
};

export default function ServiceBlueprint({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<BlueprintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ component: '', frontstage: '', backstage: '', support_process: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(BlueprintItem & Record<string, unknown>)[]>(
        'SELECT id, project_id, component, frontstage, backstage, support_process, notes FROM service_blueprints WHERE project_id = ? ORDER BY id ASC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        component: r.component as string | undefined,
        frontstage: r.frontstage as string | undefined,
        backstage: r.backstage as string | undefined,
        support_process: r.support_process as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[ServiceBlueprint] load failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [projectId]);

  const handleSave = async () => {
    if (!form.component.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO service_blueprints (id, project_id, component, frontstage, backstage, support_process, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.component.trim(), form.frontstage.trim() || null, form.backstage.trim() || null, form.support_process.trim() || null, form.notes.trim() || null]
      );
      const item: BlueprintItem = { id, project_id: projectId, component: form.component.trim(), frontstage: form.frontstage.trim() || undefined, backstage: form.backstage.trim() || undefined, support_process: form.support_process.trim() || undefined, notes: form.notes.trim() || undefined };
      setItems(prev => [...prev, item]);
      setForm({ component: '', frontstage: '', backstage: '', support_process: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[ServiceBlueprint] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM service_blueprints WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[ServiceBlueprint] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Service Blueprint</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Service Blueprint ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Component
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Component name" value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} className={inputClass} autoFocus />
          <input type="text" placeholder="Frontstage (what the client sees)" value={form.frontstage} onChange={(e) => setForm({ ...form, frontstage: e.target.value })} className={inputClass} />
          <input type="text" placeholder="Backstage (what happens behind)" value={form.backstage} onChange={(e) => setForm({ ...form, backstage: e.target.value })} className={inputClass} />
          <input type="text" placeholder="Support process" value={form.support_process} onChange={(e) => setForm({ ...form, support_process: e.target.value })} className={inputClass} />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.component.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No blueprint components yet. Add your first component.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-medium w-5">{i + 1}</span>
                  <span className="font-medium text-[var(--text-primary)]">{item.component}</span>
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {item.frontstage && <div className="text-[var(--text-tertiary)]"><span className="font-medium text-[var(--text-secondary)]">Front:</span> {item.frontstage}</div>}
                {item.backstage && <div className="text-[var(--text-tertiary)]"><span className="font-medium text-[var(--text-secondary)]">Back:</span> {item.backstage}</div>}
              </div>
              {item.support_process && <div className="text-[10px] text-[var(--text-tertiary)]"><span className="font-medium text-[var(--text-secondary)]">Support:</span> {item.support_process}</div>}
              {item.notes && <div className="text-[10px] text-[var(--text-tertiary)] italic">{item.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
