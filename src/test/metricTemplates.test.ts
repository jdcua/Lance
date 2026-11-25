import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

beforeEach(() => {
  localStorage.clear();
  useStore.setState({ metricTemplates: [], metricDefs: [] } as never);
});

const defs = [
  { name: 'NPS', metric_type: 'number', unit_label: '', is_headline: true, sort_order: 0 },
];

describe('metric templates', () => {
  it('replaces same-name templates instead of duplicating', async () => {
    const s = useStore.getState();
    await s.saveMetricTemplate('Starter', defs as never);
    await s.saveMetricTemplate('starter', defs as never);
    const names = useStore.getState().metricTemplates.map((t) => t.name);
    expect(names.filter((n) => n.toLowerCase() === 'starter')).toHaveLength(1);
  });

  it('apply is idempotent and validates rows', async () => {
    const s = useStore.getState();
    await s.saveMetricTemplate('Starter', defs as never);
    await s.applyMetricTemplate('Starter', 'c1');
    await s.applyMetricTemplate('Starter', 'c1');
    const mine = useStore.getState().metricDefs.filter((d) => d.client_id === 'c1');
    expect(mine).toHaveLength(1);
    expect(mine[0].name).toBe('NPS');
  });

  it('throws a clear error on corrupt template data', async () => {
    localStorage.setItem(
      'lance:store:metric_templates',
      JSON.stringify([{ id: 't-bad', name: 'Broken', definitions_json: '{oops' }]),
    );
    await expect(useStore.getState().applyMetricTemplate('Broken', 'c1')).rejects.toThrow(
      /corrupted/,
    );
  });

  it('ignores unknown apply targets silently', async () => {
    await expect(useStore.getState().applyMetricTemplate('Nope', 'c1')).resolves.toBeUndefined();
  });
});
