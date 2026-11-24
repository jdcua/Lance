import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('metric definition sanitization (store boundary)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ metricDefs: [] } as never);
  });

  it('strips markup from names and units on create', async () => {
    const def = await useStore.getState().createMetricDef({
      client_id: 'c1',
      name: '<img src=x onerror=alert(1)>MRR',
      metric_type: 'currency',
      unit_label: 'USD<script>',
      is_headline: false,
      sort_order: 0,
    } as never);
    expect(def.name).not.toMatch(/<|>/);
    expect(def.name).toContain('MRR');
    expect(String(def.unit_label)).not.toMatch(/<|>/);
    // Persisted copy is clean too.
    const stored = useStore.getState().metricDefs[0];
    expect(stored.name).not.toMatch(/<|>/);
  });

  it('strips markup on update', async () => {
    const def = await useStore.getState().createMetricDef({
      client_id: 'c1',
      name: 'Clean',
      metric_type: 'currency',
      is_headline: false,
      sort_order: 0,
    } as never);
    await useStore.getState().updateMetricDef({ ...def, name: 'Dirty<script>' } as never);
    const stored = useStore.getState().metricDefs.find((d) => d.id === def.id);
    expect(stored?.name).not.toMatch(/<|>/);
  });
});
