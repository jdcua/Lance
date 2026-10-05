import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import KanbanCardComponent from './KanbanCard';
import Button from '../ui/Button';
import type { KanbanColumn, KanbanCard } from '../../types';

type Props = {
  column: KanbanColumn;
  cards: KanbanCard[];
  wipLimit?: number | null;
  onAddCard: (columnId: string) => void;
  onCardClick: (card: KanbanCard) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditColumn: (column: KanbanColumn) => void;
};

export default function KanbanColumnComponent({
  column,
  cards,
  wipLimit,
  onAddCard,
  onCardClick,
  onDeleteColumn,
  onEditColumn,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const exceedsWip = wipLimit != null && cards.length >= wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[260px] min-w-[260px] rounded-[10px] transition-colors ${
        isOver ? 'bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]/30' : 'bg-[var(--bg-secondary)]/50'
      }`}
    >
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-[var(--border-color)]/50">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color || '#6B7280' }}
          />
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{column.name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            exceedsWip ? 'bg-[#DC2626]/15 text-[#DC2626]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
          }`}>
            {cards.length}{wipLimit != null ? `/${wipLimit}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            aria-label="Do action on"
            onClick={() => onEditColumn(column)} className="p-1 rounded-[4px] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Settings2 size={11} />
          </button>
          <button
            aria-label="Delete kanban column"
            onClick={() => onDeleteColumn(column.id)} className="p-1 rounded-[4px] hover:bg-[#DC2626]/10 text-[var(--text-tertiary)] hover:text-[#DC2626] transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-1.5 space-y-1.5 min-h-[80px] overflow-y-auto">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCardComponent key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {showQuickAdd ? (
          <QuickAddForm columnId={column.id} onAdd={onAddCard} onClose={() => setShowQuickAdd(false)} />
        ) : (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-full py-1.5 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[6px] transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
          >
            <Plus size={11} /> Add Card
          </button>
        )}
      </div>
    </div>
  );
}

function QuickAddForm({ columnId, onAdd, onClose }: { columnId: string; onAdd: (columnId: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Card title..."
        className="w-full px-2 py-1.5 text-[11px] border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && title.trim()) {
            onAdd(columnId);
            setTitle('');
            onClose();
          }
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="flex justify-end gap-1">
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { onAdd(columnId); setTitle(''); onClose(); }} disabled={!title.trim()}>Add</Button>
      </div>
    </div>
  );
}
