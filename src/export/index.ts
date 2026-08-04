import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { ProposalPDF, InvoicePDF, ContractPDF } from './pdf';
import { saveFile } from './common';
import type { Proposal, Invoice, Contract, Client, UserProfile } from '../types';

export { exportProposalDOCX, exportInvoiceDOCX, exportContractDOCX } from './docx';

export async function exportProposalPDF(
  proposal: Proposal,
  client: Client,
  profile: UserProfile
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(ProposalPDF, { proposal, client, profile }) as any;
  const blob = await pdf(doc).toBlob();
  const date = new Date().toISOString().split('T')[0];
  const filename = `Lance_Proposal_${client.name.replace(/\s+/g, '_')}_${date}.pdf`;
  await saveFile(blob, filename);
}

export async function exportInvoicePDF(
  invoice: Invoice,
  client: Client,
  profile: UserProfile
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(InvoicePDF, { invoice, client, profile }) as any;
  const blob = await pdf(doc).toBlob();
  const filename = `Lance_Invoice_${invoice.invoice_number}_${client.name.replace(/\s+/g, '_')}.pdf`;
  await saveFile(blob, filename);
}

export async function exportContractPDF(
  contract: Contract,
  client: Client,
  profile: UserProfile
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(ContractPDF, { contract, client, profile }) as any;
  const blob = await pdf(doc).toBlob();
  const date = new Date().toISOString().split('T')[0];
  const filename = `Lance_Contract_${client.name.replace(/\s+/g, '_')}_${date}.pdf`;
  await saveFile(blob, filename);
}
