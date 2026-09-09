import { describe, it, expect } from 'vitest';
import { autoMapColumns, mapRowToClient } from '../../utils/clientImport';

describe('competitor CSV import mapping', () => {
  it('maps Bonsai-style split names', () => {
    const mapping = autoMapColumns(
      ['First name', 'Last name', 'Email', 'Phone', 'Company'],
      'bonsai',
    );
    expect(mapping['First name']).toBe('name');
    expect(mapping['Last name']).toBe('name');
    expect(mapping['Email']).toBe('email');
    expect(mapping['Phone']).toBe('phone');
    expect(mapping['Company']).toBe('company');
  });

  it('maps HoneyBook and FreshBooks variants', () => {
    const hb = autoMapColumns(
      ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Company Name'],
      'honeybook',
    );
    expect(hb['First Name']).toBe('name');
    expect(hb['Email Address']).toBe('email');
    expect(hb['Company Name']).toBe('company');

    const fb = autoMapColumns(
      ['First Name', 'Last Name', 'Email', 'Organization', 'Home Phone'],
      'freshbooks',
    );
    expect(fb['First Name']).toBe('name');
    expect(fb['Organization']).toBe('company');
    expect(fb['Home Phone']).toBe('phone');
  });

  it('maps Wave customer exports', () => {
    const mapping = autoMapColumns(['Customer Name', 'Email Address'], 'wave');
    expect(mapping['Customer Name']).toBe('name');
    expect(mapping['Email Address']).toBe('email');
  });

  it('joins split names in column order and drops empties', () => {
    const row = mapRowToClient(
      { 'First name': 'Jane', 'Last name': 'Smith', Email: 'j@x.com', Notes: '' },
      0,
      { 'First name': 'name', 'Last name': 'name', Email: 'email', Notes: 'notes' },
    );
    expect(row.name).toBe('Jane Smith');
    expect(row.email).toBe('j@x.com');
    expect(row.__rowIndex).toBe(0);
  });

  it('ignores unknown sources gracefully', () => {
    const mapping = autoMapColumns(['Name', 'Email'], 'not-a-vendor');
    expect(mapping).toEqual({ Name: 'name', Email: 'email' });
  });
});
