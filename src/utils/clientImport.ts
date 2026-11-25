/**
 * Client CSV import mapping: vendor header aliases, fuzzy auto-map,
 * and split-name combining. Pure and unit tested; the modal handles UI.
 */

export interface CsvRow {
  __rowIndex: number;
  __original: Record<string, string>;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

export const CLIENT_FIELDS: Record<string, string[]> = {
  name: [
    'name',
    'client',
    'client_name',
    'customer',
    'customer_name',
    'contact',
    'full_name',
    'contact_name',
    'client_full_name',
  ],
  email: ['email', 'email_address', 'e_mail', 'mail'],
  phone: ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'home_phone'],
  company: [
    'company',
    'organization',
    'organization_name',
    'org',
    'business',
    'company_name',
    'firm',
  ],
  notes: ['notes', 'note', 'comments', 'comment', 'description', 'remarks'],
};

// First/last name parts (Bonsai, HoneyBook, FreshBooks export these split).
// Multiple headers may map to 'name'; parts join with a space at build time.
export const NAME_PART_ALIASES = [
  'first_name',
  'firstname',
  'fname',
  'given_name',
  'first',
  'last_name',
  'lastname',
  'lname',
  'surname',
  'family_name',
  'last',
];

/**
 * Switching-source presets. Vendor exports use predictable headers; these
 * aliases merge into scoring when a source is picked. Anything unmatched
 * still falls back to fuzzy matching plus manual remap, so unusual
 * exports keep working.
 */
export const SOURCE_PRESETS: Record<string, { label: string; aliases: Record<string, string[]> }> =
  {
    generic: { label: 'Generic CSV', aliases: {} },
    bonsai: {
      label: 'Bonsai',
      aliases: {
        company: ['company_name'],
        notes: ['address', 'city', 'country'],
      },
    },
    honeybook: {
      label: 'HoneyBook',
      aliases: {
        company: ['company_name'],
        phone: ['phone_number', 'mobile_phone'],
      },
    },
    freshbooks: {
      label: 'FreshBooks',
      aliases: {
        company: ['organization', 'organization_name'],
        phone: ['home_phone', 'mobile'],
        notes: ['address', 'notes_internal'],
      },
    },
    wave: {
      label: 'Wave',
      aliases: {
        name: ['customer_name', 'customer'],
        email: ['email_address'],
        company: ['business_name'],
      },
    },
  };

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
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
 * Auto-map vendor headers to client fields:
 * exact match wins, then substring, then fuzzy similarity.
 * Split first/last names always land on 'name' (joined at build time).
 */
function aliasScore(norm: string, alias: string): number {
  if (norm === alias) return 1;
  if (norm.includes(alias) || alias.includes(norm)) return 0.7;
  const similarity = levenshteinSimilarity(norm, alias);
  if (similarity > 0.6) return similarity * 0.5;
  return 0;
}

function bestFieldForHeader(norm: string, sourceAliases: Record<string, string[]>): string {
  let bestField = '';
  let bestScore = 0;
  for (const [field, aliases] of Object.entries(CLIENT_FIELDS)) {
    const allAliases = [...aliases, ...(sourceAliases[field] || [])];
    for (const alias of allAliases) {
      const score = aliasScore(norm, alias);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }
  }
  return bestScore >= 0.4 ? bestField : '';
}

export function autoMapColumns(headers: string[], sourceId = 'generic'): Record<string, string> {
  const mapping: Record<string, string> = {};
  const sourceAliases = SOURCE_PRESETS[sourceId]?.aliases || {};
  for (const header of headers) {
    const norm = normalizeHeader(header);
    if (NAME_PART_ALIASES.includes(norm)) {
      mapping[header] = 'name';
      continue;
    }
    const bestField = bestFieldForHeader(norm, sourceAliases);
    if (bestField) {
      mapping[header] = bestField;
    }
  }
  return mapping;
}

/** Build one client row, joining split name parts in column order. */
export function mapRowToClient(
  row: Record<string, string>,
  rowIndex: number,
  columnMapping: Record<string, string>,
): CsvRow {
  const result: CsvRow = {
    __rowIndex: rowIndex,
    __original: row,
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  };
  const nameParts: string[] = [];
  for (const [srcCol, destField] of Object.entries(columnMapping)) {
    if (!row[srcCol]) continue;
    if (destField === 'name') nameParts.push(row[srcCol]);
    else if (destField === 'email') result.email = row[srcCol];
    else if (destField === 'phone') result.phone = row[srcCol];
    else if (destField === 'company') result.company = row[srcCol];
    else if (destField === 'notes') result.notes = row[srcCol];
  }
  result.name = nameParts.join(' ');
  return result;
}
