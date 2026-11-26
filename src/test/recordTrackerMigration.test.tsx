/**
 * Behavior tests for the six trackers rebuilt on the generic RecordTracker.
 * The UI route that renders them (ArchetypeFeatureTabs) is disabled in the
 * shipped build, so these render each tracker directly and exercise the
 * reader-visible contract: heading, add affordance, and add -> new row.
 *
 * Only the data seam is mocked (store actions for store-backed trackers,
 * getDb() for DB-backed ones); RecordTracker itself is never stubbed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../db', () => ({ getDb: vi.fn() }));

import { getDb } from '../db';
import { useStore } from '../store';
import BuildLog from '../components/features/BuildLog';
import ShootLog from '../components/features/ShootLog';
import DatasetLog from '../components/features/DatasetLog';
import ChainLog from '../components/features/ChainLog';
import ServiceBlueprint from '../components/features/ServiceBlueprint';
import DatasetVersioning from '../components/features/DatasetVersioning';

type Row = Record<string, unknown>;
let seq = 0;

/** Seed the real store with an in-memory slice whose add appends to the list. */
function seedStore<T extends Row>(key: string, loadKey: string, addKey: string, removeKey: string) {
  const add = vi.fn(async (data: Partial<T>) => {
    const row = { ...data, id: `row-${++seq}`, project_id: 'p1' } as unknown as T;
    useStore.setState((s) => {
      const current = (s as unknown as Record<string, T[]>)[key] ?? [];
      return { [key]: [...current, row] } as never;
    });
    return row;
  });
  const load = vi.fn(async () => {});
  const remove = vi.fn(async () => {});
  useStore.setState({
    [key]: [],
    [loadKey]: load,
    [addKey]: add,
    [removeKey]: remove,
  } as never);
  return { add, load, remove };
}

describe('store-backed trackers migrated to RecordTracker', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState());
  });

  it('BuildLog logs a build through addBuild and shows the new row', async () => {
    const { add } = seedStore<Row>('builds', 'loadBuilds', 'addBuild', 'removeBuild');
    render(<BuildLog projectId="p1" />);
    expect(await screen.findByText('Builds')).toBeTruthy();
    fireEvent.click(screen.getByText('Log Builds'));
    fireEvent.change(screen.getByPlaceholderText('e.g. v1.2.0'), {
      target: { value: 'v9.9.9' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('v9.9.9')).toBeTruthy();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ version: 'v9.9.9' }));
  });

  it('ShootLog logs a shoot through addShoot and shows the new row', async () => {
    const { add } = seedStore<Row>('shoots', 'loadShoots', 'addShoot', 'removeShoot');
    render(<ShootLog projectId="p1" />);
    expect(await screen.findByText('Shoots')).toBeTruthy();
    fireEvent.click(screen.getByText('Log Shoot'));
    fireEvent.change(screen.getByPlaceholderText('Location'), {
      target: { value: 'Studio B' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Studio B')).toBeTruthy();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ location: 'Studio B' }));
  });

  it('DatasetLog logs a dataset through addDataset and shows the new row', async () => {
    const { add } = seedStore<Row>('datasets', 'loadDatasets', 'addDataset', 'removeDataset');
    render(<DatasetLog projectId="p1" />);
    expect(await screen.findByText('Datasets')).toBeTruthy();
    fireEvent.click(screen.getByText('Add Dataset'));
    fireEvent.change(screen.getByPlaceholderText('e.g. CSV, JSON, Parquet'), {
      target: { value: 'CSV' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('CSV')).toBeTruthy();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ format_type: 'CSV' }));
  });
});

const selectFn = vi.fn();
const execFn = vi.fn();

describe('DB-backed trackers migrated to RecordTracker', () => {
  beforeEach(() => {
    selectFn.mockReset();
    execFn.mockReset();
    selectFn.mockResolvedValue([]);
    execFn.mockResolvedValue(undefined);
    vi.mocked(getDb).mockResolvedValue({ select: selectFn, execute: execFn } as never);
  });

  it('ChainLog offers Log Event, inserts, and shows the new row', async () => {
    render(<ChainLog projectId="p1" />);
    expect(await screen.findByText(/Chain Log/)).toBeTruthy();
    fireEvent.click(screen.getByText('Log Event'));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Ethereum' } });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Ethereum')).toBeTruthy();
    expect(execFn).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO chain_logs'),
      expect.arrayContaining(['Ethereum']),
    );
  });

  it('ServiceBlueprint offers Add Component, inserts, and shows the new row', async () => {
    render(<ServiceBlueprint projectId="p1" />);
    expect(await screen.findByText(/Service Blueprint/)).toBeTruthy();
    fireEvent.click(screen.getByText('Add Component'));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Check-in' } });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Check-in')).toBeTruthy();
    expect(execFn).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO service_blueprints'),
      expect.arrayContaining(['Check-in']),
    );
  });

  it('DatasetVersioning offers New Version, inserts, and shows the new row', async () => {
    render(<DatasetVersioning projectId="p1" />);
    expect(await screen.findByText(/Dataset Versions/)).toBeTruthy();
    fireEvent.click(screen.getByText('New Version'));
    fireEvent.change(screen.getByPlaceholderText('e.g. v1.2'), { target: { value: 'v2.0' } });
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('v2.0')).toBeTruthy();
    expect(execFn).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO dataset_versions'),
      expect.arrayContaining(['v2.0']),
    );
  });
});
