/**
 * Outcome Notes -- Consultant feature.
 * Single form per project capturing before/after state, metrics, and testimonial draft.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Save, FileText } from 'lucide-react';

type Outcome = {
  id: string;
  project_id: string;
  before_state?: string;
  after_state?: string;
  metrics_improved?: string;
  testimonial_draft?: string;
  created_at: string;
};

export default function OutcomeNotes({ projectId }: { projectId: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    before_state: '',
    after_state: '',
    metrics_improved: '',
    testimonial_draft: '',
  });

  const loadOutcome = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Outcome & Record<string, unknown>)[]>(
        'SELECT id, project_id, before_state, after_state, metrics_improved, testimonial_draft, created_at FROM outcomes WHERE project_id = ?',
        [projectId]
      );
      if (rows.length > 0) {
        const o: Outcome = {
          id: rows[0].id as string,
          project_id: rows[0].project_id as string,
          before_state: rows[0].before_state as string | undefined,
          after_state: rows[0].after_state as string | undefined,
          metrics_improved: rows[0].metrics_improved as string | undefined,
          testimonial_draft: rows[0].testimonial_draft as string | undefined,
          created_at: rows[0].created_at as string,
        };
        setOutcome(o);
        setForm({
          before_state: o.before_state || '',
          after_state: o.after_state || '',
          metrics_improved: o.metrics_improved || '',
          testimonial_draft: o.testimonial_draft || '',
        });
      } else {
        setOutcome(null);
        setForm({ before_state: '', after_state: '', metrics_improved: '', testimonial_draft: '' });
      }
    } catch (e) {
      console.error('[OutcomeNotes] loadOutcome failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOutcome();
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (outcome) {
        await db.execute(
          'UPDATE outcomes SET before_state = ?, after_state = ?, metrics_improved = ?, testimonial_draft = ? WHERE id = ?',
          [
            form.before_state || null,
            form.after_state || null,
            form.metrics_improved || null,
            form.testimonial_draft || null,
            outcome.id,
          ]
        );
        setOutcome({
          ...outcome,
          before_state: form.before_state || undefined,
          after_state: form.after_state || undefined,
          metrics_improved: form.metrics_improved || undefined,
          testimonial_draft: form.testimonial_draft || undefined,
        });
      } else {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.execute(
          'INSERT INTO outcomes (id, project_id, before_state, after_state, metrics_improved, testimonial_draft, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            projectId,
            form.before_state || null,
            form.after_state || null,
            form.metrics_improved || null,
            form.testimonial_draft || null,
            now,
          ]
        );
        setOutcome({
          id,
          project_id: projectId,
          before_state: form.before_state || undefined,
          after_state: form.after_state || undefined,
          metrics_improved: form.metrics_improved || undefined,
          testimonial_draft: form.testimonial_draft || undefined,
          created_at: now,
        });
      }
    } catch (e) {
      console.error('[OutcomeNotes] handleSave failed:', e);
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Outcome Notes
          </h4>
        </div>
        <div className="space-y-2">
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Outcome Notes
        </h4>
        <Button size="sm" onClick={handleSave} loading={saving}>
          <Save size={12} /> Save
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            Before State
          </label>
          <textarea
            placeholder="Describe the client's situation before working with you..."
            value={form.before_state}
            onChange={(e) => setForm({ ...form, before_state: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            After State
          </label>
          <textarea
            placeholder="Describe the results and improvements achieved..."
            value={form.after_state}
            onChange={(e) => setForm({ ...form, after_state: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            Metrics Improved
          </label>
          <textarea
            placeholder="List key metrics that improved (e.g. +40% traffic, 3x conversion)..."
            value={form.metrics_improved}
            onChange={(e) => setForm({ ...form, metrics_improved: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">
            Testimonial Draft
          </label>
          <textarea
            placeholder="Draft a testimonial from the client's perspective..."
            value={form.testimonial_draft}
            onChange={(e) => setForm({ ...form, testimonial_draft: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </div>
      </div>

      {outcome && (
        <div className="text-[10px] text-[var(--text-tertiary)]">
          Last saved {new Date(outcome.created_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
