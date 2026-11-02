/**
 * Feedback Log · Designer feature.
 * Timeline of client feedback entries with medium, summary, actioned toggle, and project filter.
 */
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { getDb } from '../../db';
import Button from '../ui/Button';
import {
  Plus,
  Trash2,
  Check,
  Circle,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';

type Feedback = {
  id: string;
  client_id: string;
  project_id?: string;
  date: string;
  medium: string;
  summary: string;
  actioned: boolean;
};

const MEDIUMS = ['call', 'email', 'meeting', 'message', 'other'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MEDIUM_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  message: MessageSquare,
  other: Circle,
};

const MEDIUM_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  message: 'Message',
  other: 'Other',
};

export default function FeedbackLog({ clientId }: { clientId: string }) {
  const { projects, loadProjects } = useStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    medium: 'meeting',
    project_id: '',
    summary: '',
    actioned: false,
  });
  const [saving, setSaving] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string>('');

  const loadFeedbacks = useCallback(async () => {
    try {
      await loadProjects();
      const db = await getDb();
      const rows = await db.select<(Feedback & Record<string, unknown>)[]>(
        'SELECT id, client_id, project_id, date, medium, summary, actioned FROM client_feedback WHERE client_id = ? ORDER BY date DESC, id DESC',
        [clientId],
      );
      setFeedbacks(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          project_id: r.project_id as string | undefined,
          date: r.date as string,
          medium: r.medium as string,
          summary: r.summary as string,
          actioned: !!r.actioned,
        })),
      );
    } catch (e) {
      console.error('[FeedbackLog] loadFeedbacks failed:', e);
    }
    setLoading(false);
  }, [clientId, loadProjects]);

  useEffect(() => {
    loadFeedbacks();
  }, [clientId, loadFeedbacks]);

  const clientProjects = projects.filter((p) => p.client_id === clientId);

  const filtered = filterProjectId
    ? feedbacks.filter((f) => f.project_id === filterProjectId)
    : feedbacks;

  const actionedCount = feedbacks.filter((f) => f.actioned).length;
  const pendingCount = feedbacks.filter((f) => !f.actioned).length;

  const handleSave = async () => {
    if (!form.summary.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO client_feedback (id, client_id, project_id, date, medium, summary, actioned) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.project_id || null,
          form.date,
          form.medium,
          form.summary.trim(),
          form.actioned ? 1 : 0,
        ],
      );
      const item: Feedback = {
        id,
        client_id: clientId,
        project_id: form.project_id || undefined,
        date: form.date,
        medium: form.medium,
        summary: form.summary.trim(),
        actioned: form.actioned,
      };
      setFeedbacks((prev) => {
        const next = [...prev, item];
        next.sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id),
        );
        return next;
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        medium: 'meeting',
        project_id: '',
        summary: '',
        actioned: false,
      });
      setShowForm(false);
    } catch (e) {
      console.error('[FeedbackLog] addFeedback failed:', e);
    }
    setSaving(false);
  };

  const handleToggleActioned = async (id: string, current: boolean) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE client_feedback SET actioned = ? WHERE id = ?', [
        current ? 0 : 1,
        id,
      ]);
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, actioned: !current } : f)));
    } catch (e) {
      console.error('[FeedbackLog] toggle failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM client_feedback WHERE id = ?', [id]);
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error('[FeedbackLog] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Feedback
          </h4>
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Feedback ({filtered.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Feedback
        </Button>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
          <Check size={11} className="text-[var(--accent-ink,var(--accent))]" />
          <span className="font-medium">{actionedCount}</span> actioned
        </span>
        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
          <Circle size={11} className="text-[var(--text-tertiary)]" />
          <span className="font-medium">{pendingCount}</span> pending
        </span>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
            <select
              aria-label="Medium"
              value={form.medium}
              onChange={(e) => setForm({ ...form, medium: e.target.value })}
              className={inputClass}
            >
              {MEDIUMS.map((m) => (
                <option key={m} value={m}>
                  {MEDIUM_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <select
            aria-label="Project"
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            className={inputClass}
          >
            <option value="">All projects</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Summary of feedback"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            rows={2}
            className={inputClass + ' resize-none'}
            autoFocus
          />
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.actioned}
              onChange={(e) => setForm({ ...form, actioned: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Mark as actioned
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.summary.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Project filter */}
      {clientProjects.length > 0 && feedbacks.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Filter size={11} className="text-[var(--text-tertiary)]" />
          <select
            aria-label="Filter by project"
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className={inputClass + ' w-auto min-w-[120px]'}
          >
            <option value="">All projects</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {filterProjectId && (
            <button
              onClick={() => setFilterProjectId('')}
              className="text-[10px] text-[var(--accent-ink,var(--accent))] hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Timeline list */}
      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No feedback recorded yet. Log your first entry.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const Icon = MEDIUM_ICONS[f.medium] || Circle;
            const project = f.project_id ? projects.find((p) => p.id === f.project_id) : null;
            return (
              <div
                key={f.id}
                className={`flex items-start gap-2 px-3 py-2 rounded-[6px] text-xs border-l-[3px] ${f.actioned ? 'border-[var(--accent)]/30 bg-[var(--bg-secondary)]' : 'border-[var(--accent)] bg-[var(--bg-secondary)]'}`}
              >
                <button
                  onClick={() => handleToggleActioned(f.id, f.actioned)}
                  className={`mt-0.5 flex-shrink-0 p-0.5 rounded-full ${f.actioned ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent-ink,var(--accent))]'}`}
                  title={f.actioned ? 'Mark as pending' : 'Mark actioned'}
                >
                  {f.actioned ? <Check size={14} /> : <Circle size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={11} className="text-[var(--text-tertiary)]" />
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                      {MEDIUM_LABELS[f.medium]}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      <Calendar size={10} className="inline mr-0.5" />
                      {formatDate(f.date)}
                    </span>
                    {project && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)] truncate max-w-[120px]">
                        {project.title}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[var(--text-primary)] leading-relaxed ${f.actioned ? 'opacity-60' : ''}`}
                  >
                    {f.summary}
                  </p>
                </div>
                <button
                  aria-label="Delete feedback log"
                  onClick={() => handleDelete(f.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] flex-shrink-0 mt-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
