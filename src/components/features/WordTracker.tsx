/**
 * Word Tracker · Writer feature.
 * Tracks word count per time entry. Can be standalone or bound to a specific time entry.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Save } from 'lucide-react';

type WordEntry = {
  id: string;
  time_entry_id: string;
  word_count: number;
};

type TimeEntryRow = {
  id: string;
  project_id: string;
  client_id: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  word_count?: number;
  words_id?: string;
};

export default function WordTracker({ timeEntryId }: { timeEntryId?: string }) {
  const { loadTimeEntries, projects, clients, loadProjects, loadClients } = useStore();
  const [wordEntry, setWordEntry] = useState<WordEntry | null>(null);
  const [count, setCount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentEntries, setRecentEntries] = useState<TimeEntryRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (timeEntryId) {
        await loadWordEntry(timeEntryId);
      } else {
        await loadTimeEntries();
        await loadProjects();
        await loadClients();
        await loadRecentEntriesWithWords();
      }
      setLoading(false);
    };
    load();
  }, [timeEntryId, loadClients, loadProjects, loadTimeEntries]);

  const loadWordEntry = async (teId: string) => {
    try {
      const db = await getDb();
      const rows = await db.select<(WordEntry & Record<string, unknown>)[]>(
        'SELECT id, time_entry_id, word_count FROM time_entry_words WHERE time_entry_id = ?',
        [teId]
      );
      if (rows.length > 0) {
        const entry: WordEntry = {
          id: rows[0].id as string,
          time_entry_id: rows[0].time_entry_id as string,
          word_count: rows[0].word_count as number,
        };
        setWordEntry(entry);
        setCount(String(entry.word_count));
      } else {
        setWordEntry(null);
        setCount('');
      }
    } catch (e) {
      console.error('[WordTracker] loadWordEntry failed:', e);
    }
  };

  const loadRecentEntriesWithWords = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(TimeEntryRow & Record<string, unknown>)[]>(
        `SELECT te.id, te.project_id, te.client_id, te.description, te.start_time, te.end_time, te.duration_minutes,
                tew.id as words_id, tew.word_count
         FROM time_entries te
         LEFT JOIN time_entry_words tew ON tew.time_entry_id = te.id
         ORDER BY te.start_time DESC
         LIMIT 50`
      );
      setRecentEntries(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          client_id: r.client_id as string,
          description: r.description as string | undefined,
          start_time: r.start_time as string,
          end_time: r.end_time as string | undefined,
          duration_minutes: r.duration_minutes as number | undefined,
          word_count: r.word_count != null ? (r.word_count as number) : undefined,
          words_id: r.words_id as string | undefined,
        }))
      );
    } catch (e) {
      console.error('[WordTracker] loadRecentEntriesWithWords failed:', e);
    }
    setLoaded(true);
  };

  const getProjectTitle = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.title || 'Unknown project';
  };

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown client';
  };

  const handleSave = async () => {
    const num = parseInt(count, 10);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    try {
      const db = await getDb();
      if (timeEntryId) {
        if (wordEntry) {
          await db.execute('UPDATE time_entry_words SET word_count = ? WHERE id = ?', [num, wordEntry.id]);
          setWordEntry({ ...wordEntry, word_count: num });
        } else {
          const id = crypto.randomUUID();
          await db.execute('INSERT INTO time_entry_words (id, time_entry_id, word_count) VALUES (?, ?, ?)', [
            id,
            timeEntryId,
            num,
          ]);
          setWordEntry({ id, time_entry_id: timeEntryId, word_count: num });
        }
      }
      await loadRecentEntriesWithWords();
    } catch (e) {
      console.error('[WordTracker] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleInlineSave = async (entryId: string, wordCount: number, wordsId?: string) => {
    if (isNaN(wordCount) || wordCount < 0) return;
    setSaving(true);
    try {
      const db = await getDb();
      if (wordsId) {
        await db.execute('UPDATE time_entry_words SET word_count = ? WHERE id = ?', [wordCount, wordsId]);
      } else {
        const id = crypto.randomUUID();
        await db.execute('INSERT INTO time_entry_words (id, time_entry_id, word_count) VALUES (?, ?, ?)', [
          id,
          entryId,
          wordCount,
        ]);
      }
      setRecentEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, word_count: wordCount, words_id: wordsId || undefined } : e
        )
      );
    } catch (e) {
      console.error('[WordTracker] handleInlineSave failed:', e);
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Word Count
          </h4>
        </div>
        <div className="space-y-1">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (timeEntryId) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Word Count
          </h4>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px]">
          <input
            type="number"
            placeholder="Word count"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={inputClass + ' w-28'}
            min={0}
          />
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={12} /> Save
          </Button>
          {wordEntry && (
            <span className="text-xs text-[var(--text-tertiary)]">{wordEntry.word_count.toLocaleString()} words</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Word Counts ({recentEntries.length})
        </h4>
      </div>

      {!loaded ? (
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      ) : recentEntries.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No time entries yet. Log some time first.</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {recentEntries.map((entry) => (
            <WordRow
              key={entry.id}
              entry={entry}
              projectTitle={getProjectTitle(entry.project_id)}
              clientName={getClientName(entry.client_id)}
              onSave={handleInlineSave}
              saving={saving}
              inputClass={inputClass}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WordRow({
  entry,
  projectTitle,
  clientName,
  onSave,
  saving,
  inputClass,
}: {
  entry: TimeEntryRow;
  projectTitle: string;
  clientName: string;
  onSave: (entryId: string, wordCount: number, wordsId?: string) => Promise<void>;
  saving: boolean;
  inputClass: string;
}) {
  const [editVal, setEditVal] = useState(entry.word_count != null ? String(entry.word_count) : '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditVal(entry.word_count != null ? String(entry.word_count) : '');
  }, [entry.word_count]);

  const save = async () => {
    const num = parseInt(editVal, 10);
    if (isNaN(num) || num < 0) return;
    await onSave(entry.id, num, entry.words_id);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditVal(entry.word_count != null ? String(entry.word_count) : '');
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[var(--text-primary)] truncate font-medium">
            {entry.description || 'No description'}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            {projectTitle} · {clientName} · {new Date(entry.start_time).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        {isEditing ? (
          <>
            <input
              type="number"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputClass + ' w-20'}
              min={0}
              autoFocus
            />
            <Button size="sm" onClick={save} loading={saving}>
              <Save size={10} />
            </Button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={`text-xs tabular-nums px-2 py-0.5 rounded-[4px] hover:bg-[var(--border-color)] transition-colors ${entry.word_count != null ? 'text-[var(--text-primary)] font-mono' : 'text-[var(--text-tertiary)]'}`}
          >
            {entry.word_count != null ? `${entry.word_count.toLocaleString()} words` : 'Set count'}
          </button>
        )}
      </div>
    </div>
  );
}
