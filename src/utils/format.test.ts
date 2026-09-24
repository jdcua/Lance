import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('format hardening', () => {
  it('formats finite amounts normally', () => {
    expect(formatCurrency(1234.5, 'CAD')).toMatch(/1,234\.50/);
    expect(formatCurrency(0, 'USD')).toMatch(/0\.00/);
    expect(formatCurrency(-45.2, 'CAD')).toMatch(/45\.20/);
  });

  it('renders an em dash for non-finite amounts instead of $NaN', () => {
    expect(formatCurrency(NaN, 'CAD')).toBe('—');
    expect(formatCurrency(Infinity, 'CAD')).toBe('—');
    expect(formatCurrency(-Infinity, 'CAD')).toBe('—');
    expect(formatCurrency('12.5' as never, 'CAD')).toBe('—');
    expect(formatCurrency(undefined as never, 'CAD')).toBe('—');
  });
});
