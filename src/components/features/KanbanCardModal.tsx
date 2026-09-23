import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { KanbanCard, KanbanColumn } from '../../types';

type Props = {
  card: KanbanCard | null;
  columns: KanbanColumn[];
  onSave: (card: KanbanCard, updates: Partial<KanbanCard>) => Promise<void>;
  onDelete: (cardId: string) => void;
  onClose: () => void;
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

export default function KanbanCardModal({ card, columns: _columns, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [hoursEstimated, setHoursEstimated] = useState('');
  const [hoursActual, setHoursActual] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description || '');
    setPriority(card.priority);
    setHoursEstimated(card.hours_estimated != null ? String(card.hours_estimated) : '');
    setHoursActual(card.hours_actual != null ? String(card.hours_actual) : '');
    setDueDate(card.due_date || '');
    setAssignee(card.assignee || '');
    try { setLabels(JSON.parse(card.labels)); } catch { setLabels([]); }
  }, [card]);

  if (!card) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(card, {
        title,
        description: description || undefined,
        priority,
        hours_estimated: hoursEstimated ? parseFloat(hoursEstimated) : undefined,
        hours_actual: hoursActual ? parseFloat(hoursActual) : undefined,
        due_date: dueDate || undefined,
        assignee: assignee || undefined,
        labels: JSON.stringify(labels),
      });
      onClose();
    } catch (e) {
      console.error('[KanbanCardModal] save failed:', e);
    }
    setSaving(false);
  };

  const addLabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels(prev => [...prev, trimmed]);
      setLabelInput('');
    }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]";
  const selectClass = "w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <Modal open={!!card} onClose={onClose} title="Edit Card" size="sm">
      <div className="space-y-3">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Card title" className={inputClass} autoFocus />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description..."
          rows={3}
          className={`${inputClass} resize-none`}
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className={selectClass}>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Est. Hours</label>
            <input type="number" step="0.5" value={hoursEstimated} onChange={e => setHoursEstimated(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Actual Hours</label>
            <input type="number" step="0.5" value={hoursActual} onChange={e => setHoursActual(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Assignee</label>
          <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Person responsible" className={inputClass} />
        </div>

        <div>
          <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Labels</label>
          <div className="flex flex-wrap gap-1 mb-1">
            {labels.map((l, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-ink,var(--accent))] flex items-center gap-1">
                {l}
                <button onClick={() => setLabels(prev => prev.filter((_, j) => j !== i))} className="hover:text-[#DC2626]">&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLabel(); }}
              placeholder="Add label..."
              className={`${inputClass} flex-1`}
            />
            <Button variant="secondary" size="sm" onClick={addLabel} disabled={!labelInput.trim()}>Add</Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(card.id)}
            className="text-[#DC2626] hover:bg-[#DC2626]/10"
          >
            <Trash2 size={12} /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!title.trim()}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
