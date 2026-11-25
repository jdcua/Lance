import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useStore } from '../store';
import Clients from '../screens/Clients';
import Invoices from '../screens/Invoices';
import Projects from '../screens/Projects';
import TimeScreen from '../screens/Time';
import Assets from '../screens/Assets';
import Contracts from '../screens/Contracts';
import FollowUps from '../screens/FollowUps';
import Pipeline from '../screens/Pipeline';
import Insights from '../screens/Insights';
import AchievementsPage from '../screens/Achievements';

// Pipeline uses dnd-kit; mock it the same way as KanbanBoard.test.tsx so the
// screen renders without a real drag context.
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  DragOverlay: ({ children }: { children: React.ReactNode }) => children,
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({ setNodeRef: vi.fn(), attributes: {}, listeners: {}, transform: null, isDragging: false }),
  closestCorners: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({ setNodeRef: vi.fn(), attributes: {}, listeners: {}, transform: null, transition: null, isDragging: false }),
}));
vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

const cases = [
  { name: 'Clients', Component: Clients, text: 'Clients' },
  { name: 'Invoices', Component: Invoices, text: 'Invoices' },
  { name: 'Projects', Component: Projects, text: 'Projects' },
  { name: 'Time', Component: TimeScreen, text: 'Time tracking' },
  { name: 'Assets', Component: Assets, text: 'Assets' },
  { name: 'Contracts', Component: Contracts, text: 'New Contract' },
  { name: 'FollowUps', Component: FollowUps, text: 'Follow-ups' },
  { name: 'Pipeline', Component: Pipeline, text: 'Pipeline' },
  { name: 'Insights', Component: Insights, text: 'Insights' },
  { name: 'Achievements', Component: AchievementsPage, text: 'Achievements' },
];

describe('screen smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState());
    vi.clearAllMocks();
  });

  it.each(cases)('$name renders without throwing', async ({ Component, text }) => {
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
    expect(await screen.findByText(text)).toBeTruthy();
  });
});