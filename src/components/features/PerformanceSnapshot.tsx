/**
 * Performance Snapshot · channel performance with auto-calculated ROAS and channel badges.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Snapshot = {
  id: string;
  project_id: string;
  date?: string;
  channel?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas: number;
};

const CHANNELS = [
  'SEO',
  'Paid',
  'Social',
  'Email',
  'PR',
  'Content',
  'Influencer',
  'Referral',
  'Direct',
  'other',
];
const CHANNEL_COLORS: Record<string, string> = {
  SEO: 'bg-[#2ECC71]/20 text-[#2ECC71]',
  Paid: 'bg-[#3498DB]/20 text-[#3498DB]',
  Social: 'bg-[#9B59B6]/20 text-[#9B59B6]',
  Email: 'bg-[#E67E22]/20 text-[#E67E22]',
  PR: 'bg-[#1ABC9C]/20 text-[#1ABC9C]',
  Content: 'bg-[#F39C12]/20 text-[#F39C12]',
  Influencer: 'bg-[#E74C3C]/20 text-[#E74C3C]',
};

export default function PerformanceSnapshot({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: '',
    channel: CHANNELS[0],
    impressions: '',
    clicks: '',
    conversions: '',
    spend: '',
    revenue: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Snapshot & Record<string, unknown>)[]>(
        'SELECT id, project_id, date, channel, impressions, clicks, conversions, spend, revenue, roas FROM performance_snapshots WHERE project_id = ? ORDER BY date DESC, id DESC',
        [projectId],
      );
      setItems(
        rows.map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          date: r.date as string | undefined,
          channel: r.channel as string | undefined,
          impressions: (r.impressions as number) || 0,
          clicks: (r.clicks as number) || 0,
          conversions: (r.conversions as number) || 0,
          spend: (r.spend as number) || 0,
          revenue: (r.revenue as number) || 0,
          roas: (r.roas as number) || 0,
        })),
      );
    } catch (e) {
      console.error('[PerformanceSnapshot] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadItems();
  }, [projectId, loadItems]);

  const handleSave = async () => {
    if (!form.channel.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const impressions = form.impressions ? parseInt(form.impressions) : 0;
      const clicks = form.clicks ? parseInt(form.clicks) : 0;
      const conversions = form.conversions ? parseInt(form.conversions) : 0;
      const spend = form.spend ? parseFloat(form.spend) : 0;
      const revenue = form.revenue ? parseFloat(form.revenue) : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO performance_snapshots (id, project_id, date, channel, impressions, clicks, conversions, spend, revenue, roas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          projectId,
          form.date || null,
          form.channel,
          impressions,
          clicks,
          conversions,
          spend,
          revenue,
          roas,
        ],
      );
      const item: Snapshot = {
        id,
        project_id: projectId,
        date: form.date || undefined,
        channel: form.channel,
        impressions,
        clicks,
        conversions,
        spend,
        revenue,
        roas,
      };
      setItems((prev) => [item, ...prev]);
      setForm({
        date: '',
        channel: CHANNELS[0],
        impressions: '',
        clicks: '',
        conversions: '',
        spend: '',
        revenue: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[PerformanceSnapshot] save failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM performance_snapshots WHERE id = ?', [id]);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error('[PerformanceSnapshot] delete failed:', e);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Performance</h4>
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
          Performance ({items.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Snapshot
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
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
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Impressions"
              value={form.impressions}
              onChange={(e) => setForm({ ...form, impressions: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Clicks"
              value={form.clicks}
              onChange={(e) => setForm({ ...form, clicks: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Conversions"
              value={form.conversions}
              onChange={(e) => setForm({ ...form, conversions: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Spend ($)"
              value={form.spend}
              onChange={(e) => setForm({ ...form, spend: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              placeholder="Revenue ($)"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">
          No performance snapshots yet. Add your first snapshot.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {item.channel && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[item.channel] || 'bg-[var(--border-color)] text-[var(--text-tertiary)]'}`}
                    >
                      {item.channel}
                    </span>
                  )}
                  {item.date && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{item.date}</span>
                  )}
                </div>
                <button
                  aria-label="Delete performance snapshot"
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)] flex-wrap">
                <span>{item.impressions.toLocaleString()} imp</span>
                <span>{item.clicks.toLocaleString()} clicks</span>
                <span>{item.conversions.toLocaleString()} conv</span>
                <span>${item.spend.toLocaleString()} spend</span>
                <span>${item.revenue.toLocaleString()} rev</span>
                <span
                  className={`font-medium ${item.roas >= 1 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}
                >
                  ROAS: {item.roas.toFixed(2)}x
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
