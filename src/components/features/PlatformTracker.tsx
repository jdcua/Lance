/**
 * Platform Tracker -- Social Media Manager feature.
 * Toggle which platforms are active and set handles per platform.
 */
import { useState, useEffect } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Check, ExternalLink } from 'lucide-react';

type ClientPlatform = {
  id: string;
  client_id: string;
  platform: string;
  handle?: string;
  active: boolean;
};

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'X', 'Pinterest', 'YouTube', 'Facebook'];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  TikTok: '#000000',
  LinkedIn: '#0077B5',
  X: '#1DA1F2',
  Pinterest: '#BD081C',
  YouTube: '#FF0000',
  Facebook: '#1877F2',
};

export default function PlatformTracker({ clientId }: { clientId: string }) {
  const [platforms, setPlatforms] = useState<ClientPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPlatforms = async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ClientPlatform & Record<string, unknown>)[]>(
        'SELECT id, client_id, platform, handle, active FROM client_platforms WHERE client_id = ? ORDER BY platform ASC',
        [clientId]
      );
      const loaded = rows.map(r => ({
        id: r.id as string,
        client_id: r.client_id as string,
        platform: r.platform as string,
        handle: r.handle as string | undefined,
        active: !!(r.active),
      }));
      const missing = PLATFORMS.filter(p => !loaded.find(l => l.platform === p));
      if (missing.length > 0) {
        for (const p of missing) {
          try {
            const id = crypto.randomUUID();
            await db.execute('INSERT INTO client_platforms (id, client_id, platform, handle, active) VALUES (?, ?, ?, ?, ?)', [id, clientId, p, null, 1]);
            loaded.push({ id, client_id: clientId, platform: p, handle: undefined, active: true });
          } catch { /* ignore */ }
        }
      }
      setPlatforms(loaded);
    } catch (e) { console.error('[PlatformTracker] loadPlatforms failed:', e); }
    setLoading(false);
  };

  useEffect(() => { loadPlatforms(); }, [clientId]);

  const handleToggleActive = async (p: ClientPlatform) => {
    const next = p.active ? 0 : 1;
    try {
      const db = await getDb();
      await db.execute('UPDATE client_platforms SET active = ? WHERE id = ?', [next, p.id]);
      setPlatforms(prev => prev.map(pp => pp.id === p.id ? { ...pp, active: !pp.active } : pp));
    } catch (e) { console.error('[PlatformTracker] toggleActive failed:', e); }
  };

  const handleUpdateHandle = async (p: ClientPlatform, handle: string) => {
    setPlatforms(prev => prev.map(pp => pp.id === p.id ? { ...pp, handle } : pp));
    setSaving(true);
    try {
      const db = await getDb();
      await db.execute('UPDATE client_platforms SET handle = ? WHERE id = ?', [handle || null, p.id]);
    } catch (e) { console.error('[PlatformTracker] updateHandle failed:', e); }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Platforms</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activeCount = platforms.filter(p => p.active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Platforms ({activeCount})</h4>
      </div>

      <div className="space-y-1">
        {platforms.map(p => (
          <div key={p.id} className={`flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs ${!p.active ? 'opacity-40' : ''}`}>
            <button onClick={() => handleToggleActive(p)} className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 transition-colors ${p.active ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-color)]'}`}>
              {p.active && <Check size={10} className="text-white" />}
            </button>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#888' }} />
            <span className={`font-medium min-w-[80px] ${p.active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{p.platform}</span>
            <input
              type="text"
              placeholder="@handle"
              value={p.handle || ''}
              onChange={(e) => handleUpdateHandle(p, e.target.value)}
              className={inputClass + ' flex-1'}
              disabled={!p.active}
            />
            {p.handle && (
              <a href={`https://${p.platform.toLowerCase()}.com/${p.handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex-shrink-0">
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        ))}
      </div>

      {platforms.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No platforms configured.</p>
      )}
    </div>
  );
}
