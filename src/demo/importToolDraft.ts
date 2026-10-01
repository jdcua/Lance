/**
 * Free-tool bridge: the invoice generator (landing/tools) autosaves drafts
 * to localStorage under `lance-inv-tool` — same origin as the trial, so a
 * first trial visit can adopt the draft as a real client + draft invoice.
 * Runs once (marker flag), best-effort, no network.
 */

const DRAFT_KEY = 'lance-inv-tool';
const IMPORTED_KEY = 'lance:tool-inv-imported';

interface ToolDraft {
  from?: string;
  to?: string;
  num?: string;
  due?: string;
  cur?: string;
  tax?: number | string;
  rows?: string[][];
}

function readDraft(): ToolDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ToolDraft;
    if (!parsed || !Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function alreadyImported(): boolean {
  try {
    return localStorage.getItem(IMPORTED_KEY) === 'true';
  } catch {
    return true;
  }
}

function markImported(): void {
  try {
    localStorage.setItem(IMPORTED_KEY, 'true');
  } catch {
    /* ignore */
  }
}

/** Adopt the invoice-generator draft. Returns true when anything was made. */
export async function importToolDraft(): Promise<boolean> {
  if (alreadyImported()) return false;
  const draft = readDraft();
  if (!draft) return false;
  markImported();
  try {
    const { useStore } = await import('../store');
    const store = useStore.getState();
    const clientName = (draft.to || '').trim() || 'Invoice client';
    const client = await store.addClient({
      name: clientName,
      email: undefined,
      phone: undefined,
      company: clientName,
      notes: 'Imported from the free invoice generator.',
    });
    const taxRate = Math.max(0, Number(draft.tax) || 0);
    const rows = draft.rows || [];
    const items = rows
      .map((r) => {
        const qty = Math.max(0, Number(r[1]) || 0);
        const rate = Math.max(0, Number(r[2]) || 0);
        if (!r[0] && qty === 0 && rate === 0) return null;
        return {
          id: crypto.randomUUID(),
          description: r[0] || 'Line item',
          quantity: qty,
          unit_price: rate,
          total: qty * rate,
        };
      })
      .filter((i) => i !== null);
    if (items.length === 0) return true;
    const subtotal = items.reduce((s, i) => s + (i?.total || 0), 0);
    await store.addInvoice({
      client_id: client.id,
      project_id: undefined,
      invoice_number: (draft.num || '').trim() || 'INV-DRAFT',
      status: 'draft',
      line_items: items,
      subtotal,
      tax_rate: taxRate,
      total: subtotal * (1 + taxRate / 100),
      due_date: (draft.due || undefined) as string | undefined,
      notes: 'Imported from the free invoice generator.',
    });
    return true;
  } catch {
    return false;
  }
}
