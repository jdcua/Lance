import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, AlertCircle, GripVertical } from 'lucide-react';
import type { KanbanCard as KanbanCardType } from '../../types';
import { parseDateString } from '../../utils/format';

const priorityClasses: Record<string, string> = {
  low: 'border-l-[#16A34A]',
  medium: 'border-l-[#D97706]',
  high: 'border-l-[#DC2626]',
};

const labelColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#EF4444', '#14B8A6'];

type Props = {
  card: KanbanCardType;
  onClick: (card: KanbanCardType) => void;
};

export default function KanbanCard({ card, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const labels: string[] = (() => {
    try { return JSON.parse(card.labels); } catch { return []; }
  })();

  const isOverdue = (() => {
    if (!card.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parseDateString(card.due_date).getTime() < today.getTime();
  })();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={`group glass border border-[var(--border-color)] rounded-sm cursor-pointer hover:border-[var(--accent)] transition-colors border-l-2 ${priorityClasses[card.priority] || 'border-l-[var(--border-color)]'} ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
    >
      <div className="p-2 space-y-1.5">
        <div className="flex items-start gap-1">
          <GripVertical size={11} className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-[11px] text-[var(--text-primary)] leading-tight flex-1 min-w-0">{card.title}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium ${
            card.priority === 'high' ? 'bg-[#DC2626]/15 text-[#DC2626]' :
            card.priority === 'medium' ? 'bg-[#D97706]/15 text-[#D97706]' :
            'bg-[#16A34A]/15 text-[#16A34A]'
          }`}>
            {card.priority}
          </span>
          {labels.map((label, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: labelColors[i % labelColors.length] }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
          {card.hours_estimated != null && (
            <span className="flex items-center gap-0.5"><Clock size={9} />{card.hours_estimated}h</span>
          )}
          {card.hours_actual != null && (
            <span className="flex items-center gap-0.5"><AlertCircle size={9} />{card.hours_actual}h</span>
          )}
          {card.due_date && (
            <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-[#DC2626] font-medium' : ''}`}>
              {parseDateString(card.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {card.assignee && (
            <span className="flex items-center gap-0.5 ml-auto truncate max-w-[60px]" title={card.assignee}>
              {card.assignee}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
