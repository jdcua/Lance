/**
 * Word / Character Counter · Translator feature.
 * Tracks source/target word counts and characters per time entry.
 * Supports inline editing and a summary table of recent entries.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Save, Edit3, X, FileText } from 'lucide-react';

type TranslationCount = {
  id: string;
  time_entry_id: string;
  source_words?: number;
  target_words?: number;
  characters?: number;
};

type TimeEntryBrief = {
  id: string;
  description?: string;
  client_id: string;
  project_id: string;
  start_time: string;
};

export default function WordCharacterCounter({ timeEntryId }: { timeEntryId?: string }) {
  const { timeEntries, loadTimeEntries } = useStore();
  const [counts, setCounts] = useState<TranslationCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ source_words: '', target_words: '', characters: '' });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      if (timeEntries.length === 0) {
        await loadTimeEntries();
      }
      const db = await getDb();
      if (timeEntryId) {
        const rows = await db.select<(TranslationCount & Record<string, unknown>)[]>(
          'SELECT id, time_entry_id, source_words, target_words, characters FROM translation_counts WHERE time_entry_id = ?',
          [timeEntryId]
        );
        setCounts(
          rows.map((r) => ({
            id: r.id as string,
            time_entry_id: r.time_entry_id as string,
            source_words: r.source_words as number | undefined,
            target_words: r.target_words as number | undefined,
            characters: r.characters as number | undefined,
          }))
        );
      } else {
        const rows = await db.select<(TranslationCount & Record<string, unknown>)[]>(
          'SELECT id, time_entry_id, source_words, target_words, characters FROM translation_counts ORDER BY id DESC LIMIT 200'
        );
        setCounts(
          rows.map((r) => ({
            id: r.id as string,
            time_entry_id: r.time_entry_id as string,
            source_words: r.source_words as number | undefined,
            target_words: r.target_words as number | undefined,
            characters: r.characters as number | undefined,
          }))
        );
      }
    } catch (e) {
      console.error('[WordCharacterCounter] loadData failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [timeEntryId]);

  const recentTimeEntries = timeEntries
    .filter((te) => te.description)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 50);

  const getCountForTimeEntry = (teId: string) => counts.find((c) => c.time_entry_id === teId);

  const handleEdit = (teId: string) => {
    const existing = getCountForTimeEntry(teId);
    setEditingId(teId);
    setForm({
      source_words: existing?.source_words != null ? String(existing.source_words) : '',
      target_words: existing?.target_words != null ? String(existing.target_words) : '',
      characters: existing?.characters != null ? String(existing.characters) : '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ source_words: '', target_words: '', characters: '' });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const db = await getDb();
      const existing = getCountForTimeEntry(editingId);
      const sw = form.source_words ? parseInt(form.source_words) : null;
      const tw = form.target_words ? parseInt(form.target_words) : null;
      const ch = form.characters ? parseInt(form.characters) : null;

      if (existing) {
        await db.execute(
          'UPDATE translation_counts SET source_words = ?, target_words = ?, characters = ? WHERE id = ?',
          [sw, tw, ch, existing.id]
        );
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO translation_counts (id, time_entry_id, source_words, target_words, characters) VALUES (?, ?, ?, ?, ?)',
          [id, editingId, sw, tw, ch]
        );
      }

      const updatedRows = await db.select<(TranslationCount & Record<string, unknown>)[]>(
        'SELECT id, time_entry_id, source_words, target_words, characters FROM translation_counts WHERE time_entry_id = ?',
        [editingId]
      );
      setCounts((prev) => {
        const filtered = prev.filter((c) => c.time_entry_id !== editingId);
        return [
          ...filtered,
          ...updatedRows.map((r) => ({
            id: r.id as string,
            time_entry_id: r.time_entry_id as string,
            source_words: r.source_words as number | undefined,
            target_words: r.target_words as number | undefined,
            characters: r.characters as number | undefined,
          })),
        ];
      });
      handleCancel();
    } catch (e) {
      console.error('[WordCharacterCounter] save failed:', e);
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Word / Character Count</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Word / Character Count
        </h4>
      </div>

      {/* Single timeEntryId mode */}
      {timeEntryId && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] mb-0.5 block">Source Words</label>
              <input
                type="number"
                placeholder="0"
                value={form.source_words}
                onChange={(e) => setForm({ ...form, source_words: e.target.value })}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] mb-0.5 block">Target Words</label>
              <input
                type="number"
                placeholder="0"
                value={form.target_words}
                onChange={(e) => setForm({ ...form, target_words: e.target.value })}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] mb-0.5 block">Characters</label>
              <input
                type="number"
                placeholder="0"
                value={form.characters}
                onChange={(e) => setForm({ ...form, characters: e.target.value })}
                className={inputClass}
                min={0}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={async () => {
                setSaving(true);
                try {
                  const db = await getDb();
                  const sw = form.source_words ? parseInt(form.source_words) : null;
                  const tw = form.target_words ? parseInt(form.target_words) : null;
                  const ch = form.characters ? parseInt(form.characters) : null;

                  const existing = counts[0];
                  if (existing) {
                    await db.execute(
                      'UPDATE translation_counts SET source_words = ?, target_words = ?, characters = ? WHERE id = ?',
                      [sw, tw, ch, existing.id]
                    );
                  } else {
                    const id = crypto.randomUUID();
                    await db.execute(
                      'INSERT INTO translation_counts (id, time_entry_id, source_words, target_words, characters) VALUES (?, ?, ?, ?, ?)',
                      [id, timeEntryId, sw, tw, ch]
                    );
                  }
                  const freshRows = await db.select<(TranslationCount & Record<string, unknown>)[]>(
                    'SELECT id, time_entry_id, source_words, target_words, characters FROM translation_counts WHERE time_entry_id = ?',
                    [timeEntryId]
                  );
                  setCounts(
                    freshRows.map((r) => ({
                      id: r.id as string,
                      time_entry_id: r.time_entry_id as string,
                      source_words: r.source_words as number | undefined,
                      target_words: r.target_words as number | undefined,
                      characters: r.characters as number | undefined,
                    }))
                  );
                } catch (e) {
                  console.error('[WordCharacterCounter] save failed:', e);
                }
                setSaving(false);
              }}
              loading={saving}
            >
              <Save size={12} /> Save
            </Button>
          </div>
          {counts.length > 0 && (
            <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-color)]">
              <span>Source: <span className="font-medium text-[var(--text-primary)]">{counts[0].source_words ?? '--'}</span></span>
              <span>Target: <span className="font-medium text-[var(--text-primary)]">{counts[0].target_words ?? '--'}</span></span>
              <span>Chars: <span className="font-medium text-[var(--text-primary)]">{counts[0].characters ?? '--'}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Recent time entries list (no timeEntryId mode) */}
      {!timeEntryId && (
        <>
          {recentTimeEntries.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] py-2">No recent time entries found.</p>
          ) : (
            <div className="space-y-1">
              {recentTimeEntries.map((te) => {
                const cnt = getCountForTimeEntry(te.id);
                const isEditing = editingId === te.id;
                return (
                  <div key={te.id}>
                    {isEditing ? (
                      <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] space-y-2">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">{te.description || 'Time Entry'}</span>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            placeholder="Source words"
                            value={form.source_words}
                            onChange={(e) => setForm({ ...form, source_words: e.target.value })}
                            className={inputClass}
                            min={0}
                            autoFocus
                          />
                          <input
                            type="number"
                            placeholder="Target words"
                            value={form.target_words}
                            onChange={(e) => setForm({ ...form, target_words: e.target.value })}
                            className={inputClass}
                            min={0}
                          />
                          <input
                            type="number"
                            placeholder="Characters"
                            value={form.characters}
                            onChange={(e) => setForm({ ...form, characters: e.target.value })}
                            className={inputClass}
                            min={0}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={handleCancel}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSave} loading={saving}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <FileText size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                          <span className="text-[var(--text-primary)] truncate font-medium">{te.description || 'Time Entry'}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">{formatDate(te.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-2">
                          <span>S: <span className="text-[var(--text-primary)]">{cnt?.source_words ?? '--'}</span></span>
                          <span>T: <span className="text-[var(--text-primary)]">{cnt?.target_words ?? '--'}</span></span>
                          <span>C: <span className="text-[var(--text-primary)]">{cnt?.characters ?? '--'}</span></span>
                          <button
                            onClick={() => handleEdit(te.id)}
                            className="text-[var(--text-tertiary)] hover:text-[var(--accent)] p-0.5"
                          >
                            <Edit3 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
