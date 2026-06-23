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
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      file,
      fileType: 'spreadsheet',
      detectedEntity: 'unknown',
      confidence: 0,
      preview: { summary: 'Empty spreadsheet — no sheets found.' },
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
      preview: { summary: 'Empty spreadsheet — no data rows found.' },
    };
  }

  const truncated = jsonData.length > MAX_ROWS;
  const limitedData = jsonData.slice(0, MAX_ROWS);

  const headers = Object.keys(limitedData[0]);

  const rows = limitedData.slice(0, MAX_PREVIEW_ROWS).map(row => {
    const stringRow: Record<string, string> = {};
    for (const key of headers) {
      stringRow[key] = sanitizeCell(row[key]);
    }
    return stringRow;
  });

  const { type: detectedEntity, confidence } = classifySpreadsheet(headers);
  const columnMapping = suggestColumnMapping(headers, detectedEntity);

  let summary = confidence >= 0.25
    ? `Detected: ${entityTypeLabel(detectedEntity)} — ${limitedData.length} row${limitedData.length !== 1 ? 's' : ''} found with ${headers.length} columns`
    : `${limitedData.length} row${limitedData.length !== 1 ? 's' : ''} with ${headers.length} columns — could not confidently classify`;

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
