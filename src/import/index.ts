/**
 * Import system orchestrator.
 * Routes files to the correct parser based on extension.
 */

import type { ImportDetection } from '../types';
import { parseSpreadsheet } from './parsers/spreadsheet';
import { parseDocument } from './parsers/document';
import { parseImage } from './parsers/image';

const SPREADSHEET_EXTS = ['xlsx', 'csv', 'xls'];
const DOCUMENT_EXTS = ['pdf', 'docx', 'doc'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

const ACCEPTED_EXTENSIONS = [...SPREADSHEET_EXTS, ...DOCUMENT_EXTS, ...IMAGE_EXTS];

const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
];

export const ACCEPTED_EXTENSIONS_STRING = ACCEPTED_EXTENSIONS.map(e => `.${e}`).join(',');

function getFileExtension(filename: string): string {
  return (filename.split('.').pop() || '').toLowerCase();
}

/**
 * Check if a file has a supported extension.
 */
export function isFileSupported(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext);
}

/**
 * Process a batch of files through the import pipeline.
 * Returns an ImportDetection for each file.
 */
export async function processImportFiles(
  files: File[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<ImportDetection[]> {
  const results: ImportDetection[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);

    if (!isFileSupported(file)) {
      results.push({
        file,
        fileType: 'document',
        detectedEntity: 'unknown',
        confidence: 0,
        preview: {
          summary: `Unsupported file type: .${getFileExtension(file.name)}`,
        },
      });
      continue;
    }

    try {
      const ext = getFileExtension(file.name);

      if (SPREADSHEET_EXTS.includes(ext)) {
        results.push(await parseSpreadsheet(file));
      } else if (DOCUMENT_EXTS.includes(ext)) {
        results.push(await parseDocument(file));
      } else if (IMAGE_EXTS.includes(ext)) {
        results.push(await parseImage(file));
      }
    } catch (err) {
      results.push({
        file,
        fileType: 'document',
        detectedEntity: 'unknown',
        confidence: 0,
        preview: {
          summary: `Error processing ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      });
    }
  }

  return results;
}

/**
 * Filter files from a drag event's DataTransfer.
 */
function extractFilesFromDrop(e: DragEvent): File[] {
  const files: File[] = [];
  if (e.dataTransfer?.files) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      files.push(e.dataTransfer.files[i]);
    }
  }
  return files;
}
