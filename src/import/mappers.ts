/**
 * Entity mappers · transform parsed import data into Lance entity shapes.
 */

import type { ImportDetection } from '../types';

/**
 * Map spreadsheet rows to client creation payloads.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapToClients(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): Array<{ name: string; email?: string; phone?: string; company?: string; notes?: string }> {
  const reverseMap = buildReverseMap(columnMapping);
  return rows
    .map(row => {
      const rawEmail = getField(row, reverseMap, 'email')?.trim();
      const email = rawEmail && EMAIL_REGEX.test(rawEmail) ? rawEmail : undefined;
      return {
        name: getField(row, reverseMap, 'name')?.trim() || '',
        email,
        phone: getField(row, reverseMap, 'phone')?.trim() || undefined,
        company: getField(row, reverseMap, 'company')?.trim() || undefined,
        notes: getField(row, reverseMap, 'notes')?.trim() || undefined,
      };
    })
    .filter(c => c.name.length > 0);
}

/**
 * Map spreadsheet rows to invoice line items.
 */
export function mapToLineItems(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): Array<{ id: string; description: string; quantity: number; unit_price: number; total: number }> {
  const reverseMap = buildReverseMap(columnMapping);
  return rows
    .map(row => {
      const desc = getField(row, reverseMap, 'description')?.trim() || '';
      const qty = parseFloat(getField(row, reverseMap, 'quantity') || '1') || 1;
      const price = parseFloat(getField(row, reverseMap, 'unit_price') || '0') || 0;
      const total = parseFloat(getField(row, reverseMap, 'total') || '') || qty * price;
      return {
        id: crypto.randomUUID(),
        description: desc,
        quantity: qty,
        unit_price: price,
        total,
      };
    })
    .filter(item => item.description.length > 0 && item.total > 0);
}

/**
 * Map spreadsheet rows to project creation payloads.
 */
export function mapToProjects(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): Array<{
  title: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  budget?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  client_name?: string;
}> {
  const reverseMap = buildReverseMap(columnMapping);
  return rows
    .map(row => {
      const statusRaw = (getField(row, reverseMap, 'status') || 'active').toLowerCase().trim();
      let status: 'active' | 'completed' | 'paused' | 'cancelled' = 'active';
      if (statusRaw.includes('complete') || statusRaw.includes('done') || statusRaw.includes('finish')) status = 'completed';
      else if (statusRaw.includes('pause') || statusRaw.includes('hold')) status = 'paused';
      else if (statusRaw.includes('cancel')) status = 'cancelled';

      const budgetStr = getField(row, reverseMap, 'budget');
      const budget = budgetStr ? parseFloat(budgetStr.replace(/[$,]/g, '')) : undefined;

      return {
        title: getField(row, reverseMap, 'title')?.trim() || '',
        status,
        budget: budget && !isNaN(budget) ? budget : undefined,
        start_date: normalizeDate(getField(row, reverseMap, 'start_date')),
        end_date: normalizeDate(getField(row, reverseMap, 'end_date')),
        notes: getField(row, reverseMap, 'notes')?.trim() || undefined,
        client_name: getField(row, reverseMap, 'client_name')?.trim() || undefined,
      };
    })
    .filter(p => p.title.length > 0);
}

/**
 * Map spreadsheet rows to expense creation payloads.
 */
export function mapToExpenses(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): Array<{ category: string; description: string; amount: number; date: string }> {
  const reverseMap = buildReverseMap(columnMapping);
  return rows
    .map(row => {
      const amountStr = getField(row, reverseMap, 'amount') || '0';
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      return {
        category: getField(row, reverseMap, 'category')?.trim() || 'Uncategorized',
        description: getField(row, reverseMap, 'description')?.trim() || '',
        amount: isNaN(amount) ? 0 : amount,
        date: normalizeDate(getField(row, reverseMap, 'date')) || new Date().toISOString().split('T')[0],
      };
    })
    .filter(e => e.description.length > 0 && e.amount > 0);
}

/**
 * Extract prefill data from a document import detection.
 */
export function extractDocumentPrefill(detection: ImportDetection): {
  entityType: string;
  title?: string;
  client_name?: string;
  email?: string;
  total?: number;
  due_date?: string;
  invoice_number?: string;
  body?: string;
  lineItems?: Array<{ id: string; description: string; quantity: number; unit_price: number; total: number }>;
} {
  const fields = detection.preview.extractedFields || {};
  const lineItems = detection.preview.extractedLineItems?.map(item => ({
    ...item,
    id: crypto.randomUUID(),
  }));

  return {
    entityType: detection.detectedEntity,
    title: fields.title,
    client_name: fields.client_name,
    email: fields.email,
    total: fields.total ? parseFloat(fields.total) : undefined,
    due_date: normalizeDate(fields.due_date),
    invoice_number: fields.invoice_number,
    body: detection.preview.rawText?.substring(0, 5000),
    lineItems,
  };
}

// ── Helpers ──

function buildReverseMap(columnMapping: Record<string, string>): Record<string, string> {
  const reverse: Record<string, string> = {};
  for (const [sourceCol, lanceField] of Object.entries(columnMapping)) {
    if (lanceField) reverse[lanceField] = sourceCol;
  }
  return reverse;
}

function getField(row: Record<string, string>, reverseMap: Record<string, string>, field: string): string | undefined {
  const sourceCol = reverseMap[field];
  return sourceCol ? row[sourceCol] : undefined;
}

function normalizeDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
  // Try parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return undefined;
}
