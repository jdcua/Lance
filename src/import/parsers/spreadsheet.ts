/**
 * Spreadsheet parser — handles .xlsx and .csv files using SheetJS.
 * Extracts headers, rows, classifies content, and suggests column mappings.
 */

import * as XLSX from 'xlsx';
import type { ImportDetection } from '../../types';
import { classifySpreadsheet, suggestColumnMapping, entityTypeLabel } from '../classifier';

const MAX_PREVIEW_ROWS = 50;

export async function parseSpreadsheet(file: File): Promise<ImportDetection> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
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

  // Extract headers from first row keys
  const headers = Object.keys(jsonData[0]);

  // Convert all values to strings for the preview
  const rows = jsonData.slice(0, MAX_PREVIEW_ROWS).map(row => {
    const stringRow: Record<string, string> = {};
    for (const key of headers) {
      stringRow[key] = String(row[key] ?? '');
    }
    return stringRow;
  });

  // Classify
  const { type: detectedEntity, confidence } = classifySpreadsheet(headers);

  // Suggest column mapping
  const columnMapping = suggestColumnMapping(headers, detectedEntity);

  const summary = confidence >= 0.25
    ? `Detected: ${entityTypeLabel(detectedEntity)} — ${jsonData.length} row${jsonData.length !== 1 ? 's' : ''} found with ${headers.length} columns`
    : `${jsonData.length} row${jsonData.length !== 1 ? 's' : ''} with ${headers.length} columns — could not confidently classify`;

  return {
    file,
    fileType: 'spreadsheet',
    detectedEntity,
    confidence,
    preview: {
      headers,
      rows,
      summary,
      rowCount: jsonData.length,
    },
    columnMapping,
  };
}
