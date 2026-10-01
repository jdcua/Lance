import { describe, it, expect, beforeEach } from 'vitest';
import { importToolDraft } from './importToolDraft';
import { useStore } from '../store';

describe('invoice-generator draft bridge', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ clients: [], invoices: [] });
  });

  it('returns false with no draft and marks nothing', async () => {
    expect(await importToolDraft()).toBe(false);
    expect(localStorage.getItem('lance:tool-inv-imported')).toBeNull();
  });

  it('adopts a draft as client + draft invoice, once', async () => {
    localStorage.setItem(
      'lance-inv-tool',
      JSON.stringify({
        from: 'Jane Studio',
        to: 'Acme Corp',
        num: 'INV-007',
        due: '2026-10-15',
        cur: 'USD',
        tax: 5,
        rows: [['Brand refresh', 1, 4500]],
      }),
    );
    expect(await importToolDraft()).toBe(true);
    const s = useStore.getState();
    expect(s.clients.map((c) => c.name)).toContain('Acme Corp');
    const inv = s.invoices.find((i) => i.invoice_number === 'INV-007');
    expect(inv?.status).toBe('draft');
    expect(inv?.total).toBeCloseTo(4725);
    expect(await importToolDraft()).toBe(false);
    expect(s.invoices.filter((i) => i.invoice_number === 'INV-007')).toHaveLength(1);
  });
});
