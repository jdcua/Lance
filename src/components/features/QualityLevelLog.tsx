/**
 * Quality Level Log · Translator feature.
 * Single-record quality tier selection per project with notes.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Save, Shield, FileCheck, GraduationCap, Scale, Languages } from 'lucide-react';

type ProjectQuality = {
  id: string;
  project_id: string;
  quality_tier: string;
  notes?: string;
};

const TIERS = ['rough', 'standard', 'certified', 'sworn', 'localization'] as const;

const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  rough: {
    label: 'Rough',
    icon: <FileCheck size={14} />,
    description: 'Quick translation for internal use or gist understanding.',
  },
  standard: {
    label: 'Standard',
    icon: <Languages size={14} />,
    description: 'Professional translation suitable for general business use.',
  },
  certified: {
    label: 'Certified',
    icon: <Shield size={14} />,
    description: 'Official document translation with certification.',
  },
  sworn: {
    label: 'Sworn',
    icon: <Scale size={14} />,
    description: 'Legal-grade translation by a sworn translator.',
  },
  localization: {
    label: 'Localization',
    icon: <GraduationCap size={14} />,
    description: 'Full cultural adaptation for the target market.',
  },
};

const TIER_COLORS: Record<string, string> = {
  rough: 'border-[#D97706] bg-[#D97706]/10',
  standard: 'border-[#16A34A] bg-[#16A34A]/10',
  certified: 'border-[#2563EB] bg-[#2563EB]/10',
  sworn: 'border-[#9B59B6] bg-[#9B59B6]/10',
  localization: 'border-[#E67E22] bg-[#E67E22]/10',
};

export default function QualityLevelLog({ projectId }: { projectId: string }) {
  const [quality, setQuality] = useState<ProjectQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('standard');
  const [notes, setNotes] = useState('');

  const loadQuality = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ProjectQuality & Record<string, unknown>)[]>(
        'SELECT id, project_id, quality_tier, notes FROM project_quality WHERE project_id = ?',
        [projectId]
      );
      if (rows.length > 0) {
        const q: ProjectQuality = {
          id: rows[0].id as string,
          project_id: rows[0].project_id as string,
          quality_tier: rows[0].quality_tier as string,
          notes: rows[0].notes as string | undefined,
        };
        setQuality(q);
        setSelectedTier(q.quality_tier);
        setNotes(q.notes || '');
      } else {
        setQuality(null);
        setSelectedTier('standard');
        setNotes('');
      }
    } catch (e) {
      console.error('[QualityLevelLog] loadQuality failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadQuality();
  }, [projectId, loadQuality]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (quality) {
        await db.execute(
          'UPDATE project_quality SET quality_tier = ?, notes = ? WHERE id = ?',
          [selectedTier, notes || null, quality.id]
        );
        setQuality({ ...quality, quality_tier: selectedTier, notes: notes || undefined });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO project_quality (id, project_id, quality_tier, notes) VALUES (?, ?, ?, ?)',
          [id, projectId, selectedTier, notes || null]
        );
        setQuality({ id, project_id: projectId, quality_tier: selectedTier, notes: notes || undefined });
      }
    } catch (e) {
      console.error('[QualityLevelLog] save failed:', e);
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Quality Level</h4>
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
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Quality Level</h4>
        <Button size="sm" onClick={handleSave} loading={saving}>
          <Save size={12} /> Save
        </Button>
      </div>

      {quality && (
        <div className={`p-2 rounded-[6px] border-l-[3px] ${TIER_COLORS[quality.quality_tier] || ''}`}>
          <div className="flex items-center gap-1.5">
            {TIER_CONFIG[quality.quality_tier]?.icon}
            <span className="text-xs font-medium text-[var(--text-primary)]">{TIER_CONFIG[quality.quality_tier]?.label || quality.quality_tier}</span>
          </div>
          {quality.notes && (
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{quality.notes}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {TIERS.map((tier) => {
          const cfg = TIER_CONFIG[tier];
          const selected = selectedTier === tier;
          return (
            <label
              key={tier}
              className={`flex items-start gap-2 px-3 py-2 rounded-[6px] cursor-pointer border transition-colors ${
                selected
                  ? TIER_COLORS[tier] + ' border-l-[3px]'
                  : 'bg-[var(--bg-secondary)] border border-transparent hover:bg-[var(--bg-card)]'
              }`}
            >
              <input
                type="radio"
                name="quality_tier"
                value={tier}
                checked={selected}
                onChange={() => setSelectedTier(tier)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {cfg.icon}
                  <span className="text-xs font-medium text-[var(--text-primary)]">{cfg.label}</span>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{cfg.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div>
        <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">Notes</label>
        <textarea
          placeholder="Additional quality notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass + ' resize-none'}
        />
      </div>

      {!quality && (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No quality level set. Select a tier and save.</p>
      )}
    </div>
  );
}
