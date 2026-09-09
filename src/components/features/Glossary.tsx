/**
 * Glossary · Translator feature.
 * Per-client glossary of terms with approved translations.
 * Table with inline edit, search filter, add, and delete.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, Search, Edit3, X, BookOpen } from 'lucide-react';

type GlossaryTerm = {
  id: string;
  client_id: string;
  term: string;
  approved_translation?: string;
  notes?: string;
  created_at: string;
};

export default function Glossary({ clientId }: { clientId: string }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ term: '', approved_translation: '', notes: '' });
  const [editForm, setEditForm] = useState({ term: '', approved_translation: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadTerms = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(GlossaryTerm & Record<string, unknown>)[]>(
        'SELECT id, client_id, term, approved_translation, notes, created_at FROM glossary_terms WHERE client_id = ? ORDER BY term ASC',
        [clientId]
      );
      setTerms(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          term: r.term as string,
          approved_translation: r.approved_translation as string | undefined,
          notes: r.notes as string | undefined,
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[Glossary] loadTerms failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadTerms();
  }, [clientId, loadTerms]);

  const handleSave = async () => {
    if (!form.term.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO glossary_terms (id, client_id, term, approved_translation, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, clientId, form.term.trim(), form.approved_translation || null, form.notes || null, now]
      );
      const term: GlossaryTerm = {
        id,
        client_id: clientId,
        term: form.term.trim(),
        approved_translation: form.approved_translation || undefined,
        notes: form.notes || undefined,
        created_at: now,
      };
      setTerms((prev) => {
        const next = [...prev, term];
        next.sort((a, b) => a.term.localeCompare(b.term));
        return next;
      });
      setForm({ term: '', approved_translation: '', notes: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[Glossary] add failed:', e);
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.term.trim()) return;
    setSaving(true);
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE glossary_terms SET term = ?, approved_translation = ?, notes = ? WHERE id = ?',
        [editForm.term.trim(), editForm.approved_translation || null, editForm.notes || null, id]
      );
      setTerms((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? { ...t, term: editForm.term.trim(), approved_translation: editForm.approved_translation || undefined, notes: editForm.notes || undefined }
            : t
        );
        next.sort((a, b) => a.term.localeCompare(b.term));
        return next;
      });
      setEditingId(null);
    } catch (e) {
      console.error('[Glossary] update failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM glossary_terms WHERE id = ?', [id]);
      setTerms((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (e) {
      console.error('[Glossary] delete failed:', e);
    }
  };

  const handleStartEdit = (t: GlossaryTerm) => {
    setEditingId(t.id);
    setEditForm({
      term: t.term,
      approved_translation: t.approved_translation || '',
      notes: t.notes || '',
    });
  };

  const filtered = searchQuery.trim()
    ? terms.filter(
        (t) =>
          t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.approved_translation || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : terms;

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Glossary</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Glossary ({terms.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Term
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search terms or translations..."
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

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input
            type="text"
            placeholder="Term"
            value={form.term}
            onChange={(e) => setForm({ ...form, term: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <input
            type="text"
            placeholder="Approved translation"
            value={form.approved_translation}
            onChange={(e) => setForm({ ...form, approved_translation: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.term.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          {searchQuery ? 'No terms match your search.' : 'No glossary terms yet. Add your first term.'}
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map((t) => (
            <div key={t.id} className="bg-[var(--bg-secondary)] rounded-[6px]">
              {editingId === t.id ? (
                <div className="px-3 py-2 space-y-2">
                  <input
                    type="text"
                    value={editForm.term}
                    onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                    className={inputClass}
                    placeholder="Term"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editForm.approved_translation}
                    onChange={(e) => setEditForm({ ...editForm, approved_translation: e.target.value })}
                    className={inputClass}
                    placeholder="Approved translation"
                  />
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className={inputClass}
                    placeholder="Notes"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate(t.id)} loading={saving} disabled={!editForm.term.trim()}>
                      Update
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <BookOpen size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">{t.term}</span>
                    {t.approved_translation && (
                      <>
                        <span className="text-[var(--text-tertiary)]">→</span>
                        <span className="text-[#16A34A] font-medium">{t.approved_translation}</span>
                      </>
                    )}
                    {t.notes && (
                      <span className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[150px] ml-1">
                        · {t.notes}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(t)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--accent)] p-0.5"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-[var(--text-tertiary)] hover:text-[#A32D2D] p-0.5"
                    >
                      <Trash2 size={12} />
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
}
