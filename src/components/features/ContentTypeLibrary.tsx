/**
 * Content Type Library · Copywriter feature.
 * Content type definitions with category and template.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronRight } from 'lucide-react';

type ContentType = {
  id: string;
  client_id: string;
  name: string;
  category?: string;
  template?: string;
  notes?: string;
};

export default function ContentTypeLibrary({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    template: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ContentType & Record<string, unknown>)[]>(
        'SELECT id, client_id, name, category, template, notes FROM content_types WHERE client_id = ? ORDER BY category ASC, name ASC',
        [clientId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          name: r.name as string,
          category: r.category as string | undefined,
          template: r.template as string | undefined,
          notes: r.notes as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[ContentTypeLibrary] loadItems failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadItems();
  }, [clientId, loadItems]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO content_types (id, client_id, name, category, template, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.name.trim(),
          form.category || null,
          form.template || null,
          form.notes || null,
        ],
      );
      const item: ContentType = {
        id,
        client_id: clientId,
        name: form.name.trim(),
        category: form.category || undefined,
        template: form.template || undefined,
        notes: form.notes || undefined,
      };
      setItems((prev) =>
        [...prev, item].sort(
          (a, b) =>
            (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name),
        ),
      );
      setForm({ name: '', category: '', template: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[ContentTypeLibrary] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM content_types WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[ContentTypeLibrary] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Content Types</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Content Types ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Type
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Content type name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <input
            type="text"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          />
          <textarea
            placeholder="Template"
            value={form.template}
            onChange={(e) => setForm({ ...form, template: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No content types defined yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button
                    aria-label="Next"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight
                      size={10}
                      className={`transition-transform ${expanded === item.id ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                  {item.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-secondary)]">
                      {item.category}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Delete content type library"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {expanded === item.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-xs text-xs space-y-2">
                  {item.template && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                        Template
                      </p>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap">
                        {item.template}
                      </p>
                    </div>
                  )}
                  {item.notes && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">Notes</p>
                      <p className="text-[var(--text-secondary)]">{item.notes}</p>
                    </div>
                  )}
                  {!item.template && !item.notes && (
                    <p className="text-[var(--text-tertiary)] italic">No additional details.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
