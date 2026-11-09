/**
 * Platform Log · Game Developer feature.
 * Multi-select tag panel for engines and target platforms.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import { X } from 'lucide-react';

type PlatformRecord = {
  id: string;
  project_id: string;
  engine?: string;
  target_platform?: string;
};

const ENGINES = ['Unity', 'Unreal', 'Godot', 'GameMaker', 'custom'] as const;
const TARGET_PLATFORMS = ['PC', 'Mobile-iOS', 'Mobile-Android', 'Console', 'Web', 'VR'] as const;

const engineColors: Record<string, string> = {
  Unity: 'bg-[#3498DB]/15 text-[#3498DB]',
  Unreal: 'bg-[#9B59B6]/15 text-[#9B59B6]',
  Godot: 'bg-[#2ECC71]/15 text-[#2ECC71]',
  GameMaker: 'bg-[#E67E22]/15 text-[#E67E22]',
  custom: 'bg-[#E74C3C]/15 text-[#E74C3C]',
};

const platformColors: Record<string, string> = {
  PC: 'bg-[#2563EB]/15 text-[#2563EB]',
  'Mobile-iOS': 'bg-[#16A34A]/15 text-[#16A34A]',
  'Mobile-Android': 'bg-[#16A34A]/15 text-[#16A34A]',
  Console: 'bg-[#D97706]/15 text-[#D97706]',
  Web: 'bg-[#1ABC9C]/15 text-[#1ABC9C]',
  VR: 'bg-[#9B59B6]/15 text-[#9B59B6]',
};

export default function PlatformLog({ projectId }: { projectId: string }) {
  const [records, setRecords] = useState<PlatformRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(PlatformRecord & Record<string, unknown>)[]>(
        'SELECT id, project_id, engine, target_platform FROM project_platforms WHERE project_id = ? ORDER BY id ASC',
        [projectId]
      );
      setRecords(rows.map(r => ({
        id: r.id as string,
        project_id: r.project_id as string,
        engine: r.engine as string | undefined,
        target_platform: r.target_platform as string | undefined,
      })));
    } catch (e) { console.error('[PlatformLog] loadRecords failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadRecords(); }, [projectId, loadRecords]);

  const engines = records.filter(r => r.engine).map(r => r.engine!);
  const platforms = records.filter(r => r.target_platform).map(r => r.target_platform!);

  const handleToggleEngine = async (engine: string) => {
    const existing = records.find(r => r.engine === engine);
    if (existing) {
      try {
        const db = await getDb();
        await db.execute('DELETE FROM project_platforms WHERE id = ?', [existing.id]);
        setRecords(prev => prev.filter(r => r.id !== existing.id));
      } catch (e) { console.error('[PlatformLog] remove engine failed:', e); }
    } else {
      try {
        const id = crypto.randomUUID();
        const db = await getDb();
        await db.execute('INSERT INTO project_platforms (id, project_id, engine, target_platform) VALUES (?, ?, ?, ?)', [id, projectId, engine, null]);
        setRecords(prev => [...prev, { id, project_id: projectId, engine, target_platform: undefined }]);
      } catch (e) { console.error('[PlatformLog] add engine failed:', e); }
    }
  };

  const handleTogglePlatform = async (platform: string) => {
    const existing = records.find(r => r.target_platform === platform);
    if (existing) {
      try {
        const db = await getDb();
        await db.execute('DELETE FROM project_platforms WHERE id = ?', [existing.id]);
        setRecords(prev => prev.filter(r => r.id !== existing.id));
      } catch (e) { console.error('[PlatformLog] remove platform failed:', e); }
    } else {
      try {
        const id = crypto.randomUUID();
        const db = await getDb();
        await db.execute('INSERT INTO project_platforms (id, project_id, engine, target_platform) VALUES (?, ?, ?, ?)', [id, projectId, null, platform]);
        setRecords(prev => [...prev, { id, project_id: projectId, engine: undefined, target_platform: platform }]);
      } catch (e) { console.error('[PlatformLog] add platform failed:', e); }
    }
  };

  const getEngineColor = (engine: string) => engineColors[engine] || 'bg-[var(--border-color)] text-[var(--text-secondary)]';
  const getPlatformColor = (platform: string) => platformColors[platform] || 'bg-[var(--border-color)] text-[var(--text-secondary)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Platforms</h4>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[var(--bg-secondary)] rounded-xs animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Platforms</h4>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1.5">Engine</p>
        <div className="flex flex-wrap gap-1.5">
          {ENGINES.map(engine => {
            const selected = engines.includes(engine);
            return (
              <button
                key={engine}
                onClick={() => handleToggleEngine(engine)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  selected ? getEngineColor(engine) : 'bg-[var(--border-color)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {engine}
              </button>
            );
          })}
        </div>
        {engines.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {engines.map(engine => (
              <span key={engine} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${getEngineColor(engine)}`}>
                {engine}
                <button
                  aria-label="Close"
                  onClick={() => handleToggleEngine(engine)} className="hover:opacity-70">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1.5">Target Platform</p>
        <div className="flex flex-wrap gap-1.5">
          {TARGET_PLATFORMS.map(platform => {
            const selected = platforms.includes(platform);
            return (
              <button
                key={platform}
                onClick={() => handleTogglePlatform(platform)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  selected ? getPlatformColor(platform) : 'bg-[var(--border-color)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {platform}
              </button>
            );
          })}
        </div>
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {platforms.map(platform => (
              <span key={platform} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${getPlatformColor(platform)}`}>
                {platform}
                <button
                  aria-label="Close"
                  onClick={() => handleTogglePlatform(platform)} className="hover:opacity-70">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {engines.length === 0 && platforms.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No platforms set yet. Click tags above to add engines and target platforms.</p>
      )}
    </div>
  );
}
