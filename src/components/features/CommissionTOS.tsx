/**
 * Commission TOS · Illustrator feature.
 * Global TOS templates with selectable active TOS stored in localStorage.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronRight, Check } from 'lucide-react';

type TOS = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

const ACTIVE_TOS_KEY = 'lance_active_commission_tos';

export default function CommissionTOS() {
  const [templates, setTemplates] = useState<TOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTOSId, setActiveTOSId] = useState<string | null>(
    localStorage.getItem(ACTIVE_TOS_KEY)
  );
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(TOS & Record<string, unknown>)[]>(
        'SELECT id, title, body, created_at FROM commission_tos ORDER BY created_at DESC'
      );
      setTemplates(
        rows.map((r) => ({
          id: r.id as string,
          title: r.title as string,
          body: r.body as string,
          created_at: r.created_at as string,
        }))
      );
    } catch (e) {
      console.error('[CommissionTOS] loadTemplates failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      const createdAt = new Date().toISOString();
      await db.execute(
        'INSERT INTO commission_tos (id, title, body, created_at) VALUES (?, ?, ?, ?)',
        [id, form.title.trim(), form.body.trim(), createdAt]
      );
      const item: TOS = {
        id,
        title: form.title.trim(),
        body: form.body.trim(),
        created_at: createdAt,
      };
      setTemplates((prev) => [item, ...prev]);
      setForm({ title: '', body: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[CommissionTOS] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM commission_tos WHERE id = ?', [id]);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (activeTOSId === id) {
        localStorage.removeItem(ACTIVE_TOS_KEY);
        setActiveTOSId(null);
      }
    } catch (e) {
      console.error('[CommissionTOS] handleDelete failed:', e);
    }
  };

  const handleSetActive = (id: string) => {
    localStorage.setItem(ACTIVE_TOS_KEY, id);
    setActiveTOSId(id);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Commission TOS
          </h4>
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
          TOS Templates ({templates.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Template
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Template title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <textarea
            placeholder="TOS body text..."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={6}
            className={inputClass + ' resize-none font-mono'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.title.trim() || !form.body.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No TOS templates yet. Create your first terms of service.
        </p>
      ) : (
        <div className="space-y-1">
          {templates.map((t) => (
            <div key={t.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button aria-label="Next"
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight
                      size={10}
                      className={`transition-transform ${expanded === t.id ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <span className="font-medium text-[var(--text-primary)] truncate">{t.title}</span>
                  {activeTOSId === t.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink,var(--accent))] font-medium">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {activeTOSId !== t.id && (
                    <button
                      onClick={() => handleSetActive(t.id)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))]"
                      title="Set as active TOS"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button aria-label="Delete commission tos"
                    onClick={() => handleDelete(t.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expanded === t.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-xs text-xs">
                  <pre className="whitespace-pre-wrap font-sans text-[var(--text-secondary)]">
                    {t.body}
                  </pre>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    Created {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
