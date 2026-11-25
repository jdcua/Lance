import { describe, it, expect } from 'vitest';
import { escapeCsvFormula, csvCellValue } from '../import/parsers/spreadsheet';

describe('spreadsheet csv helpers', () => {
  it('escapeCsvFormula prefixes formula-like values with apostrophe', () => {
    expect(escapeCsvFormula('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(escapeCsvFormula('+cmd')).toBe(`'+cmd`);
    expect(escapeCsvFormula('-cmd')).toBe(`'-cmd`);
    expect(escapeCsvFormula('@cmd')).toBe(`'@cmd`);
  });

  it('escapeCsvFormula leaves plain text untouched', () => {
    expect(escapeCsvFormula('normal')).toBe('normal');
  });

  it('csvCellValue stringifies numbers', () => {
    expect(csvCellValue(42)).toBe('42');
  });

  it('csvCellValue quotes cells containing commas', () => {
    expect(csvCellValue('a,b')).toBe('"a,b"');
  });

  it('csvCellValue escapes formula-like string cells', () => {
    expect(csvCellValue('=cmd')).toBe(`'=cmd`);
  });
});
