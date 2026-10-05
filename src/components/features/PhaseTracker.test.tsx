import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../db', () => ({
  getDb: vi.fn(),
}));

import { getDb } from '../../db';
import PhaseTracker from './PhaseTracker';

const selectFn = vi.fn();
const execFn = vi.fn();

describe('PhaseTracker without project context', () => {
  beforeEach(() => {
    selectFn.mockReset();
    execFn.mockReset();
    selectFn.mockResolvedValue([]);
    execFn.mockResolvedValue(undefined);
    vi.mocked(getDb).mockResolvedValue({ select: selectFn, execute: execFn } as never);
  });

  it('renders a prompt and never touches the DB (no NULL orphan rows)', async () => {
    render(<PhaseTracker projectId={undefined as unknown as string} />);
    expect(await screen.findByText('Open a project to track its phases here.')).not.toBeNull();
    // Let the best-effort orphan sweep settle, then prove nothing was seeded.
    await waitFor(() => expect(execFn).toHaveBeenCalled());
    const inserts = execFn.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO project_phases'),
    );
    expect(inserts).toHaveLength(0);
  });

  it('seeds defaults for a real project (guard does not break the normal path)', async () => {
    render(<PhaseTracker projectId="p1" />);
    await waitFor(() => {
      const inserts = execFn.mock.calls.filter(([sql]) =>
        String(sql).includes('INSERT INTO project_phases'),
      );
      expect(inserts.length).toBeGreaterThan(0);
    });
    expect(await screen.findByText('Concept')).not.toBeNull();
  });
});
