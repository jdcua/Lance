import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Packer } from 'docx';
import type { Client, Contract, Invoice, Proposal, UserProfile } from '../types';

const saveFile = vi.hoisted(() => vi.fn());
vi.mock('../export/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../export/common')>();
  return { ...actual, saveFile };
});
import { exportProposalDOCX, exportInvoiceDOCX, exportContractDOCX } from '../export/docx';

const profile = { name: 'Jane', email: 'jane@example.com', currency: 'USD' } as UserProfile;
const proposal = { title: 'Rebrand', body: '<p>Hi</p>' } as Proposal;
const invoice = {
  invoice_number: 'INV-001',
  status: 'paid',
  subtotal: 100,
  total: 100,
  line_items: [{ id: 'l1', description: 'Work', quantity: 1, unit_price: 100, total: 100 }],
  created_at: '2026-11-01T12:00:00Z',
} as Invoice;
const contract = { title: 'My/Contract', body: '<p>Sign</p>' } as Contract;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0));
  saveFile.mockReset();
  // Stub only the final I/O boundary; the DOCX document itself is built for real.
  vi.spyOn(Packer, 'toBlob').mockResolvedValue(new Blob(['docx']));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DOCX export filenames', () => {
  it('uses a sanitized client name and the local date for proposals', async () => {
    await exportProposalDOCX(proposal, { name: 'Acme/Corp' } as Client, profile);
    expect(saveFile).toHaveBeenCalledWith(
      expect.any(Blob),
      'Lance_Proposal_Acme_Corp_2026-11-25.docx',
    );
  });

  it('uses a sanitized invoice number and client name for invoices', async () => {
    await exportInvoiceDOCX(invoice, { name: 'Acme' } as Client, profile);
    expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'Lance_Invoice_INV-001_Acme.docx');
  });

  it('uses a sanitized contract title for contracts', async () => {
    await exportContractDOCX(contract, { name: 'Acme' } as Client, profile);
    expect(saveFile).toHaveBeenCalledWith(expect.any(Blob), 'Lance_Contract_My_Contract_Acme.docx');
  });
});
