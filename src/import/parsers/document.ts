/**
 * Document parser — handles .pdf and .docx/.doc files.
 * Extracts text, classifies content, and pulls structured fields.
 */

import type { ImportDetection } from '../../types';
import { classifyDocument, entityTypeLabel } from '../classifier';

/**
 * Parse a PDF file and extract text content.
 */
async function parsePDFText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Set up the worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        if ('str' in item) return item.str;
        return '';
      })
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}

/**
 * Parse a DOCX file and extract text content using mammoth.
 */
async function parseDOCXText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract structured fields from document text using pattern matching.
 */
function extractFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Extract dates (various formats)
  const datePatterns = [
    /(?:date|dated|issued|due)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi,
    /(?:date|dated|issued|due)[:\s]*(\w+ \d{1,2},?\s*\d{4})/gi,
    /(\d{4}-\d{2}-\d{2})/g,
  ];
  for (const pattern of datePatterns) {
    const match = pattern.exec(text);
    if (match) {
      if (!fields.date) fields.date = match[1].trim();
    }
  }

  // Extract due date specifically
  const dueDateMatch = /(?:due\s*date|payment\s*due)[:\s]*([^\n,;]+)/i.exec(text);
  if (dueDateMatch) fields.due_date = dueDateMatch[1].trim();

  // Extract amounts
  const amountPatterns = [
    /(?:total|amount\s*due|grand\s*total|balance\s*due)[:\s]*\$?([\d,]+\.?\d*)/gi,
    /\$\s*([\d,]+\.\d{2})/g,
  ];
  const amounts: number[] = [];
  for (const pattern of amountPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amounts.push(val);
    }
  }
  if (amounts.length > 0) {
    fields.total = String(Math.max(...amounts));
  }

  // Extract email
  const emailMatch = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i.exec(text);
  if (emailMatch) fields.email = emailMatch[1];

  // Extract client/company name from common patterns
  const clientPatterns = [
    /(?:bill\s*to|billed\s*to|client|customer|prepared\s*for|attention)[:\s]*([^\n]{3,60})/i,
    /(?:to|for)[:\s]*\n?\s*([A-Z][^\n]{3,60})/,
  ];
  for (const pattern of clientPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const name = match[1].trim().replace(/[:-]/g, '').trim();
      if (name.length >= 2 && name.length <= 80) {
        fields.client_name = name;
        break;
      }
    }
  }

  // Extract invoice number
  const invoiceNumMatch = /(?:invoice\s*(?:#|no\.?|number)[:\s]*)([A-Za-z0-9-]+)/i.exec(text);
  if (invoiceNumMatch) fields.invoice_number = invoiceNumMatch[1].trim();

  // Extract title for proposals/contracts
  const titleMatch = /(?:^|\n)\s*(?:re:|subject:|title:|project:)\s*([^\n]{5,100})/i.exec(text);
  if (titleMatch) fields.title = titleMatch[1].trim();

  return fields;
}

/**
 * Extract line items from document text.
 */
function extractLineItems(text: string): Array<{ description: string; quantity: number; unit_price: number; total: number }> {
  const items: Array<{ description: string; quantity: number; unit_price: number; total: number }> = [];

  // Pattern: description followed by numbers (qty, price, total)
  const lineItemPattern = /([A-Za-z][^\n$]{5,80}?)\s+(\d+\.?\d*)\s+\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)/g;
  let match;
  while ((match = lineItemPattern.exec(text)) !== null) {
    const qty = parseFloat(match[2]);
    const price = parseFloat(match[3].replace(/,/g, ''));
    const total = parseFloat(match[4].replace(/,/g, ''));
    if (!isNaN(qty) && !isNaN(price) && !isNaN(total) && qty > 0 && price > 0) {
      items.push({
        description: match[1].trim(),
        quantity: qty,
        unit_price: price,
        total,
      });
    }
  }

  return items;
}

/**
 * Main document parsing entry point.
 */
export async function parseDocument(file: File): Promise<ImportDetection> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let rawText = '';

  try {
    if (ext === 'pdf') {
      rawText = await parsePDFText(file);
    } else if (ext === 'docx') {
      rawText = await parseDOCXText(file);
    } else if (ext === 'doc') {
      // .doc (legacy binary format) — mammoth may handle some versions
      try {
        rawText = await parseDOCXText(file);
      } catch {
        return {
          file,
          fileType: 'document',
          detectedEntity: 'unknown',
          confidence: 0,
          preview: {
            summary: 'Legacy .doc format — could not extract text. Try saving as .docx and re-importing.',
          },
        };
      }
    }
  } catch (err) {
    return {
      file,
      fileType: 'document',
      detectedEntity: 'unknown',
      confidence: 0,
      preview: {
        summary: `Failed to parse ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      },
    };
  }

  if (!rawText || rawText.trim().length < 10) {
    // Possibly a scanned PDF (image-only)
    return {
      file,
      fileType: 'document',
      detectedEntity: 'unknown',
      confidence: 0,
      preview: {
        summary: ext === 'pdf'
          ? 'This PDF appears to be scanned/image-based — text could not be extracted. You can import it as a file attachment instead.'
          : 'Could not extract any meaningful text from this document.',
        rawText: '',
      },
    };
  }

  // Classify
  const { type: detectedEntity, confidence } = classifyDocument(rawText);

  // Extract structured fields
  const extractedFields = extractFields(rawText);
  const extractedLineItems = extractLineItems(rawText);

  const truncatedText = rawText.length > 2000 ? rawText.substring(0, 2000) + '...' : rawText;

  const summary = confidence >= 0.15
    ? `Detected: ${entityTypeLabel(detectedEntity)} — ${Object.keys(extractedFields).length} fields extracted`
    : `Could not confidently classify this document. You can assign it manually or import as an attachment.`;

  return {
    file,
    fileType: 'document',
    detectedEntity,
    confidence,
    preview: {
      extractedFields,
      extractedLineItems: extractedLineItems.length > 0 ? extractedLineItems : undefined,
      rawText: truncatedText,
      summary,
    },
  };
}
