/**
 * Revision Tracker · Designer / Illustrator / UX Designer feature.
 * Tracks revision rounds with change summaries per project.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, Check, RotateCcw } from 'lucide-react';

export default function RevisionTracker({ projectId }: { projectId: string }) {
  const { revisions, loadRevisions, addRevision, removeRevision } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRevisions(); }, [projectId, loadRevisions]);

  const list = revisions.filter(r => r.project_id === projectId);
  const nextRound = list.length > 0 ? Math.max(...list.map((r) => r.round_number)) + 1 : 1;

  const handleSave = async () => {
    if (!changeSummary.trim()) return;
    setSaving(true);
    try {
      await addRevision({ project_id: projectId, round_number: nextRound, change_summary: changeSummary, approved: false });
      setChangeSummary('');
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-xs bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">Revisions ({list.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Log Revision
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-sm space-y-2">
          <p className="text-[10px] text-[var(--text-tertiary)]">Round {nextRound}</p>
          <input type="text" placeholder="What changed in this revision?" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} className={inputClass} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!changeSummary.trim()}>Save</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No revisions yet. Log your first revision round.</p>
      ) : (
        <div className="space-y-1">
          {list.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-xs text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${r.approved ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'bg-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                  {r.round_number}
                </span>
                <span className={`${r.approved ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>{r.change_summary || '--'}</span>
              </div>
              <div className="flex items-center gap-1">
                {r.approved ? <Check size={12} className="text-[var(--accent-ink,var(--accent))]" /> : <RotateCcw size={12} className="text-[var(--text-tertiary)]" />}
                <button
                  aria-label="Delete revision tracker"
                  onClick={() => removeRevision(r.id, projectId)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-1">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
