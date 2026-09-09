/**
 * SOP Store · Virtual Assistant feature.
 * Per-client SOP cards with expand/collapse, search, add/edit/delete.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Search, ChevronDown, ChevronRight, Edit2, X } from 'lucide-react';

type SOP = {
  id: string;
  client_id: string;
  title: string;
  content?: string;
  sort_order: number;
  created_at: string;
};

export default function SOPStore({ clientId }: { clientId: string }) {
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const loadSOPs = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(SOP & Record<string, unknown>)[]>(
        'SELECT id, client_id, title, content, sort_order, created_at FROM sops WHERE client_id = ? ORDER BY sort_order ASC, created_at DESC',
        [clientId]
      );
      setSops(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          title: r.title as string,
          content: r.content as string | undefined,
          sort_order: r.sort_order as number,
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[SOPStore] loadSOPs failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSOPs();
  }, [clientId]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const db = await getDb();
      if (editingId) {
        await db.execute(
          'UPDATE sops SET title = ?, content = ? WHERE id = ?',
          [form.title.trim(), form.content || null, editingId]
        );
        setSops((prev) =>
          prev.map((s) =>
            s.id === editingId ? { ...s, title: form.title.trim(), content: form.content || undefined } : s
          )
        );
      } else {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const sortOrder = sops.length > 0 ? Math.max(...sops.map((s) => s.sort_order)) + 1 : 0;
        await db.execute(
          'INSERT INTO sops (id, client_id, title, content, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [id, clientId, form.title.trim(), form.content || null, sortOrder, now]
        );
        const sop: SOP = {
          id,
          client_id: clientId,
          title: form.title.trim(),
          content: form.content || undefined,
          sort_order: sortOrder,
          created_at: now,
        };
        setSops((prev) => [...prev, sop]);
      }
      setForm({ title: '', content: '' });
      setShowForm(false);
      setEditingId(null);
    } catch (e) {
      console.error('[SOPStore] save failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM sops WHERE id = ?', [id]);
      setSops((prev) => prev.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      console.error('[SOPStore] delete failed:', e);
    }
  };

  const handleEdit = (sop: SOP) => {
    setEditingId(sop.id);
    setForm({ title: sop.title, content: sop.content || '' });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', content: '' });
  };

  const handleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filtered = searchQuery.trim()
    ? sops.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sops;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">SOPs</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">SOPs ({sops.length})</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingId(null);
            setForm({ title: '', content: '' });
            setShowForm(!showForm);
          }}
        >
          <Plus size={12} /> Add SOP
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search SOPs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={inputClass + ' pl-7'}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="SOP title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <textarea
            placeholder="SOP content / steps..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>
              {editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          {searchQuery ? 'No SOPs match your search.' : 'No SOPs yet. Add your first standard operating procedure.'}
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map((sop) => (
            <div key={sop.id} className="bg-[var(--bg-secondary)] rounded-[6px] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <button
                  onClick={() => handleExpand(sop.id)}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  {expandedId === sop.id ? (
                    <ChevronDown size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  ) : (
                    <ChevronRight size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  )}
                  <span className="font-medium text-[var(--text-primary)] truncate">{sop.title}</span>
                </button>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(sop)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--accent)] p-0.5"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(sop.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D] p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expandedId === sop.id && sop.content && (
                <div className="px-3 pb-3 pt-0 text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed border-t border-[var(--border-color)] mt-0 mx-3">
                  <div className="pt-2">{sop.content}</div>
                </div>
              )}
              {expandedId === sop.id && !sop.content && (
                <div className="px-3 pb-3 pt-2 text-xs text-[var(--text-tertiary)] border-t border-[var(--border-color)] mx-3">
                  No content yet.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
