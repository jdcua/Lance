import { pdf } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { ProposalPDF, InvoicePDF, ContractPDF } from './pdf';
import { saveFile } from './common';
import { sanitizeInvoiceNumber, sanitizeFilenamePart } from '../utils/invoiceNumber';
import { todayLocalISO } from '../utils/format';
import type { Proposal, Invoice, Contract, Client, UserProfile } from '../types';

export { exportProposalDOCX, exportInvoiceDOCX, exportContractDOCX } from './docx';

export async function exportProposalPDF(
  proposal: Proposal,
  client: Client,
  profile: UserProfile,
): Promise<void> {
  const doc = createElement(ProposalPDF, {
    proposal,
    client,
    profile,
  }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(doc).toBlob();
  const date = todayLocalISO();
  const filename = `Lance_Proposal_${sanitizeFilenamePart(client.name, 'client')}_${date}.pdf`;
  await saveFile(blob, filename);
}

export async function exportInvoicePDF(
  invoice: Invoice,
  client: Client,
  profile: UserProfile,
): Promise<void> {
  const doc = createElement(InvoicePDF, {
    invoice,
    client,
    profile,
  }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(doc).toBlob();
  const filename = `Lance_Invoice_${sanitizeFilenamePart(sanitizeInvoiceNumber(invoice.invoice_number), 'INV')}_${sanitizeFilenamePart(client.name, 'client')}.pdf`;
  await saveFile(blob, filename);
}

export async function exportContractPDF(
  contract: Contract,
  client: Client,
  profile: UserProfile,
): Promise<void> {
  const doc = createElement(ContractPDF, {
    contract,
    client,
    profile,
  }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(doc).toBlob();
  const date = todayLocalISO();
  const filename = `Lance_Contract_${sanitizeFilenamePart(client.name, 'client')}_${date}.pdf`;
  await saveFile(blob, filename);
}
