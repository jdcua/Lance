/**
 * Meal Plan Builder · Nutritionist feature.
 * Meal plan creation with expandable detail view.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, ChevronRight } from 'lucide-react';

type MealPlan = {
  id: string;
  client_id: string;
  title: string;
  days?: number;
  calories_per_day?: number;
  plan_data?: string;
  created_at: string;
};

export default function MealPlanBuilder({ clientId }: { clientId: string }) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    days: '',
    calories_per_day: '',
    plan_data: '',
  });
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(MealPlan & Record<string, unknown>)[]>(
        'SELECT id, client_id, title, days, calories_per_day, plan_data, created_at FROM meal_plans WHERE client_id = ? ORDER BY created_at DESC',
        [clientId],
      );
      setPlans(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          title: r.title as string,
          days: r.days as number | undefined,
          calories_per_day: r.calories_per_day as number | undefined,
          plan_data: r.plan_data as string | undefined,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[MealPlanBuilder] loadPlans failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadPlans();
  }, [clientId, loadPlans]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const db = await getDb();
      await db.execute(
        'INSERT INTO meal_plans (id, client_id, title, days, calories_per_day, plan_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          form.title.trim(),
          form.days ? parseInt(form.days) : null,
          form.calories_per_day ? parseInt(form.calories_per_day) : null,
          form.plan_data || null,
          now,
        ],
      );
      const plan: MealPlan = {
        id,
        client_id: clientId,
        title: form.title.trim(),
        days: form.days ? parseInt(form.days) : undefined,
        calories_per_day: form.calories_per_day ? parseInt(form.calories_per_day) : undefined,
        plan_data: form.plan_data || undefined,
        created_at: now,
      };
      setPlans((prev) => [plan, ...prev]);
      setForm({ title: '', days: '', calories_per_day: '', plan_data: '' });
      setShowForm(false);
    } catch (e) {
      console.error('[MealPlanBuilder] handleSave failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM meal_plans WHERE id = ?', [id]);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[MealPlanBuilder] handleDelete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Meal Plans</h4>
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
          Meal Plans ({plans.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New Plan
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Plan title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Days"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Calories per day"
              value={form.calories_per_day}
              onChange={(e) => setForm({ ...form, calories_per_day: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Plan data (meals, portions, notes)"
            value={form.plan_data}
            onChange={(e) => setForm({ ...form, plan_data: e.target.value })}
            rows={4}
            className={inputClass + ' resize-none'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.title.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No meal plans yet.</p>
      ) : (
        <div className="space-y-1">
          {plans.map((plan) => (
            <div key={plan.id}>
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button
                    aria-label="Next"
                    onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight
                      size={10}
                      className={`transition-transform ${expanded === plan.id ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {plan.title}
                  </span>
                  {plan.days != null && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{plan.days}d</span>
                  )}
                  {plan.calories_per_day != null && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {plan.calories_per_day} cal/d
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  aria-label="Delete meal plan builder"
                  onClick={() => handleDelete(plan.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {expanded === plan.id && (
                <div className="mt-1 px-3 py-2 bg-[var(--bg-secondary)]/50 rounded-xs text-xs">
                  {plan.plan_data ? (
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">
                      {plan.plan_data}
                    </p>
                  ) : (
                    <p className="text-[var(--text-tertiary)] italic">No plan data.</p>
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
