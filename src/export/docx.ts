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
import type { Proposal, Invoice, Contract, Client, UserProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { htmlToPlainText } from '../utils/htmlToText';
import { saveFile, getProfileName } from './common';
import { sanitizeInvoiceNumber } from '../utils/invoiceNumber';

function parseHtmlToDocx(html: string): Paragraph[] {
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, 'text/html');
  const blocks: Paragraph[] = [];

  function parseInlines(node: ChildNode, format = { bold: false, italics: false }): TextRun[] {
    let runs: TextRun[] = [];
    node.childNodes.forEach((child) => {
      const isBold = format.bold || child.nodeName === 'STRONG' || child.nodeName === 'B';
      const isItalic = format.italics || child.nodeName === 'EM' || child.nodeName === 'I';
      
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent) {
          runs.push(new TextRun({
            text: child.textContent,
            bold: isBold,
            italics: isItalic,
            size: 22,
            color: '#181716'
          }));
        }
      } else {
        runs = runs.concat(parseInlines(child, { bold: isBold, italics: isItalic }));
      }
    });
    return runs;
  }

  dom.body.childNodes.forEach((node) => {
    if (node.nodeName === 'P' || node.nodeName === 'H1' || node.nodeName === 'H2' || node.nodeName === 'H3' || node.nodeName === 'DIV') {
      blocks.push(new Paragraph({
        children: parseInlines(node),
        spacing: { after: 200 },
        heading: node.nodeName === 'H1' ? HeadingLevel.HEADING_1 :
                 node.nodeName === 'H2' ? HeadingLevel.HEADING_2 : undefined,
      }));
    } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
      node.childNodes.forEach((li) => {
        if (li.nodeName === 'LI') {
          blocks.push(new Paragraph({
            children: parseInlines(li),
            bullet: { level: 0 },
            spacing: { after: 120 }
          }));
        }
      });
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: node.textContent, size: 22, color: '#181716' })],
        spacing: { after: 200 }
      }));
    }
  });

  return blocks;
}

export async function exportProposalDOCX(
  proposal: Proposal,
  client: Client,
  profile: UserProfile
): Promise<void> {
  const bodyBlocks = parseHtmlToDocx(proposal.body || proposal.scope || '');
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

          ...bodyBlocks,

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
  const currency = invoice.currency || profile.currency;
  const showTax = invoice.tax_rate != null && invoice.tax_rate > 0;
  const taxAmount = invoice.subtotal * ((invoice.tax_rate || 0) / 100);

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#159C65';

  const statusColor =
    invoice.status === 'paid' ? accentColor :
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
    (item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.description, size: 22 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.quantity), size: 22 })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.unit_price, currency), size: 22 })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.total, currency), size: 22 })], alignment: AlignmentType.RIGHT })] }),
        ],
      })
  );

  const totalRows: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: `Subtotal:  `, size: 22, color: '#68675F' }),
        new TextRun({ text: formatCurrency(invoice.subtotal, currency), size: 22 }),
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
          new TextRun({ text: formatCurrency(taxAmount, currency), size: 22 }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  totalRows.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'TOTAL:  ', size: 24, bold: true }),
        new TextRun({ text: formatCurrency(invoice.total, currency), size: 24, bold: true, color: accentColor }),
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
                  children: [new TextRun({ text: htmlToPlainText(invoice.notes), size: 20, color: '#68675F', italics: true })],
                  spacing: { after: 100 },
                }),
              ]
            : []),

          ...(profile.payment_instructions && profile.payment_instructions.trim()
            ? [
                new Paragraph({
                  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
                  spacing: { before: 200, after: 200 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'HOW TO PAY', size: 20, color: '#68675F', bold: true })],
                  spacing: { after: 100 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: profile.payment_instructions.trim(), size: 20, color: '#181716' })],
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
  const filename = `Lance_Invoice_${sanitizeInvoiceNumber(invoice.invoice_number) || 'INV'}_${client.name.replace(/\s+/g, '_')}.docx`;
  await saveFile(blob, filename);
}

export async function exportContractDOCX(
  contract: Contract,
  client: Client,
  profile: UserProfile
): Promise<void> {
  const profileName = getProfileName(profile);
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#159C65';

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'CONTRACT', bold: true, size: 56, color: accentColor })],
            spacing: { after: 60 },
          }),
          new Paragraph({ children: [new TextRun({ text: contract.title, bold: true, size: 28 })], spacing: { after: 120 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `Between: ${client.name}${client.company ? ` (${client.company})` : ''} and ${profileName}`, size: 20, color: '#68675F' }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 100, after: 200 },
          }),

          ...parseHtmlToDocx(contract.body || ''),

          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '#E3E2DB' } },
            spacing: { before: 200, after: 200 },
          }),

          new Paragraph({ children: [new TextRun({ text: profileName, bold: true, size: 22 })], spacing: { after: 60 } }),
          ...(profile.email
            ? [new Paragraph({ children: [new TextRun({ text: profile.email, size: 20, color: '#68675F' })] })]
            : []),
          ...(contract.signed_at
            ? [
                new Paragraph({
                  children: [new TextRun({ text: `Signed: ${formatDate(contract.signed_at)}`, size: 20, color: '#68675F' })],
                  spacing: { before: 120 },
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Lance_Contract_${contract.title.replace(/\s+/g, '_')}_${client.name.replace(/\s+/g, '_')}.docx`;
  await saveFile(blob, filename);
}
