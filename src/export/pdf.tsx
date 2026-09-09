import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Proposal, Invoice, Contract, Client, UserProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { htmlToPlainText } from '../utils/htmlToText';
import { getProfileName } from './common';

const ACCENT = '#159C65';

const pdfStyles = StyleSheet.create({
  page: { padding: 60, fontFamily: 'Helvetica', fontSize: 11, color: '#181716' },
  divider: { borderBottom: '1 solid #E3E2DB', marginVertical: 16 },
  label: { fontSize: 9, color: '#A3A39E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: 11, color: '#181716', lineHeight: 1.6 },
  freelancerName: { fontSize: 14, fontWeight: 600 },
  freelancerEmail: { fontSize: 10, color: '#68675F' },
  date: { fontSize: 10, color: '#68675F' },
  heading: { fontSize: 22, fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 16, color: '#181716', marginBottom: 8 },
  preparedFor: { fontSize: 11, color: '#68675F' },
  invoiceHeading: { fontSize: 28, fontWeight: 600 },
  invoiceNumber: { fontSize: 14, color: '#68675F' },
  tableHeader: { fontSize: 9, color: '#A3A39E', textTransform: 'uppercase' },
  totalLabel: { fontSize: 12, fontWeight: 600 },
  totalValue: { fontSize: 12, fontWeight: 600, color: ACCENT },
  notes: { fontSize: 10, color: '#68675F', fontStyle: 'italic' },
  statusPaid: { color: ACCENT },
  statusSent: { color: 'var(--warning-text)' },
  statusDraft: { color: '#A3A39E' },
  statusPartial: { color: 'var(--warning-text)' },
  statusOverdue: { color: 'var(--danger)' },
  tableRow: { flexDirection: 'row', paddingVertical: 4 },
  tableCellDesc: { flex: 3 },
  tableCellQty: { flex: 1, textAlign: 'right' },
  tableCellPrice: { flex: 1.5, textAlign: 'right' },
  tableCellTotal: { flex: 1.5, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  totalRowLabel: { fontSize: 11, color: '#68675F' },
  thankYou: { fontSize: 10, color: '#68675F', marginTop: 24 },
});

export function ProposalPDF({ proposal, client, profile }: { proposal: Proposal; client: Client; profile: UserProfile }) {
  const body = htmlToPlainText(proposal.body || proposal.scope || '');
  const statusDate = proposal.sent_at || new Date().toISOString();

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={pdfStyles.freelancerName}>{getProfileName(profile)}</Text>
            {profile.email && <Text style={pdfStyles.freelancerEmail}>{profile.email}</Text>}
          </View>
          <Text style={pdfStyles.date}>{formatDate(statusDate)}</Text>
        </View>

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.heading}>PROPOSAL</Text>
        <Text style={pdfStyles.title}>{proposal.title}</Text>
        <Text style={pdfStyles.preparedFor}>
          Prepared for: {client.name}{client.company ? ` (${client.company})` : ''}
        </Text>

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.value}>{body}</Text>

        <View style={pdfStyles.divider} />

        {proposal.scope && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.label}>SCOPE SUMMARY</Text>
            <Text style={pdfStyles.value}>{proposal.scope}</Text>
          </View>
        )}

        {proposal.timeline && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.label}>TIMELINE</Text>
            <Text style={pdfStyles.value}>{proposal.timeline}</Text>
          </View>
        )}

        {proposal.rate != null && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.label}>INVESTMENT</Text>
            <Text style={pdfStyles.value}>
              {formatCurrency(proposal.rate, profile.currency)}{' '}
              {proposal.rate_type === 'hourly' ? 'per hour' : 'flat'}
            </Text>
          </View>
        )}

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.freelancerName}>{getProfileName(profile)}</Text>
        {profile.email && <Text style={pdfStyles.freelancerEmail}>{profile.email}</Text>}
      </Page>
    </Document>
  );
}

export function InvoicePDF({ invoice, client, profile }: { invoice: Invoice; client: Client; profile: UserProfile }) {
  const currency = invoice.currency || profile.currency;
  const taxAmount = invoice.subtotal * ((invoice.tax_rate || 0) / 100);
  const showTax = invoice.tax_rate != null && invoice.tax_rate > 0;

  const statusColor =
    invoice.status === 'paid' ? pdfStyles.statusPaid :
    invoice.status === 'sent' ? pdfStyles.statusSent :
    invoice.status === 'partial' ? pdfStyles.statusPartial :
    invoice.status === 'overdue' ? pdfStyles.statusOverdue :
    pdfStyles.statusDraft;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={pdfStyles.invoiceHeading}>INVOICE</Text>
            <Text style={pdfStyles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[pdfStyles.invoiceNumber, statusColor]}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={pdfStyles.freelancerName}>{getProfileName(profile)}</Text>
            {profile.email && <Text style={pdfStyles.freelancerEmail}>{profile.email}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[pdfStyles.label, { marginBottom: 2 }]}>BILL TO</Text>
            <Text style={pdfStyles.value}>{client.name}</Text>
            {client.email && <Text style={pdfStyles.freelancerEmail}>{client.email}</Text>}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 24, marginBottom: 16 }}>
          <Text style={pdfStyles.freelancerEmail}>Date: {formatDate(invoice.created_at)}</Text>
          <Text style={pdfStyles.freelancerEmail}>
            Due: {invoice.due_date ? formatDate(invoice.due_date) : '\u2014'}
          </Text>
        </View>

        <View style={pdfStyles.divider} />

        <View style={[pdfStyles.tableRow, { borderBottom: '1 solid #E3E2DB', paddingBottom: 6 }]}>
          <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellDesc]}>DESCRIPTION</Text>
          <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellQty]}>QTY</Text>
          <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellPrice]}>UNIT PRICE</Text>
          <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellTotal]}>TOTAL</Text>
        </View>

        {invoice.line_items.map((item, i) => (
          <View
            key={item.id}
            style={[
              pdfStyles.tableRow,
              { backgroundColor: i % 2 === 0 ? '#F8F7F3' : '#FFFFFF', paddingVertical: 5 },
            ]}
          >
            <Text style={[pdfStyles.value, pdfStyles.tableCellDesc]}>{item.description}</Text>
            <Text style={[pdfStyles.value, pdfStyles.tableCellQty]}>{item.quantity}</Text>
            <Text style={[pdfStyles.value, pdfStyles.tableCellPrice]}>{formatCurrency(item.unit_price, currency)}</Text>
            <Text style={[pdfStyles.value, pdfStyles.tableCellTotal]}>{formatCurrency(item.total, currency)}</Text>
          </View>
        ))}

        <View style={pdfStyles.divider} />

        <View style={[pdfStyles.totalRow]}>
          <Text style={pdfStyles.totalRowLabel}>Subtotal:  </Text>
          <Text style={pdfStyles.value}>{formatCurrency(invoice.subtotal, currency)}</Text>
        </View>

        {showTax && (
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalRowLabel}>Tax ({invoice.tax_rate}%):  </Text>
            <Text style={pdfStyles.value}>{formatCurrency(taxAmount, currency)}</Text>
          </View>
        )}

        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>TOTAL:  </Text>
          <Text style={pdfStyles.totalValue}>{formatCurrency(invoice.total, currency)}</Text>
        </View>

        {invoice.notes && (
          <>
            <View style={pdfStyles.divider} />
            <Text style={pdfStyles.notes}>{htmlToPlainText(invoice.notes)}</Text>
          </>
        )}

        {profile.payment_instructions && profile.payment_instructions.trim() && (
          <>
            <View style={pdfStyles.divider} />
            <Text style={pdfStyles.label}>HOW TO PAY</Text>
            <Text style={pdfStyles.value}>{profile.payment_instructions.trim()}</Text>
          </>
        )}

        <Text style={pdfStyles.thankYou}>Thank you for your business.</Text>
      </Page>
    </Document>
  );
}

export function ContractPDF({ contract, client, profile }: { contract: Contract; client: Client; profile: UserProfile }) {
  const body = htmlToPlainText(contract.body || '');
  const statusDate = contract.signed_at || contract.created_at;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={pdfStyles.freelancerName}>{getProfileName(profile)}</Text>
            {profile.email && <Text style={pdfStyles.freelancerEmail}>{profile.email}</Text>}
          </View>
          <Text style={pdfStyles.date}>{formatDate(statusDate)}</Text>
        </View>

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.heading}>CONTRACT</Text>
        <Text style={pdfStyles.title}>{contract.title}</Text>
        <Text style={pdfStyles.preparedFor}>
          Between: {client.name}{client.company ? ` (${client.company})` : ''} and {getProfileName(profile)}
        </Text>

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.value}>{body}</Text>

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.freelancerName}>{getProfileName(profile)}</Text>
        {profile.email && <Text style={pdfStyles.freelancerEmail}>{profile.email}</Text>}
      </Page>
    </Document>
  );
}
