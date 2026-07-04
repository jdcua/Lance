import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([{ title: 'Test Project' }]),
    execute: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@dnd-kit/core', () => {
  const actual = vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => children,
    DragOverlay: ({ children }: { children: React.ReactNode }) => children,
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
    closestCorners: vi.fn(),
    PointerSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: vi.fn(() => []),
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    setNodeRef: vi.fn(),
    attributes: {},
    listeners: {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

describe('KanbanBoard', () => {
  it('shows loading state initially', async () => {
    const KanbanBoard = (await import('../components/features/KanbanBoard')).default;
    render(<KanbanBoard projectId="test-project-id" />);
    expect(screen.getByText('Kanban Board')).toBeInTheDocument();
  });
});
