/**
 * Complexity Tagger · Data Analyst feature.
 * Single record per project. Complexity tier radio buttons + notes textarea, save in place.
 */
import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../../db';
import Button from '../ui/Button';
import { Save, Brain } from 'lucide-react';

type ComplexityRecord = {
  id: string;
  project_id: string;
  complexity_tier: string;
  notes?: string;
};

const TIERS = [
  { value: 'descriptive', label: 'Descriptive', desc: 'What happened?' },
  { value: 'diagnostic', label: 'Diagnostic', desc: 'Why did it happen?' },
  { value: 'predictive', label: 'Predictive', desc: 'What will happen?' },
  { value: 'prescriptive', label: 'Prescriptive', desc: 'What should we do?' },
  { value: 'cognitive', label: 'Cognitive', desc: 'AI-driven insights' },
] as const;

const tierColors: Record<string, string> = {
  descriptive: '#16A34A',
  diagnostic: '#2563EB',
  predictive: '#D97706',
  prescriptive: '#DC2626',
  cognitive: '#7C3AED',
};

export default function ComplexityTagger({ projectId }: { projectId: string }) {
  const [record, setRecord] = useState<ComplexityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState('descriptive');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<(ComplexityRecord & Record<string, unknown>)[]>(
        'SELECT id, project_id, complexity_tier, notes FROM project_analysis_complexity WHERE project_id = ? LIMIT 1',
        [projectId]
      );
      if (rows.length > 0) {
        const r = rows[0];
        const item: ComplexityRecord = {
          id: r.id as string,
          project_id: r.project_id as string,
          complexity_tier: r.complexity_tier as string,
          notes: r.notes as string | undefined,
        };
        setRecord(item);
        setSelectedTier(item.complexity_tier);
        setNotes(item.notes || '');
      }
    } catch (e) { console.error('[ComplexityTagger] loadRecord failed:', e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadRecord(); }, [projectId, loadRecord]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDb();
      if (record) {
        await db.execute('UPDATE project_analysis_complexity SET complexity_tier = ?, notes = ? WHERE id = ?', [selectedTier, notes, record.id]);
        setRecord({ ...record, complexity_tier: selectedTier, notes });
      } else {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO project_analysis_complexity (id, project_id, complexity_tier, notes) VALUES (?, ?, ?, ?)',
          [id, projectId, selectedTier, notes]
        );
        setRecord({ id, project_id: projectId, complexity_tier: selectedTier, notes });
      }
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e) { console.error('[ComplexityTagger] save failed:', e); }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Analysis Complexity</h4>
        </div>
        <div className="h-32 bg-[var(--bg-secondary)] rounded-[6px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Analysis Complexity</h4>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[10px] text-[var(--text-tertiary)]">Saved {lastSaved}</span>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save size={12} /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
          <Brain size={10} />
          <span>Complexity Tier</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {TIERS.map((tier) => (
            <label
              key={tier.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs cursor-pointer border transition-all ${
                selectedTier === tier.value
                  ? 'bg-[var(--bg-card)] border-[var(--accent)]'
                  : 'bg-[var(--bg-secondary)] border-transparent hover:bg-[var(--bg-card)]'
              }`}
            >
              <input
                type="radio"
                name="complexity_tier"
                value={tier.value}
                checked={selectedTier === tier.value}
                onChange={() => setSelectedTier(tier.value)}
                className="accent-[var(--accent)]"
              />
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tierColors[tier.value] || '#888' }} />
              <span className="font-medium text-[var(--text-primary)]">{tier.label}</span>
              <span className="text-[var(--text-tertiary)]">{tier.desc}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] mt-2">
          <Brain size={10} />
          <span>Notes</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Complexity notes..."
          className={inputClass + ' resize-y'}
        />
      </div>
    </div>
  );
}
