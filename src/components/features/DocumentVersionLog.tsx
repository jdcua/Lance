/**
 * Document Version Log · Legal feature.
 * List of document versions grouped by doc_name.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, FileText, FolderOpen } from 'lucide-react';

type DocVersion = {
  id: string;
  client_id: string;
  doc_name?: string;
  version?: string;
  date?: string;
  file_ref?: string;
  notes?: string;
};

export default function DocumentVersionLog({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<DocVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doc_name: '', version: '', date: new Date().toISOString().split('T')[0], file_ref: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [collapsedDocs, setCollapsedDocs] = useState<Set<string>>(new Set());

  const loadDocs = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(DocVersion & Record<string, unknown>)[]>(
        'SELECT id, client_id, doc_name, version, date, file_ref, notes FROM document_versions WHERE client_id = ? ORDER BY doc_name ASC, date DESC',
        [clientId]
      );
      setDocs(rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        doc_name: r.doc_name as string | undefined,
        version: r.version as string | undefined,
        date: r.date as string | undefined,
        file_ref: r.file_ref as string | undefined,
        notes: r.notes as string | undefined,
      })));
    } catch (e) { console.error('[DocumentVersionLog] load failed:', e); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadDocs(); }, [clientId, loadDocs]);

  const handleAdd = async () => {
    if (!form.doc_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO document_versions (id, client_id, doc_name, version, date, file_ref, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, clientId, form.doc_name.trim(), form.version.trim() || null, form.date || null, form.file_ref.trim() || null, form.notes.trim() || null]
      );
      const doc: DocVersion = { id, client_id: clientId, doc_name: form.doc_name.trim(), version: form.version.trim() || undefined, date: form.date || undefined, file_ref: form.file_ref.trim() || undefined, notes: form.notes.trim() || undefined };
      setDocs(prev => {
        const next = [...prev, doc];
        next.sort((a, b) => (a.doc_name || '').localeCompare(b.doc_name || '') || (b.date || '').localeCompare(a.date || ''));
        return next;
      });
      setForm({ doc_name: '', version: '', date: new Date().toISOString().split('T')[0], file_ref: '', notes: '' });
      setShowForm(false);
    } catch (e) { console.error('[DocumentVersionLog] add failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM document_versions WHERE id = ?', [id]);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (e) { console.error('[DocumentVersionLog] delete failed:', e); }
  };

  const toggleCollapse = (docName: string) => {
    setCollapsedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docName)) next.delete(docName);
      else next.add(docName);
      return next;
    });
  };

  const grouped = docs.reduce((acc, doc) => {
    const key = doc.doc_name || 'Untitled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, DocVersion[]>);

  const docNames = Object.keys(grouped);

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Document Versions</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Document Versions ({docs.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Version
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Document name" value={form.doc_name} onChange={(e) => setForm({ ...form, doc_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Version (e.g. v2.1)" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} className={inputClass} />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="File reference" value={form.file_ref} onChange={(e) => setForm({ ...form, file_ref: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving} disabled={!form.doc_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No document versions yet. Add your first version.</p>
      ) : (
        <div className="space-y-2">
          {docNames.map((docName) => {
            const versions = grouped[docName];
            const isCollapsed = collapsedDocs.has(docName);
            return (
              <div key={docName}>
                <button
                  onClick={() => toggleCollapse(docName)}
                  className="flex items-center gap-1.5 w-full px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <FolderOpen size={12} />
                  <span className="truncate">{docName}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-1 mt-1 ml-4">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <FileText size={10} className="text-[var(--text-tertiary)] flex-shrink-0" />
                          <span className="text-[var(--accent-ink,var(--accent))] font-medium flex-shrink-0">{v.version || '--'}</span>
                          <span className="text-[var(--text-tertiary)] flex-shrink-0">{v.date || '--'}</span>
                          {v.file_ref && (
                            <span className="text-[10px] text-[var(--text-tertiary)] truncate">{v.file_ref}</span>
                          )}
                          {v.notes && (
                            <span className="text-[10px] text-[var(--text-tertiary)] truncate ml-auto">{v.notes}</span>
                          )}
                        </div>
                        <button
                          aria-label="Delete document version log"
                          onClick={() => handleDelete(v.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                          <Trash2 size={12} />
                        </button>
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
