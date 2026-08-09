/**
 * Revision Counter — compact panel showing revision count vs limit.
 * Uses store for revisions and proposals; auto-increments round_number on add.
 */
import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, RotateCcw } from 'lucide-react';
import { getArchetype } from '../../archetypes';

export default function RevisionCounter({ projectId }: { projectId: string }) {
  const { revisions, loadRevisions, addRevision, proposals, profile } = useStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRevisions(); }, [projectId, loadRevisions]);

  const list = revisions.filter(r => r.project_id === projectId);
  const nextRound = list.length > 0 ? Math.max(...list.map((r) => r.round_number)) + 1 : 1;

  const projectProposal = proposals.find(p => p.project_id === projectId);
  const archetype = useMemo(() => getArchetype(profile?.profession || ''), [profile?.profession]);
  const revisionLimit = useMemo(() => archetype?.maxRevisions ?? 3, [archetype]);

  const currentRound = list.length;
  const overLimit = currentRound > revisionLimit;
  const atLimit = currentRound === revisionLimit;

  const countColor = overLimit ? 'text-[#E74C3C]' : atLimit ? 'text-[#E67E22]' : 'text-[#2ECC71]';
  const bgColor = overLimit ? 'bg-[#E74C3C]/10' : atLimit ? 'bg-[#E67E22]/10' : 'bg-[#2ECC71]/10';

  const handleAddRound = async () => {
    setSaving(true);
    try {
      await addRevision({ project_id: projectId, round_number: nextRound, change_summary: `Revision round ${nextRound}`, approved: false });
    } catch { /* handled */ }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Revisions</h4>
        <Button variant="ghost" size="sm" onClick={handleAddRound} loading={saving}>
          <Plus size={12} /> Add Round
        </Button>
      </div>

      <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-[8px] ${bgColor}`}>
        <RotateCcw size={16} className={countColor} />
        <span className={`text-lg font-bold ${countColor}`}>
          {currentRound} / {revisionLimit}
        </span>
        <span className={`text-xs ${countColor}`}>
          {overLimit ? 'Over limit' : atLimit ? 'At limit' : 'Under limit'}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No revisions yet. Add your first round.</p>
      ) : (
        <div className="space-y-1">
          {list.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${r.approved ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                  {r.round_number}
                </span>
                <span className="text-[var(--text-primary)]">{r.change_summary || '—'}</span>
              </div>
              {r.approved && <span className="text-[10px] text-[var(--accent)]">Approved</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
