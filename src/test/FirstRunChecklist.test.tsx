import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../screens/Dashboard';
import { useStore } from '../store';
import { commands } from '../lib/commands';
import type { Client, Project, Invoice, Proposal, TimeEntry } from '../types';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'get_user_profile') return Promise.resolve(null);
    return Promise.resolve([]);
  }),
}));

vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
  }),
}));

function emptyStore() {
  useStore.setState({
    clients: [],
    projects: [],
    invoices: [],
    proposals: [],
    timeEntries: [],
    expenses: [],
    pendingFollowUps: [],
    headlineMetrics: [],
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('first-run checklist', () => {
  beforeEach(() => {
    localStorage.clear();
    emptyStore();
    vi.clearAllMocks();
  });

  it('shows all five steps for a brand-new user', async () => {
    renderDashboard();
    expect(await screen.findByText("Let's get you set up")).toBeTruthy();
    for (const label of [
      'Add your first client',
      'Create a project',
      'Log some time',
      'Send a proposal',
      'Send an invoice',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('stays visible after the first client (the old card vanished here)', async () => {
    renderDashboard();
    expect(await screen.findByText("Let's get you set up")).toBeTruthy();
    // Simulate the client arriving after load (loaders resolve empty first).
    const client: Client = { id: 'c1', name: 'Test Client', created_at: '2026-01-01' };
    useStore.setState({ clients: [client] });
    // Card persists: remaining steps still actionable.
    await waitFor(() => expect(screen.getByText('Create a project')).toBeTruthy());
    // Done step is disabled.
    expect(screen.getByText('Add your first client').closest('button')?.disabled).toBe(true);
  });

  it('step click opens the real create form via command', async () => {
    const seen: string[] = [];
    const handler = (detail: unknown) => seen.push('lance:add-client');
    commands.on('lance:add-client', handler as any);
    renderDashboard();
    fireEvent.click(await screen.findByText('Add your first client'));
    await waitFor(() => expect(seen).toContain('lance:add-client'), { timeout: 2000 });
    commands.off('lance:add-client', handler as any);
  });

  it('dismiss persists and hides the card', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByLabelText('Dismiss setup checklist'));
    expect(localStorage.getItem('lance:checklist-dismissed')).toBe('true');
    await waitFor(() =>
      expect(screen.queryByText("Let's get you set up")).toBeNull(),
    );
  });

  it('hides itself once everything is done', async () => {
    const client: Client = { id: 'c1', name: 'C', created_at: '2026-01-01' };
    const project: Project = { id: 'p1', client_id: 'c1', title: 'P', status: 'active', created_at: '2026-01-01' };
    const invoice: Invoice = {
      id: 'i1', client_id: 'c1', invoice_number: 'INV-1', status: 'paid',
      line_items: [], subtotal: 10, total: 10, created_at: '2026-01-01',
    };
    const proposal: Proposal = {
      id: 'pr1', client_id: 'c1', title: 'P', status: 'accepted',
      rate_type: 'flat', created_at: '2026-01-01',
    };
    const entry: TimeEntry = {
      id: 't1', project_id: 'p1', client_id: 'c1', start_time: '2026-01-01',
      duration_minutes: 60, billable: true, invoiced: false,
    };
    useStore.setState({
      clients: [client],
      projects: [project],
      invoices: [invoice],
      proposals: [proposal],
      timeEntries: [entry],
    });
    renderDashboard();
    await waitFor(() =>
      expect(screen.queryByText("Let's get you set up")).toBeNull(),
    );
  });
});
