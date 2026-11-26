import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

const inv = (id: string, lineItems: unknown) => ({
  id,
  client_id: 'c1',
  invoice_number: `INV-${id}`,
  status: 'sent',
  total: 100,
  currency: 'CAD',
  line_items: lineItems,
  created_at: new Date().toISOString(),
});

beforeEach(() => {
  localStorage.clear();
  useStore.setState({ invoices: [], exportTemplates: [], contractTemplates: [] } as never);
});

describe('corrupt-data hardening (wave 21)', () => {
  it('loadInvoices survives corrupt and wrong-shape line_items', async () => {
    localStorage.setItem(
      'lance:store:invoices',
      JSON.stringify([
        inv('good', JSON.stringify([{ description: 'Work', quantity: 1, rate: 100, amount: 100 }])),
        inv('corrupt', '{oops-not-json'),
        inv('wrong-shape', JSON.stringify({ description: 'not a list' })),
      ]),
    );
    await useStore.getState().loadInvoices();
    const rows = useStore.getState().invoices;
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.id === 'good')!.line_items).toHaveLength(1);
    expect(rows.find((r) => r.id === 'corrupt')!.line_items).toEqual([]);
    expect(rows.find((r) => r.id === 'wrong-shape')!.line_items).toEqual([]);
    expect(useStore.getState().errors.invoices).toBeFalsy();
  });

  it('loadExportTemplates degrades one bad row instead of losing all', async () => {
    localStorage.setItem(
      'lance:store:export_templates',
      JSON.stringify([
        {
          id: 't1',
          name: 'Good',
          type: 'invoice_pdf',
          sections: JSON.stringify(['header', 'lines']),
          created_at: '',
        },
        { id: 't2', name: 'Bad', type: 'invoice_pdf', sections: '{broken', created_at: '' },
      ]),
    );
    await useStore.getState().loadExportTemplates();
    const rows = useStore.getState().exportTemplates;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === 't1')!.sections).toEqual(['header', 'lines']);
    expect(rows.find((r) => r.id === 't2')!.sections).toEqual([]);
  });

  it('loadContractTemplates degrades one bad row instead of losing all', async () => {
    localStorage.setItem(
      'lance:store:contract_templates',
      JSON.stringify([
        {
          id: 'c1',
          name: 'Good',
          body: 'x',
          variables: JSON.stringify(['client_name']),
          created_at: '',
        },
        { id: 'c2', name: 'Bad', body: 'x', variables: '[unclosed', created_at: '' },
      ]),
    );
    await useStore.getState().loadContractTemplates();
    const rows = useStore.getState().contractTemplates;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === 'c1')!.variables).toEqual(['client_name']);
    expect(rows.find((r) => r.id === 'c2')!.variables).toEqual([]);
  });
});
