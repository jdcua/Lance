/**
 * Campaign Tracker · Marketing / Social Media Manager feature.
 * Tracks campaigns with channel, dates, budget, and KPI comparison.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Campaign = {
  id: string;
  project_id: string;
  name: string;
  channel?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  kpi_target?: string;
  kpi_result?: string;
};

const CHANNELS = ['SEO', 'Paid', 'Social', 'Email', 'PR', 'Content', 'Influencer', 'other'];

const kpiTrend = (target?: string, result?: string): { icon: typeof Minus; color: string } => {
  const t = parseFloat(target || '');
  const r = parseFloat(result || '');
  if (isNaN(t) || isNaN(r)) return { icon: Minus, color: 'text-[var(--text-tertiary)]' };
  if (r > t) return { icon: TrendingUp, color: 'text-[#2ECC71]' };
  if (r < t) return { icon: TrendingDown, color: 'text-[#E74C3C]' };
  return { icon: Minus, color: 'text-[var(--text-tertiary)]' };
};

export default function CampaignTracker({ projectId }: { projectId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    channel: CHANNELS[0],
    start_date: '',
    end_date: '',
    budget: '',
    kpi_target: '',
    kpi_result: '',
  });
  const [saving, setSaving] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Campaign & Record<string, unknown>)[]>(
        'SELECT id, project_id, name, channel, start_date, end_date, budget, kpi_target, kpi_result FROM campaigns WHERE project_id = ? ORDER BY id DESC',
        [projectId],
      );
      setCampaigns(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          name: r.name as string,
          channel: r.channel as string | undefined,
          start_date: r.start_date as string | undefined,
          end_date: r.end_date as string | undefined,
          budget: r.budget as number | undefined,
          kpi_target: r.kpi_target as string | undefined,
          kpi_result: r.kpi_result as string | undefined,
        })),
      );
    } catch (e) {
      console.error('[CampaignTracker] loadCampaigns failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadCampaigns();
  }, [projectId, loadCampaigns]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO campaigns (id, project_id, name, channel, start_date, end_date, budget, kpi_target, kpi_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.name.trim(),
          form.channel,
          form.start_date || null,
          form.end_date || null,
          form.budget ? parseFloat(form.budget) : null,
          form.kpi_target || null,
          form.kpi_result || null,
        ],
      );
      const item: Campaign = {
        id,
        project_id: projectId,
        name: form.name.trim(),
        channel: form.channel,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        kpi_target: form.kpi_target || undefined,
        kpi_result: form.kpi_result || undefined,
      };
      setCampaigns((prev) => [item, ...prev]);
      setForm({
        name: '',
        channel: CHANNELS[0],
        start_date: '',
        end_date: '',
        budget: '',
        kpi_target: '',
        kpi_result: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[CampaignTracker] addCampaign failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM campaigns WHERE id = ?', [id]);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('[CampaignTracker] deleteCampaign failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
            Campaigns
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
          Campaigns ({campaigns.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Campaign
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <input
            type="text"
            placeholder="Campaign name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Channel"
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className={inputClass}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Budget ($)"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="KPI target (e.g. 5000)"
              value={form.kpi_target}
              onChange={(e) => setForm({ ...form, kpi_target: e.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="KPI result (e.g. 6200)"
              value={form.kpi_result}
              onChange={(e) => setForm({ ...form, kpi_result: e.target.value })}
              className={inputClass}
            />
          </div>
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

      {campaigns.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No campaigns yet. Add your first campaign.
        </p>
      ) : (
        <div className="space-y-1">
          {campaigns.map((c) => {
            const { icon: TrendIcon, color: trendColor } = kpiTrend(c.kpi_target, c.kpi_result);
            return (
              <div
                key={c.id}
                className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{c.name}</span>
                    {c.channel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                        {c.channel}
                      </span>
                    )}
                  </div>
                  <button
                    aria-label="Delete campaign tracker"
                    onClick={() => handleDelete(c.id)}
                    className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                  {c.start_date && (
                    <span>
                      {c.start_date}
                      {c.end_date && ` → ${c.end_date}`}
                    </span>
                  )}
                  {c.budget != null && <span>${c.budget.toLocaleString()}</span>}
                </div>
                {(c.kpi_target || c.kpi_result) && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-[var(--text-tertiary)]">KPI:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {c.kpi_target || '--'}
                    </span>
                    {c.kpi_target && c.kpi_result && (
                      <>
                        <TrendIcon size={10} className={trendColor} />
                        <span className={`font-medium ${trendColor}`}>{c.kpi_result}</span>
                      </>
                    )}
                    {!c.kpi_target && c.kpi_result && (
                      <span className="font-medium">{c.kpi_result}</span>
                    )}
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
