import { describe, it, expect } from 'vitest';
import { tallyImport } from './ImportModal';

describe('tallyImport', () => {
  it('counts a file with records as imported', () => {
    const tally = { imported: 0, skipped: 0 };
    expect(tallyImport(3, tally)).toBe('imported');
    expect(tally).toEqual({ imported: 1, skipped: 0 });
  });

  it('logs a zero-record file as skipped, never imported', () => {
    // The regression: a spreadsheet mapping to zero line items still logged
    // status 'imported' and incremented the success count + toast.
    const tally = { imported: 0, skipped: 2 };
    expect(tallyImport(0, tally)).toBe('skipped');
    expect(tally).toEqual({ imported: 0, skipped: 3 });
  });
});
