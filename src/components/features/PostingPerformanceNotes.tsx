/**
 * Posting Performance Notes · Social Media feature.
 * Reads content_posts. Shows recent posted items with their platforms and dates.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';

type Post = {
  id: string;
  date?: string;
  platform: string;
  content_type?: string;
  notes?: string;
};

export default function PostingPerformanceNotes({ clientId }: { clientId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDb();
        let query = "SELECT id, date, platform, content_type, notes FROM content_posts WHERE status = 'posted'";
        const params: string[] = [];
        if (clientId) {
          query += " AND client_id = ?";
          params.push(clientId);
        }
        query += " ORDER BY date DESC, id DESC LIMIT 50";
        const rows = await db.select<(Post & Record<string, unknown>)[]>(query, params);
        setPosts(rows.map(r => ({
          id: r.id as string,
          date: r.date as string | undefined,
          platform: r.platform as string,
          content_type: r.content_type as string | undefined,
          notes: r.notes as string | undefined,
        })));
      } catch (e) { console.error('[PostingPerformanceNotes] load failed:', e); }
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Recent Posts</h4>
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[4px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Recent Posts</h4>
      {posts.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)]">No posted content yet.</p>
      ) : (
        <div className="space-y-1">
          {posts.map(p => (
            <div key={p.id} className="flex items-center justify-between px-2 py-1.5 bg-[var(--bg-secondary)] rounded-[4px] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[var(--text-primary)] truncate">{p.platform}</span>
                {p.content_type && (
                  <span className="text-[10px] text-[var(--text-tertiary)] px-1 py-0.5 rounded bg-[var(--border-color)]">{p.content_type}</span>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-2">{p.date || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
