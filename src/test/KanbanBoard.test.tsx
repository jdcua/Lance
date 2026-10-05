import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock isTauri to return false so component takes the browser-mode unavailable path
vi.mock('../../utils/tauri', () => ({
  isTauri: () => false,
}));

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
  // Vitest 4 removed the third `it(name, fn, options)` argument — options are
  // the second argument now.
  it('shows loading state initially', { timeout: 5000 }, async () => {
    const KanbanBoard = (await import('../components/features/KanbanBoard')).default;
    render(<KanbanBoard projectId="test-project-id" />);
    // Component should quickly become unavailable in browser mode (no Tauri)
    await waitFor(() => {
      expect(screen.queryByText('Kanban Board')).not.toBeNull();
    }, { timeout: 1000 });
  });
});