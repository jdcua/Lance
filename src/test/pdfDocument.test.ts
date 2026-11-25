import { describe, it, expect } from 'vitest';
import { isValidElement, type ReactNode } from 'react';
import { ProposalPDF, InvoicePDF, ContractPDF } from '../export/pdf';
import type { Client, Contract, Invoice, Proposal, UserProfile } from '../types';

// These PDF components are pure prop -> element functions. Reading the text
// they emit exercises what a reader sees without rendering a PDF blob.
function collectText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (isValidElement(node)) {
    return collectText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function renderedText(node: ReactNode): string {
  return collectText(node).replace(/\s+/g, ' ').trim();
}

const profile = {
  name: 'Jane',
  email: 'jane@example.com',
  currency: 'USD',
} as UserProfile;
const client = { name: 'Acme', company: 'Studio' } as Client;
const proposal = {
  title: 'Rebrand',
  body: '<p>Hello <strong>world</strong></p>',
  sent_at: '2026-11-25T12:00:00Z',
} as Proposal;
const invoice = {
  id: 'inv-1',
  client_id: 'client-1',
  invoice_number: 'INV-001',
  status: 'paid',
  subtotal: 1000,
  total: 1000,
  line_items: [],
  created_at: '2026-11-01T12:00:00Z',
  due_date: undefined,
} as Invoice;
const contract = {
  title: 'Terms',
  body: '<p>Sign here</p>',
  created_at: '2026-11-01T12:00:00Z',
} as Contract;

describe('PDF document content', () => {
  it('shows the profile name and falls back when it is empty', () => {
    expect(renderedText(ProposalPDF({ proposal, client, profile }))).toContain('Jane');
    const anonymous = renderedText(
      ProposalPDF({ proposal, client, profile: { ...profile, name: '' } }),
    );
    expect(anonymous).toContain('Freelancer');
  });

  it('renders the investment in the profile currency with its rate suffix', () => {
    const hourly = renderedText(
      ProposalPDF({
        proposal: { ...proposal, rate: 1000, rate_type: 'hourly' } as Proposal,
        client,
        profile,
      }),
    );
    expect(hourly).toContain('$1,000.00 per hour');

    const flat = renderedText(
      ProposalPDF({
        proposal: { ...proposal, rate: 500, rate_type: 'flat' } as Proposal,
        client,
        profile,
      }),
    );
    expect(flat).toContain('$500.00 flat');
  });

  it('capitalizes invoice status and marks a missing due date with an em dash', () => {
    const text = renderedText(InvoicePDF({ invoice, client, profile }));
    expect(text).toContain('Paid');
    expect(text).toContain('Due: —');
  });

  it('names both contract parties and includes the plain-text body', () => {
    const text = renderedText(ContractPDF({ contract, client, profile }));
    expect(text).toContain('Between: Acme (Studio) and Jane');
    expect(text).toContain('Sign here');
  });
});
