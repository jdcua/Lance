/**
 * Channel Log · Marketing feature.
 * Multi-select tag panel for project marketing channels.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import { X } from 'lucide-react';

type Channel = { id: string; project_id: string; channel: string };

const ALL_CHANNELS = ['SEO', 'Paid', 'Social', 'Email', 'PR', 'Content', 'other'];

const CHANNEL_COLORS: Record<string, string> = {
  SEO: 'bg-[#2ECC71]/15 text-[#2ECC71]',
  Paid: 'bg-[#E67E22]/15 text-[#E67E22]',
  Social: 'bg-[#9B59B6]/15 text-[#9B59B6]',
  Email: 'bg-[#3498DB]/15 text-[#3498DB]',
  PR: 'bg-[#E74C3C]/15 text-[#E74C3C]',
  Content: 'bg-[#1ABC9C]/15 text-[#1ABC9C]',
  other: 'bg-[var(--border-color)] text-[var(--text-secondary)]',
};

const CHANNEL_DOT_COLORS: Record<string, string> = {
  SEO: '#2ECC71',
  Paid: '#E67E22',
  Social: '#9B59B6',
  Email: '#3498DB',
  PR: '#E74C3C',
  Content: '#1ABC9C',
  other: '#888',
};

export default function ChannelLog({ projectId }: { projectId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChannels = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(Channel & Record<string, unknown>)[]>(
        'SELECT id, project_id, channel FROM project_channels WHERE project_id = ? ORDER BY id ASC',
        [projectId]
      );
      setChannels(rows.map(r => ({ id: r.id as string, project_id: r.project_id as string, channel: r.channel as string })));
    } catch (e) { console.error('[ChannelLog] loadChannels failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadChannels(); }, [projectId, loadChannels]);

  const handleToggle = async (channelName: string) => {
    const existing = channels.find(c => c.channel === channelName);
    if (existing) {
      try {
        const db = await getDb();
        await db.execute('DELETE FROM project_channels WHERE id = ?', [existing.id]);
        setChannels(prev => prev.filter(c => c.id !== existing.id));
      } catch (e) { console.error('[ChannelLog] removeChannel failed:', e); }
    } else {
      try {
        const id = crypto.randomUUID();
        const db = await getDb();
        await db.execute('INSERT INTO project_channels (id, project_id, channel) VALUES (?, ?, ?)', [id, projectId, channelName]);
        setChannels(prev => [...prev, { id, project_id: projectId, channel: channelName }]);
      } catch (e) { console.error('[ChannelLog] addChannel failed:', e); }
    }
  };

  const activeChannels = channels.map(c => c.channel);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Channels</h4>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-6 w-16 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Channels ({activeChannels.length})</h4>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_CHANNELS.map(ch => {
          const active = activeChannels.includes(ch);
          return (
            <button
              key={ch}
              onClick={() => handleToggle(ch)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                active ? CHANNEL_COLORS[ch] || CHANNEL_COLORS.other : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHANNEL_DOT_COLORS[ch] || CHANNEL_DOT_COLORS.other }} />}
              {ch}
            </button>
          );
        })}
      </div>

      {activeChannels.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No channels selected. Click a channel to add it.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {channels.map(c => (
            <span key={c.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium ${CHANNEL_COLORS[c.channel] || CHANNEL_COLORS.other}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHANNEL_DOT_COLORS[c.channel] || CHANNEL_DOT_COLORS.other }} />
              {c.channel}
              <button
                aria-label="Close"
                onClick={(e) => { e.stopPropagation(); handleToggle(c.channel); }} className="ml-0.5 hover:opacity-70">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
