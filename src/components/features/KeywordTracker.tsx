/**
 * Keyword Tracker · SEO Specialist feature.
 * Tracks keyword rankings by client.
 */
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KeywordTracker({ clientId }: { clientId: string }) {
  const { keywords, loadKeywords, addKeyword, updateKeyword, removeKeyword } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keyword: '', position_start: '', position_current: '', target_position: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (clientId) loadKeywords(); }, [clientId, loadKeywords]);

  const list = keywords.filter(k => k.client_id === clientId);

  const handleSave = async () => {
    if (!form.keyword.trim()) return;
    setSaving(true);
    try {
      await addKeyword({ client_id: clientId, keyword: form.keyword, position_start: form.position_start ? parseFloat(form.position_start) : undefined, position_current: form.position_current ? parseFloat(form.position_current) : undefined, target_position: form.target_position ? parseFloat(form.target_position) : undefined });
      setForm({ keyword: '', position_start: '', position_current: '', target_position: '' });
      setShowForm(false);
    } catch { /* handled */ }
    setSaving(false);
  };

  const positionIcon = (current: number | undefined, target: number | undefined) => {
    if (current == null || target == null) return <Minus size={10} className="text-[var(--text-tertiary)]" />;
    if (current <= target) return <Checkmark size={10} className="text-[var(--accent)]" />;
    if (current <= target * 1.5) return <Minus size={10} className="text-amber-500" />;
    return <TrendingUp size={10} className="text-[#A32D2D]" />;
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Keywords ({list.length})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add Keyword
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-[8px] space-y-2">
          <input type="text" placeholder="Keyword phrase" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} className={inputClass} autoFocus />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Start pos" value={form.position_start} onChange={(e) => setForm({ ...form, position_start: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Current pos" value={form.position_current} onChange={(e) => setForm({ ...form, position_current: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Target pos" value={form.target_position} onChange={(e) => setForm({ ...form, target_position: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.keyword.trim()}>Save</Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No keywords tracked yet.</p>
      ) : (
        <div className="space-y-1">
          {list.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-[6px] text-xs">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {positionIcon(k.position_current, k.target_position)}
                <span className="font-medium text-[var(--text-primary)]">{k.keyword}</span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                {k.position_current != null ? `#${k.position_current}` : '--'}
                {k.target_position != null && <> → #{k.target_position}</>}
              </span>
              <button onClick={() => removeKeyword(k.id, clientId)} className="text-[var(--text-tertiary)] hover:text-[#A32D2D] ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Checkmark = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
