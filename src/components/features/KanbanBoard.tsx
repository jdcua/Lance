import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { getDb } from '../../db';
import KanbanColumnComponent from './KanbanColumn';
import KanbanCardComponent from './KanbanCard';
import KanbanCardModal from './KanbanCardModal';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { KanbanBoard, KanbanColumn, KanbanCard } from '../../types';

const COLUMN_COLORS = ['#6B7280', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export default function KanbanBoardComponent({ projectId }: { projectId: string }) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<Record<string, KanbanCard[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);

  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnSettings, setColumnSettings] = useState({ name: '', color: '', wipLimit: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadBoard = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      let boardData = await invoke<KanbanBoard | null>('get_kanban_board', { projectId });
      if (!boardData) {
        boardData = await invoke<KanbanBoard>('create_kanban_board', { projectId });
      }
      setBoard(boardData);

      const cols = await invoke<KanbanColumn[]>('get_kanban_columns', { boardId: boardData.id });
      setColumns(cols);

      const cardsMap: Record<string, KanbanCard[]> = {};
      await Promise.all(cols.map(async (col) => {
        const colCards = await invoke<KanbanCard[]>('get_kanban_cards', { columnId: col.id });
        cardsMap[col.id] = colCards;
      }));
      setCards(cardsMap);
    } catch (e) {
      console.error('[KanbanBoard] load failed:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'card') {
      setActiveCard(data.card as KanbanCard);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !active) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || activeData.type !== 'card') return;

    const card = activeData.card as KanbanCard;
    const fromColumnId = card.column_id;

    let toColumnId: string;
    if (overData?.type === 'column') {
      toColumnId = overData.column.id;
    } else if (overData?.type === 'card') {
      toColumnId = overData.card.column_id;
    } else {
      return;
    }

    if (fromColumnId === toColumnId) {
      const colCards = cards[fromColumnId] || [];
      const oldIndex = colCards.findIndex(c => c.id === card.id);
      const overCard = overData?.type === 'card' ? overData.card as KanbanCard : null;
      const newIndex = overCard ? colCards.findIndex(c => c.id === overCard.id) : colCards.length - 1;
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...colCards];
      reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, card);
      setCards(prev => ({ ...prev, [fromColumnId]: reordered }));

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('reorder_kanban_cards', {
          payload: { column_id: fromColumnId, card_ids: reordered.map(c => c.id) },
        });
      } catch (e) {
        console.error('[KanbanBoard] reorder failed:', e);
      }
    } else {
      const fromCards = (cards[fromColumnId] || []).filter(c => c.id !== card.id);
      const toCards = [...(cards[toColumnId] || []), card];
      setCards(prev => ({
        ...prev,
        [fromColumnId]: fromCards,
        [toColumnId]: toCards,
      }));

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('move_kanban_card', {
          payload: { card_id: card.id, from_column_id: fromColumnId, to_column_id: toColumnId },
        });
      } catch (e) {
        console.error('[KanbanBoard] move failed:', e);
      }
    }
  }, [cards]);

  const handleAddCard = useCallback(async (columnId: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const db = await getDb();
      const result = await db.select<{ title: string }[]>('SELECT title FROM projects WHERE id = ?', [projectId]);
      const defaultTitle = result[0]?.title ? `Task for ${result[0].title}` : 'New task';
      const newCard = await invoke<KanbanCard>('create_kanban_card', {
        payload: { column_id: columnId, project_id: projectId, title: defaultTitle },
      });
      setCards(prev => ({ ...prev, [columnId]: [...(prev[columnId] || []), newCard] }));
    } catch (e) {
      console.error('[KanbanBoard] add card failed:', e);
    }
  }, [projectId]);

  const handleCardSave = useCallback(async (card: KanbanCard, updates: Partial<KanbanCard>) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_kanban_card', { payload: { id: card.id, ...updates } });
      const colCards = cards[card.column_id] || [];
      setCards(prev => ({
        ...prev,
        [card.column_id]: colCards.map(c => c.id === card.id ? { ...c, ...updates } : c),
      }));
    } catch (e) {
      console.error('[KanbanBoard] save card failed:', e);
    }
  }, [cards]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_kanban_card', { id: cardId });
      setCards(prev => {
        const updated = { ...prev };
        for (const colId of Object.keys(updated)) {
          updated[colId] = updated[colId].filter(c => c.id !== cardId);
        }
        return updated;
      });
      setSelectedCard(null);
    } catch (e) {
      console.error('[KanbanBoard] delete card failed:', e);
    }
  }, []);

  const handleAddColumn = useCallback(async () => {
    if (!newColumnName.trim() || !board) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const color = COLUMN_COLORS[columns.length % COLUMN_COLORS.length];
      const col = await invoke<KanbanColumn>('create_kanban_column', {
        payload: { board_id: board.id, name: newColumnName.trim(), color },
      });
      setColumns(prev => [...prev, col]);
      setCards(prev => ({ ...prev, [col.id]: [] }));
      setNewColumnName('');
      setShowAddColumn(false);
    } catch (e) {
      console.error('[KanbanBoard] add column failed:', e);
    }
  }, [board, columns, newColumnName]);

  const handleUpdateColumn = useCallback(async () => {
    if (!editingColumn) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_kanban_column', {
        payload: {
          id: editingColumn.id,
          name: columnSettings.name || null,
          color: columnSettings.color || null,
          wip_limit: columnSettings.wipLimit ? parseInt(columnSettings.wipLimit) : null,
        },
      });
      setColumns(prev => prev.map(c =>
        c.id === editingColumn.id
          ? { ...c, name: columnSettings.name || c.name, color: columnSettings.color || c.color, wip_limit: columnSettings.wipLimit ? parseInt(columnSettings.wipLimit) : c.wip_limit }
          : c
      ));
      setEditingColumn(null);
    } catch (e) {
      console.error('[KanbanBoard] update column failed:', e);
    }
  }, [editingColumn, columnSettings]);

  const handleMoveColumn = useCallback(async (columnId: string, direction: 'left' | 'right') => {
    if (!board) return;
    const idx = columns.findIndex(c => c.id === columnId);
    if (idx === -1) return;
    const swapWith = direction === 'left' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= columns.length) return;
    const reordered = [...columns];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
    reordered.forEach((c, i) => { c.sort_order = i; });
    setColumns(reordered);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('reorder_kanban_columns', {
        payload: { board_id: board.id, column_ids: reordered.map(c => c.id) },
      });
    } catch (e) {
      console.error('[KanbanBoard] reorder columns failed:', e);
    }
  }, [columns, board]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_kanban_column', { id: columnId });
      setColumns(prev => prev.filter(c => c.id !== columnId));
      setCards(prev => {
        const updated = { ...prev };
        delete updated[columnId];
        return updated;
      });
    } catch (e) {
      console.error('[KanbanBoard] delete column failed:', e);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Kanban Board</h4>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-[260px] h-40 bg-[var(--bg-secondary)] rounded-[8px] animate-pulse flex-shrink-0" />)}
        </div>
      </div>
    );
  }

  const totalCards = Object.values(cards).reduce((sum, col) => sum + col.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Kanban Board ({totalCards})</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowAddColumn(true)}>
          <Plus size={12} /> Add Column
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2.5 overflow-x-auto pb-2 min-h-[200px]">
          {columns.map(col => (
            <div key={col.id} className="group">
              <KanbanColumnComponent
                column={col}
                cards={cards[col.id] || []}
                wipLimit={col.wip_limit}
                onAddCard={handleAddCard}
                onCardClick={setSelectedCard}
                onDeleteColumn={handleDeleteColumn}
                onEditColumn={(col) => {
                  setEditingColumn(col);
                  setColumnSettings({ name: col.name, color: col.color || '', wipLimit: col.wip_limit != null ? String(col.wip_limit) : '' });
                }}
              />
            </div>
          ))}

          {showAddColumn && (
            <div className="w-[260px] min-w-[260px] p-3 bg-[var(--bg-secondary)] rounded-[10px] h-fit space-y-2">
              <input
                type="text"
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                className="w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setShowAddColumn(false); }}
              />
              <div className="flex justify-end gap-1">
                <Button variant="secondary" size="sm" onClick={() => setShowAddColumn(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim()}>Add</Button>
              </div>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[250px] opacity-90">
              <KanbanCardComponent card={activeCard} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <KanbanCardModal
        card={selectedCard}
        columns={columns}
        onSave={handleCardSave}
        onDelete={handleDeleteCard}
        onClose={() => setSelectedCard(null)}
      />

      {editingColumn && (
        <Modal open={!!editingColumn} onClose={() => setEditingColumn(null)} title="Column Settings" size="sm">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Name</label>
              <input
                type="text"
                value={columnSettings.name}
                onChange={e => setColumnSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">Color</label>
              <div className="flex gap-1.5">
                {COLUMN_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setColumnSettings(prev => ({ ...prev, color }))}
                    className={`w-5 h-5 rounded-full transition-transform ${columnSettings.color === color ? 'ring-2 ring-[var(--accent)] scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">WIP Limit</label>
              <input
                type="number"
                min="0"
                value={columnSettings.wipLimit}
                onChange={e => setColumnSettings(prev => ({ ...prev, wipLimit: e.target.value }))}
                placeholder="No limit"
                className="w-full px-2 py-1.5 text-xs border border-[var(--border-color)] rounded-[6px] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { handleMoveColumn(editingColumn.id, 'left'); setEditingColumn(null); }} disabled={editingColumn.sort_order === 0}>
                  ← Move Left
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { handleMoveColumn(editingColumn.id, 'right'); setEditingColumn(null); }} disabled={editingColumn.sort_order === columns.length - 1}>
                  Move Right →
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingColumn(null)}>Cancel</Button>
                <Button size="sm" onClick={handleUpdateColumn}>Save</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
