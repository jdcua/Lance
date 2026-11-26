import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KanbanBoard from '../components/features/KanbanBoard';

// The board reads isTauri() and tauriInvoke() through the tauri seam. Mock the
// seam (not DOM events) so both the browser fallback and desktop flows run.
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock('../utils/tauri', () => ({
  isTauri: () => mocks.isTauri(),
  tauriInvoke: (cmd: string, args?: Record<string, unknown>) => mocks.invoke(cmd, args),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  DragOverlay: ({ children }: { children: React.ReactNode }) => children,
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  closestCorners: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    setNodeRef: vi.fn(),
    attributes: {},
    listeners: {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));
vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

const board = { id: 'board-1', project_id: 'p1', name: 'Main Board', created_at: '2026-01-01' };
const columns = [
  {
    id: 'col-1',
    board_id: 'board-1',
    name: 'Backlog',
    color: '#6B7280',
    sort_order: 0,
    created_at: '',
  },
  {
    id: 'col-2',
    board_id: 'board-1',
    name: 'Done',
    color: '#10B981',
    sort_order: 1,
    created_at: '',
  },
];
const cards = {
  'col-1': [
    {
      id: 'card-1',
      column_id: 'col-1',
      project_id: 'p1',
      title: 'Write proposal',
      priority: 'medium',
      labels: '[]',
      sort_order: 0,
      created_at: '',
    },
  ],
  'col-2': [],
};

function desktopMode() {
  mocks.isTauri.mockReturnValue(true);
  mocks.invoke.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'get_kanban_board') return Promise.resolve(board);
    if (cmd === 'get_kanban_columns') return Promise.resolve(columns);
    if (cmd === 'get_kanban_cards') {
      const byColumn = cards as Record<string, unknown[]>;
      return Promise.resolve(byColumn[(args?.columnId as string) || ''] || []);
    }
    if (cmd === 'create_kanban_column') {
      const payload = (args?.payload || {}) as { name: string };
      return Promise.resolve({ ...columns[0], id: 'col-3', name: payload.name });
    }
    return Promise.resolve({});
  });
}

const renderBoard = () => render(<KanbanBoard projectId="p1" />);

describe('KanbanBoard', () => {
  beforeEach(() => {
    mocks.isTauri.mockReturnValue(false);
    mocks.invoke.mockReset();
    mocks.invoke.mockResolvedValue({});
  });

  it('explains the desktop-only fallback in browser preview', async () => {
    renderBoard();
    expect(await screen.findByText('Kanban Board')).toBeTruthy();
    expect(screen.getByText(/available in the desktop app/)).toBeTruthy();
  });

  it('renders backend columns and cards with a live total', async () => {
    desktopMode();
    renderBoard();
    expect(await screen.findByText('Kanban Board (1)')).toBeTruthy();
    expect(screen.getByText('Backlog')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Write proposal')).toBeTruthy();
  });

  it('shows a zero count for an empty column', async () => {
    desktopMode();
    renderBoard();
    await screen.findByText('Kanban Board (1)');
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getAllByText('Add Card').length).toBe(2);
  });

  it('opens the edit dialog when a card is clicked', async () => {
    desktopMode();
    renderBoard();
    fireEvent.click(await screen.findByText('Write proposal'));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue('Write proposal')).toBeTruthy();
  });

  it('creates a named column through the command seam', async () => {
    desktopMode();
    renderBoard();
    fireEvent.click(await screen.findByText('Add Column'));
    fireEvent.change(await screen.findByPlaceholderText('Column name...'), {
      target: { value: 'Blocked' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(await screen.findByText('Blocked')).toBeTruthy();
    expect(mocks.invoke).toHaveBeenCalledWith(
      'create_kanban_column',
      expect.objectContaining({ payload: expect.objectContaining({ name: 'Blocked' }) }),
    );
  });
});
