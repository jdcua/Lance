import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import type { Proposal, Invoice, Client, UserProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { htmlToPlainText } from '../utils/htmlToText';
import { saveFile, getProfileName } from './common';

export async function exportProposalDOCX(
  proposal: Proposal,
  client: Client,
  profile: UserProfile
): Promise<void> {
  const bodyText = htmlToPlainText(proposal.body || proposal.scope || '');
  const profileName = getProfileName(profile);
  const statusDate = proposal.sent_at || new Date().toISOString();

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          // Header: name left, date right
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [5000, 4026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: profileName, bold: true, size: 28 })] })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatDate(statusDate), size: 20, color: '#68675F' })], alignment: AlignmentType.RIGHT })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                ],
              }),
            ],
          }),
          ...(profile.email
            ? [new Paragraph({ children: [new TextRun({ text: profile.email, size: 20, color: '#68675F' })], spacing: { after: 200 } })]
            : []),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 200, after: 200 },
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'PROPOSAL', size: 44, bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: proposal.title, size: 32, color: '#181716' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Prepared for: ${client.name}${client.company ? ` (${client.company})` : ''}`, size: 22, color: '#68675F' })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 200, after: 200 },
          }),

          ...bodyText.split('\n').map(
            (line) => new Paragraph({ children: [new TextRun({ text: line, size: 22, color: '#181716' })], spacing: { line: 360 } })
          ),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 200, after: 200 },
          }),

          ...(proposal.scope
            ? [
                new Paragraph({
                  children: [new TextRun({ text: 'SCOPE SUMMARY', bold: true, size: 18, color: '#A3A39E', allCaps: true })],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: proposal.scope, size: 22, color: '#181716' })],
                  spacing: { after: 200 },
                }),
              ]
            : []),

          ...(proposal.timeline
            ? [
                new Paragraph({
                  children: [new TextRun({ text: 'TIMELINE', bold: true, size: 18, color: '#A3A39E', allCaps: true })],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: proposal.timeline, size: 22, color: '#181716' })],
                  spacing: { after: 200 },
                }),
              ]
            : []),

          ...(proposal.rate != null
            ? [
                new Paragraph({
                  children: [new TextRun({ text: 'INVESTMENT', bold: true, size: 18, color: '#A3A39E', allCaps: true })],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${formatCurrency(proposal.rate, profile.currency)} ${proposal.rate_type === 'hourly' ? 'per hour' : 'flat'}`,
                      size: 22,
                      color: '#181716',
                    }),
                  ],
                  spacing: { after: 200 },
                }),
              ]
            : []),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 200, after: 200 },
          }),

          new Paragraph({
            children: [new TextRun({ text: profileName, bold: true, size: 22 })],
          }),
          ...(profile.email
            ? [
                new Paragraph({
                  children: [new TextRun({ text: profile.email, size: 20, color: '#68675F' })],
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const date = new Date().toISOString().split('T')[0];
  const filename = `Lance_Proposal_${client.name.replace(/\s+/g, '_')}_${date}.docx`;
  await saveFile(blob, filename);
}

export async function exportInvoiceDOCX(
  invoice: Invoice,
  client: Client,
  profile: UserProfile
): Promise<void> {
  const profileName = getProfileName(profile);
  const showTax = invoice.tax_rate != null && invoice.tax_rate > 0;
  const taxAmount = invoice.subtotal * ((invoice.tax_rate || 0) / 100);

  const statusColor =
    invoice.status === 'paid' ? 'var(--accent)' :
    invoice.status === 'sent' ? '#854F0B' :
    invoice.status === 'overdue' ? '#A32D2D' : '#A3A39E';

  const headerCells = ['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'].map(
    (text) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, size: 18, color: '#A3A39E', allCaps: true })],
          }),
        ],
      })
  );

  const itemRows = invoice.line_items.map(
    (item, i) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.description, size: 22 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.quantity), size: 22 })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.unit_price, profile.currency), size: 22 })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.total, profile.currency), size: 22 })], alignment: AlignmentType.RIGHT })] }),
        ],
      })
  );

  const totalRows: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: `Subtotal:  `, size: 22, color: '#68675F' }),
        new TextRun({ text: formatCurrency(invoice.subtotal, profile.currency), size: 22 }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 100 },
    }),
  ];

  if (showTax) {
    totalRows.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Tax (${invoice.tax_rate}%):  `, size: 22, color: '#68675F' }),
          new TextRun({ text: formatCurrency(taxAmount, profile.currency), size: 22 }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  totalRows.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'TOTAL:  ', size: 24, bold: true }),
        new TextRun({ text: formatCurrency(invoice.total, profile.currency), size: 24, bold: true, color: 'var(--accent)' }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 60 },
    })
  );

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          // INVOICE heading: title left, number right
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [5000, 4026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'INVOICE', bold: true, size: 56 })] })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: invoice.invoice_number, size: 28, color: '#68675F' })], alignment: AlignmentType.RIGHT })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`, size: 20, color: statusColor })],
          }),

          new Paragraph({ spacing: { before: 200 } }),
          // Profile left, Bill to right
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [5000, 4026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: profileName, bold: true, size: 22 })] })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Bill to:', size: 22, color: '#68675F' })], alignment: AlignmentType.RIGHT })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                ],
              }),
            ],
          }),
          ...(profile.email
            ? [new Paragraph({ children: [new TextRun({ text: profile.email, size: 20, color: '#68675F' })], spacing: { after: 60 } })]
            : []),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: client.name, size: 22 })],
          }),
          ...(client.email
            ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: client.email, size: 20, color: '#68675F' })] })]
            : []),

          new Paragraph({ spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: ${formatDate(invoice.created_at)}`, size: 20, color: '#68675F' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Due: ${invoice.due_date ? formatDate(invoice.due_date) : '\u2014'}`, size: 20, color: '#68675F' }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 100, after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4600, 1000, 1700, 1700],
            rows: [
              new TableRow({ children: headerCells }),
              ...itemRows,
            ],
          }),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 200, after: 100 },
          }),

          ...totalRows,

          ...(invoice.notes
            ? [
                new Paragraph({
                  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
                  spacing: { before: 200, after: 200 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: invoice.notes, size: 20, color: '#68675F', italics: true })],
                  spacing: { after: 100 },
                }),
              ]
            : []),

          new Paragraph({
            children: [new TextRun({ text: 'Thank you for your business.', size: 20, color: '#68675F' })],
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Lance_Invoice_${invoice.invoice_number}_${client.name.replace(/\s+/g, '_')}.docx`;
  await saveFile(blob, filename);
}
