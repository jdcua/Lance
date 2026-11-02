/**
 * ColumnMapper · Interactive column mapping UI for spreadsheet imports.
 * Shows source columns mapped to Lance entity fields with dropdowns.
 */

import { useMemo } from 'react';
import { Check, ArrowRight, AlertCircle } from 'lucide-react';
import type { DetectedEntityType } from '../../types';
import { getAvailableFields } from '../../import/classifier';

interface ColumnMapperProps {
  headers: string[];
  columnMapping: Record<string, string>;
  entityType: DetectedEntityType;
  previewRows?: Record<string, string>[];
  onChange: (mapping: Record<string, string>) => void;
}

export default function ColumnMapper({
  headers,
  columnMapping,
  entityType,
  previewRows,
  onChange,
}: ColumnMapperProps) {
  const availableFields = useMemo(() => getAvailableFields(entityType), [entityType]);

  const usedFields = useMemo(() => {
    const used = new Set<string>();
    for (const field of Object.values(columnMapping)) {
      if (field) used.add(field);
    }
    return used;
  }, [columnMapping]);

  const handleFieldChange = (header: string, field: string) => {
    onChange({ ...columnMapping, [header]: field });
  };

  const mappedCount = Object.values(columnMapping).filter(v => v && v.length > 0).length;
  const totalFields = availableFields.filter(f => f.value).length;

  return (
    <div className="space-y-3">
      {/* Mapping summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
          Column Mapping
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {mappedCount} of {headers.length} columns mapped
          {mappedCount > 0 && totalFields > 0 && (
            <span className="text-[var(--accent-ink,var(--accent))] ml-1">
              → {Math.min(mappedCount, totalFields)} field{Math.min(mappedCount, totalFields) !== 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>

      {/* Mapping rows */}
      <div className="border border-[var(--border-color)] rounded-[8px] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_32px_1fr] items-center px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Source Column</span>
          <span />
          <span className="text-[10px] font-semibold text-[var(--text-secondary)]">Lance Field</span>
        </div>

        {headers.map((header, idx) => {
          const mappedField = columnMapping[header] || '';
          const isMatched = mappedField.length > 0;
          const sampleValues = previewRows
            ?.slice(0, 3)
            .map(row => row[header])
            .filter(v => v && v.trim().length > 0)
            .slice(0, 2);

          return (
            <div
              key={header}
              className={`grid grid-cols-[1fr_32px_1fr] items-center px-3 py-2 transition-colors ${
                idx < headers.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              } ${isMatched ? 'bg-[var(--accent-bg)]/30' : 'hover:bg-[var(--bg-secondary)]/50'}`}
            >
              {/* Source column name + sample values */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {isMatched ? (
                    <Check size={12} className="text-[var(--accent-ink,var(--accent))] flex-shrink-0" />
                  ) : (
                    <AlertCircle size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  )}
                  <span className={`text-xs truncate ${isMatched ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                    {header}
                  </span>
                </div>
                {sampleValues && sampleValues.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 ml-5">
                    {sampleValues.map((val, vi) => (
                      <span key={vi} className="text-[9px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded truncate max-w-[100px]">
                        {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight size={12} className={isMatched ? 'text-[var(--accent-ink,var(--accent))]' : 'text-[var(--text-tertiary)] opacity-30'} />
              </div>

              {/* Lance field dropdown */}
              <select aria-label="Mappedfield"
                value={mappedField}
                onChange={(e) => handleFieldChange(header, e.target.value)}
                className={`w-full px-2 py-1.5 text-xs border rounded-[6px] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 appearance-none cursor-pointer ${
                  isMatched
                    ? 'border-[var(--accent)]/30 bg-[var(--bg-card)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-tertiary)]'
                }`}
              >
                {availableFields.map((field) => {
                  const isUsedByOther = !!(field.value && usedFields.has(field.value) && columnMapping[header] !== field.value);
                  return (
                    <option key={field.value} value={field.value} disabled={isUsedByOther || undefined}>
                      {field.label}{isUsedByOther ? ' (already mapped)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>

      {/* Preview table */}
      {previewRows && previewRows.length > 0 && mappedCount > 0 && (
        <div className="mt-3">
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium mb-2 block">
            Preview (first {Math.min(previewRows.length, 5)} rows)
          </span>
          <div className="border border-[var(--border-color)] rounded-[8px] overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  {Object.entries(columnMapping)
                    .filter(([, field]) => field)
                    .map(([header, field]) => (
                      <th key={header} className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--accent-ink,var(--accent))] whitespace-nowrap border-b border-[var(--border-color)]">
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className={ri < Math.min(previewRows.length, 5) - 1 ? 'border-b border-[var(--border-color)]' : ''}>
                    {Object.entries(columnMapping)
                      .filter(([, field]) => field)
                      .map(([header]) => (
                        <td key={header} className="px-3 py-1.5 text-[var(--text-primary)] truncate max-w-[150px]">
                          {row[header] || '--'}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
