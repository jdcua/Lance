/**
 * Creative Rotation Log · tracks creative asset performance with auto-calculated CTR.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';

type Creative = {
  id: string;
  project_id: string;
  creative_name: string;
  platform?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  start_date?: string;
  end_date?: string;
};

const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'Twitter', 'TikTok', 'Google', 'YouTube', 'other'];

export default function CreativeRotationLog({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ creative_name: '', platform: PLATFORMS[0], impressions: '', clicks: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Creative & Record<string, unknown>)[]>(
        'SELECT id, project_id, creative_name, platform, impressions, clicks, ctr, start_date, end_date FROM creative_rotations WHERE project_id = ? ORDER BY id DESC',
        [projectId]
      );
      setItems(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        creative_name: r.creative_name as string,
        platform: r.platform as string | undefined,
        impressions: (r.impressions as number) || 0,
        clicks: (r.clicks as number) || 0,
        ctr: (r.ctr as number) || 0,
        start_date: r.start_date as string | undefined,
        end_date: r.end_date as string | undefined,
      })));
    } catch (e) { console.error('[CreativeRotationLog] load failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadItems(); }, [projectId, loadItems]);

  const handleSave = async () => {
    if (!form.creative_name.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const impressions = form.impressions ? parseInt(form.impressions) : 0;
      const clicks = form.clicks ? parseInt(form.clicks) : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const db = await getDb();
      await db.execute(
        'INSERT INTO creative_rotations (id, project_id, creative_name, platform, impressions, clicks, ctr, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, form.creative_name.trim(), form.platform, impressions, clicks, ctr, form.start_date || null, form.end_date || null]
      );
      const item: Creative = { id, project_id: projectId, creative_name: form.creative_name.trim(), platform: form.platform, impressions, clicks, ctr, start_date: form.start_date || undefined, end_date: form.end_date || undefined };
      setItems(prev => [item, ...prev]);
      setForm({ creative_name: '', platform: PLATFORMS[0], impressions: '', clicks: '', start_date: '', end_date: '' });
      setShowForm(false);
    } catch (e) { console.error('[CreativeRotationLog] save failed:', e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM creative_rotations WHERE id = ?', [id]);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error('[CreativeRotationLog] delete failed:', e); }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Creative Rotation</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Creative Rotation ({items.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Creative
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Creative name" value={form.creative_name} onChange={(e) => setForm({ ...form, creative_name: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={inputClass}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="number" placeholder="Impressions" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Clicks" value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })} className={inputClass} />
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.creative_name.trim()}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No creatives yet. Add your first creative.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{item.creative_name}</span>
                  {item.platform && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">{item.platform}</span>}
                </div>
                <button
                  aria-label="Delete creative rotation log"
                  onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                <span>{item.impressions.toLocaleString()} imp</span>
                <span>{item.clicks.toLocaleString()} clicks</span>
                <span className="font-medium text-[var(--text-primary)]">CTR: {item.ctr.toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                {item.start_date && <span>{item.start_date}{item.end_date && ` → ${item.end_date}`}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
