import type { ImportDetection } from '../../types';
import { classifySpreadsheet, suggestColumnMapping, entityTypeLabel } from '../classifier';
import { MAX_PREVIEW_ROWS } from '../../lib/constants';

const MAX_ROWS = 500;
const MAX_CELL_LENGTH = 1000;

function stripFormulaInjection(value: string): string {
  let trimmed = value.trimStart();
  while (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@')
  ) {
    trimmed = trimmed.slice(1).trimStart();
  }
  return trimmed;
}

/**
 * The WRITE side of the same problem.
 *
 * `stripFormulaInjection` above only runs when importing. But a client's name
 * can arrive with a leading `=` from any route, a CSV import, a paste, a
 * typo, and Lance re-emits that value into the Tax Pack and Year Summary CSVs
 * the user opens in Excel. Quoting the cell is NOT enough: Excel evaluates
 * `="=HYPERLINK(...)"` happily. The mitigation is a leading apostrophe, which
 * Excel treats as "this is text".
 *
 * Exported here so every CSV writer uses one implementation. Used by
 * utils/taxPack.ts and utils/yearSummary.ts.
 */
export function escapeCsvFormula(value: string): string {
  const trimmed = value.trimStart();
  if (/^[=+\-@\t\r]/.test(trimmed)) return `'${value}`;
  return value;
}

/** Quote + formula-escape a cell for CSV output. */
export function csvCellValue(value: string | number): string {
  const raw = typeof value === 'number' ? String(value) : escapeCsvFormula(String(value));
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function sanitizeCell(value: unknown): string {
  const str = String(value ?? '');
  const stripped = stripFormulaInjection(str);
  if (stripped.length > MAX_CELL_LENGTH) {
    return stripped.slice(0, MAX_CELL_LENGTH);
  }
  return stripped;
}

export async function parseSpreadsheet(file: File): Promise<ImportDetection> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  // sheetRows caps the READ, not just the result. MAX_ROWS is applied after
  // sheet_to_json, by which point a 5MB xlsx declaring !ref="A1:XFD1048576"
  // has already made SheetJS materialise ~17 billion cells. Tell the parser the
  // ceiling up front so it never allocates them.
  const workbook = XLSX.read(arrayBuffer, { type: 'array', sheetRows: MAX_ROWS + 1 });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      file,
      fileType: 'spreadsheet',
      detectedEntity: 'unknown',
      confidence: 0,
      preview: { summary: 'Empty spreadsheet · no sheets found.' },
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (jsonData.length === 0) {
    return {
      file,
      fileType: 'spreadsheet',
      detectedEntity: 'unknown',
      confidence: 0,
      preview: { summary: 'Empty spreadsheet · no data rows found.' },
    };
  }

  const truncated = jsonData.length > MAX_ROWS;
  const limitedData = jsonData.slice(0, MAX_ROWS);

  const headers = Object.keys(limitedData[0]);

  const rows = limitedData.slice(0, MAX_PREVIEW_ROWS).map((row) => {
    const stringRow: Record<string, string> = {};
    for (const key of headers) {
      stringRow[key] = sanitizeCell(row[key]);
    }
    return stringRow;
  });

  const { type: detectedEntity, confidence } = classifySpreadsheet(headers);
  const columnMapping = suggestColumnMapping(headers, detectedEntity);

  let summary =
    confidence >= 0.25
      ? `Detected: ${entityTypeLabel(detectedEntity)} · ${limitedData.length} row${limitedData.length !== 1 ? 's' : ''} found with ${headers.length} columns`
      : `${limitedData.length} row${limitedData.length !== 1 ? 's' : ''} with ${headers.length} columns · could not confidently classify`;

  if (truncated) {
    summary += ` (import limited to ${MAX_ROWS} rows)`;
  }

  return {
    file,
    fileType: 'spreadsheet',
    detectedEntity,
    confidence,
    preview: {
      headers,
      rows,
      summary,
      rowCount: limitedData.length,
    },
    columnMapping,
  };
}
