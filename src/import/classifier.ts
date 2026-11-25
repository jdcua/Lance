/**
 * Content classification engine for imported files.
 * Scores imported data against known Lance entity patterns.
 */

import type { DetectedEntityType } from '../types';

// ── Column pattern dictionaries ──

const CLIENT_COLUMNS = [
  'name',
  'client',
  'client_name',
  'customer',
  'contact',
  'email',
  'phone',
  'company',
  'organization',
];
const INVOICE_COLUMNS = [
  'description',
  'quantity',
  'qty',
  'price',
  'unit_price',
  'rate',
  'amount',
  'total',
  'subtotal',
  'tax',
  'invoice',
  'bill',
  'due_date',
];
const PROJECT_COLUMNS = [
  'project',
  'title',
  'project_name',
  'status',
  'budget',
  'start_date',
  'end_date',
  'deadline',
  'client',
];
const EXPENSE_COLUMNS = [
  'expense',
  'category',
  'amount',
  'date',
  'description',
  'vendor',
  'receipt',
  'cost',
];
const FINANCIAL_COLUMNS = [
  'revenue',
  'income',
  'profit',
  'loss',
  'month',
  'quarter',
  'year',
  'balance',
  'debit',
  'credit',
];

// ── Keyword dictionaries for document classification ──

const INVOICE_KEYWORDS = [
  'invoice',
  'bill to',
  'due date',
  'amount due',
  'subtotal',
  'total',
  'payment terms',
  'line items',
  'remit to',
  'invoice number',
  'invoice #',
  'billed to',
  'pay to',
];
const CONTRACT_KEYWORDS = [
  'agreement',
  'contract',
  'terms and conditions',
  'whereas',
  'party',
  'parties',
  'effective date',
  'termination',
  'indemnification',
  'liability',
  'governing law',
  'jurisdiction',
  'executed',
  'witnesseth',
  'herein',
  'hereinafter',
];
const PROPOSAL_KEYWORDS = [
  'proposal',
  'scope of work',
  'deliverables',
  'timeline',
  'milestones',
  'budget',
  'estimate',
  'quotation',
  'prepared for',
  'submitted by',
  'project overview',
  'approach',
  'objectives',
];

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function countMatches(headers: string[], patterns: string[]): number {
  const normalized = headers.map(normalizeHeader);
  let count = 0;
  for (const h of normalized) {
    for (const p of patterns) {
      if (h === p || h.includes(p) || p.includes(h)) {
        count++;
        break;
      }
    }
  }
  return count;
}

/**
 * Classify spreadsheet data by analyzing column headers.
 */
export function classifySpreadsheet(headers: string[]): {
  type: DetectedEntityType;
  confidence: number;
} {
  if (headers.length === 0) return { type: 'unknown', confidence: 0 };

  const scores: [DetectedEntityType, number][] = [
    [
      'client_list',
      countMatches(headers, CLIENT_COLUMNS) / Math.min(headers.length, CLIENT_COLUMNS.length),
    ],
    [
      'invoice',
      countMatches(headers, INVOICE_COLUMNS) / Math.min(headers.length, INVOICE_COLUMNS.length),
    ],
    [
      'project_list',
      countMatches(headers, PROJECT_COLUMNS) / Math.min(headers.length, PROJECT_COLUMNS.length),
    ],
    [
      'expense_list',
      countMatches(headers, EXPENSE_COLUMNS) / Math.min(headers.length, EXPENSE_COLUMNS.length),
    ],
    [
      'financial_data',
      countMatches(headers, FINANCIAL_COLUMNS) / Math.min(headers.length, FINANCIAL_COLUMNS.length),
    ],
  ];

  // Boost invoice if both quantity-like and price-like columns exist
  const norm = headers.map(normalizeHeader);
  const hasQty = norm.some((h) => ['quantity', 'qty', 'hours', 'units'].some((k) => h.includes(k)));
  const hasPrice = norm.some((h) =>
    ['price', 'rate', 'unit_price', 'cost', 'amount'].some((k) => h.includes(k)),
  );
  if (hasQty && hasPrice) {
    scores[1] = ['invoice', Math.min(1, scores[1][1] + 0.25)];
  }

  scores.sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = scores[0];

  if (bestScore < 0.25) return { type: 'unknown', confidence: bestScore };
  return { type: bestType, confidence: Math.min(1, bestScore) };
}

/**
 * Classify document text by keyword density analysis.
 */
export function classifyDocument(text: string): { type: DetectedEntityType; confidence: number } {
  if (!text || text.trim().length < 20) return { type: 'unknown', confidence: 0 };

  const lower = text.toLowerCase();
  const totalWords = lower.split(/\s+/).length;

  function keywordScore(keywords: string[]): number {
    let hits = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lower.match(regex);
      if (matches) hits += matches.length;
    }
    // Normalize by keyword count and text length
    const density = hits / keywords.length;
    const lengthFactor = Math.min(1, totalWords / 100);
    return Math.min(1, density * 0.5 * lengthFactor);
  }

  const scores: [DetectedEntityType, number][] = [
    ['invoice', keywordScore(INVOICE_KEYWORDS)],
    ['contract', keywordScore(CONTRACT_KEYWORDS)],
    ['proposal', keywordScore(PROPOSAL_KEYWORDS)],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = scores[0];

  if (bestScore < 0.15) return { type: 'unknown', confidence: bestScore };
  return { type: bestType, confidence: Math.min(1, bestScore) };
}

/**
 * Suggest column mapping from source headers to Lance entity fields.
 */
function scoreAlias(norm: string, alias: string): number {
  if (norm === alias) return 1;
  if (norm.includes(alias) || alias.includes(norm)) return 0.7;
  const sim = levenshteinSimilarity(norm, alias);
  if (sim > 0.6) return sim * 0.5;
  return 0;
}

function bestFieldForHeader(
  norm: string,
  fieldMap: Record<string, string[]>,
): { bestField: string; bestScore: number } {
  let bestField = '';
  let bestScore = 0;
  for (const [field, aliases] of Object.entries(fieldMap)) {
    for (const alias of aliases) {
      const score = scoreAlias(norm, alias);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }
  }
  return { bestField, bestScore };
}

export function suggestColumnMapping(
  headers: string[],
  entityType: DetectedEntityType,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fieldMap = getFieldsForEntity(entityType);

  for (const header of headers) {
    const { bestField, bestScore } = bestFieldForHeader(normalizeHeader(header), fieldMap);
    if (bestScore >= 0.4) {
      mapping[header] = bestField;
    }
  }

  return mapping;
}

function getFieldsForEntity(entityType: DetectedEntityType): Record<string, string[]> {
  switch (entityType) {
    case 'client_list':
      return {
        name: ['name', 'client', 'client_name', 'customer', 'contact', 'full_name', 'contact_name'],
        email: ['email', 'email_address', 'e_mail', 'mail'],
        phone: ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'cell'],
        company: ['company', 'organization', 'org', 'business', 'company_name', 'firm'],
        notes: ['notes', 'note', 'comments', 'comment', 'description', 'remarks'],
      };
    case 'invoice':
      return {
        description: ['description', 'item', 'service', 'product', 'line_item', 'detail', 'work'],
        quantity: ['quantity', 'qty', 'hours', 'units', 'count'],
        unit_price: ['price', 'unit_price', 'rate', 'cost', 'unit_cost', 'hourly_rate'],
        total: ['total', 'amount', 'line_total', 'subtotal', 'ext_price', 'extended'],
      };
    case 'project_list':
      return {
        title: ['title', 'project', 'project_name', 'name', 'job'],
        status: ['status', 'state', 'phase'],
        budget: ['budget', 'value', 'amount', 'cost', 'price'],
        start_date: ['start_date', 'start', 'begin', 'from', 'started'],
        end_date: ['end_date', 'end', 'deadline', 'due', 'finish', 'completed'],
        client_name: ['client', 'client_name', 'customer', 'contact'],
        notes: ['notes', 'description', 'comments'],
      };
    case 'expense_list':
      return {
        category: ['category', 'type', 'expense_type', 'kind'],
        description: ['description', 'item', 'detail', 'memo', 'note', 'name'],
        amount: ['amount', 'cost', 'price', 'total', 'value'],
        date: ['date', 'expense_date', 'transaction_date', 'when'],
      };
    default:
      return {};
  }
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
        continue;
      }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}

/**
 * Get the human-readable label for a detected entity type.
 */
export function entityTypeLabel(type: DetectedEntityType): string {
  switch (type) {
    case 'client_list':
      return 'Client List';
    case 'project_list':
      return 'Project List';
    case 'invoice':
      return 'Invoice';
    case 'expense_list':
      return 'Expense List';
    case 'contract':
      return 'Contract';
    case 'proposal':
      return 'Proposal';
    case 'financial_data':
      return 'Financial Data';
    case 'attachment':
      return 'File Attachment';
    case 'unknown':
      return 'Unknown';
  }
}

/**
 * Get the available Lance fields for a given entity type (for UI dropdowns).
 */
export function getAvailableFields(
  entityType: DetectedEntityType,
): { value: string; label: string }[] {
  const fields = getFieldsForEntity(entityType);
  return [
    { value: '', label: '-- Skip this column --' },
    ...Object.keys(fields).map((k) => ({
      value: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  ];
}
