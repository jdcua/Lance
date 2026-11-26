/**
 * Content Calendar · Social Media Manager feature.
 * Calendar grid for content posts with list view toggle and platform filter.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Trash2, LayoutGrid, List, ChevronLeft, ChevronRight, X } from 'lucide-react';

type Post = {
  id: string;
  client_id: string;
  date?: string;
  platform: string;
  content_type?: string;
  status: string;
  notes?: string;
  created_at: string;
};

const PLATFORMS = [
  'Instagram',
  'TikTok',
  'LinkedIn',
  'X',
  'Pinterest',
  'YouTube',
  'Facebook',
  'other',
];
const CONTENT_TYPES = ['Reel', 'Carousel', 'Static', 'Story', 'Long-form', 'Thread', 'other'];
const STATUSES = ['planned', 'drafted', 'scheduled', 'posted'];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  TikTok: '#000000',
  LinkedIn: '#0077B5',
  X: '#1DA1F2',
  Pinterest: '#BD081C',
  YouTube: '#FF0000',
  Facebook: '#1877F2',
  other: '#888888',
};

const PLATFORM_TEXT_COLORS: Record<string, string> = {
  Instagram: 'text-[#E1306C]',
  TikTok: 'text-[var(--text-primary)]',
  LinkedIn: 'text-[#0077B5]',
  X: 'text-[#1DA1F2]',
  Pinterest: 'text-[#BD081C]',
  YouTube: 'text-[#FF0000]',
  Facebook: 'text-[#1877F2]',
  other: 'text-[var(--text-tertiary)]',
};

export default function ContentCalendar({ clientId }: { clientId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [form, setForm] = useState({
    platform: PLATFORMS[0],
    content_type: CONTENT_TYPES[0],
    status: 'planned',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Post & Record<string, unknown>)[]>(
        'SELECT id, client_id, date, platform, content_type, status, notes, created_at FROM content_posts WHERE client_id = ? ORDER BY date DESC, created_at DESC',
        [clientId],
      );
      setPosts(
        rows.map((r) => ({
          id: r.id as string,
          client_id: r.client_id as string,
          date: r.date as string | undefined,
          platform: r.platform as string,
          content_type: r.content_type as string | undefined,
          status: r.status as string,
          notes: r.notes as string | undefined,
          created_at: r.created_at as string,
        })),
      );
    } catch (e) {
      console.error('[ContentCalendar] loadPosts failed:', e);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadPosts();
  }, [clientId, loadPosts]);

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const db = await getDb();
      await db.execute(
        'INSERT INTO content_posts (id, client_id, date, platform, content_type, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          clientId,
          selectedDate,
          form.platform,
          form.content_type || null,
          form.status,
          form.notes || null,
          new Date().toISOString(),
        ],
      );
      const item: Post = {
        id,
        client_id: clientId,
        date: selectedDate,
        platform: form.platform,
        content_type: form.content_type,
        status: form.status,
        notes: form.notes || undefined,
        created_at: new Date().toISOString(),
      };
      setPosts((prev) => [item, ...prev]);
      setForm({
        platform: PLATFORMS[0],
        content_type: CONTENT_TYPES[0],
        status: 'planned',
        notes: '',
      });
      setShowForm(false);
    } catch (e) {
      console.error('[ContentCalendar] addPost failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM content_posts WHERE id = ?', [id]);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[ContentCalendar] deletePost failed:', e);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const getPostsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let dayPosts = posts.filter((p) => p.date === dateStr);
    if (filterPlatform) dayPosts = dayPosts.filter((p) => p.platform === filterPlatform);
    return dayPosts;
  };

  const filteredPosts = filterPlatform ? posts.filter((p) => p.platform === filterPlatform) : posts;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Content Calendar</h4>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => (
            <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
          Content Calendar ({posts.length})
        </h4>
        <div className="flex items-center gap-1">
          <button
            aria-label="Switch to grid view"
            onClick={() => setViewMode('calendar')}
            className={`p-1 rounded-[4px] ${viewMode === 'calendar' ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
          >
            <LayoutGrid size={12} />
          </button>
          <button
            aria-label="Switch to list view"
            onClick={() => setViewMode('list')}
            className={`p-1 rounded-[4px] ${viewMode === 'list' ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
          >
            <List size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setFilterPlatform(null)}
          className={`px-2 py-0.5 rounded-[4px] text-[10px] ${!filterPlatform ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setFilterPlatform(filterPlatform === p ? null : p)}
            className={`px-2 py-0.5 rounded-[4px] text-[10px] ${filterPlatform === p ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {viewMode === 'calendar' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              aria-label="Previous"
              onClick={prevMonth}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-[var(--text-primary)]">{monthLabel}</span>
            <button
              aria-label="Next"
              onClick={nextMonth}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-[10px] text-[var(--text-tertiary)] py-1">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayPosts = getPostsForDate(day);
              const uniquePlatforms = [...new Set(dayPosts.map((p) => p.platform))];
              return (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setShowForm(true);
                  }}
                  className="h-8 bg-[var(--bg-secondary)] rounded-[4px] flex flex-col items-center justify-center relative hover:bg-[var(--border-color)] transition-colors"
                >
                  <span className="text-[10px] text-[var(--text-secondary)]">{day}</span>
                  {uniquePlatforms.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {uniquePlatforms.map((p) => (
                        <span
                          key={p}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[p] || PLATFORM_COLORS.other }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredPosts.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] py-2">
              No posts yet. Click a date to add content.
            </p>
          ) : (
            filteredPosts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: PLATFORM_COLORS[p.platform] || PLATFORM_COLORS.other,
                    }}
                  />
                  <span className="font-medium text-[var(--text-primary)]">
                    {p.content_type || 'Post'}
                  </span>
                  <span
                    className={`text-[10px] ${PLATFORM_TEXT_COLORS[p.platform] || PLATFORM_TEXT_COLORS.other}`}
                  >
                    {p.platform}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-tertiary)]">
                    {p.status}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{p.date || '--'}</span>
                </div>
                <button
                  aria-label="Delete content calendar"
                  onClick={() => handleDelete(p.id)}
                  className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-tertiary)]">Date: {selectedDate}</span>
            <button
              aria-label="Close"
              onClick={() => setShowForm(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className={inputClass}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              aria-label="Content Type"
              value={form.content_type}
              onChange={(e) => setForm({ ...form, content_type: e.target.value })}
              className={inputClass}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
    </div>
  );
}
