import { describe, it, expect } from 'vitest';
import { matchScore, rankSearch } from './searchRank';

describe('search ranking', () => {
  it('orders exact > prefix > word > substring', () => {
    const items = ['my proposal draft', 'proposal', 'a new proposal for acme'];
    const ranked = rankSearch(items, (s: string) => [s], 'proposal');
    expect(ranked[0]).toBe('proposal');
    expect(ranked).toHaveLength(3);
  });

  it('requires every token (AND semantics, order-free)', () => {
    expect(matchScore(['Campaign Q3'], 'q3 campaign')).toBeGreaterThan(0);
    expect(matchScore(['Campaign Q3'], 'q3 missing')).toBe(0);
  });

  it('tolerates typos in longer tokens only', () => {
    expect(matchScore(['client'], 'clent')).toBeGreaterThan(0);
    expect(matchScore(['client'], 'xyz')).toBe(0);
    // short tokens stay strict to avoid noise
    expect(matchScore(['cat'], 'car')).toBe(0);
  });

  it('returns nothing for empty queries and caps results', () => {
    const items = Array.from({ length: 50 }, (_, i) => `item ${i} test`);
    expect(rankSearch(items, (s: string) => [s], '')).toEqual([]);
    expect(rankSearch(items, (s: string) => [s], 'test')).toHaveLength(25);
    expect(rankSearch(items, (s: string) => [s], 'test', 5)).toHaveLength(5);
  });

  it('searches across multiple fields', () => {
    const rows = [
      { name: 'Ava', company: 'Fern & Field' },
      { name: 'Bob', company: 'Avery Goods' },
    ];
    expect(rankSearch(rows, (r: { name: string; company: string }) => [r.name, r.company], 'avery')).toEqual([rows[1]]);
  });

  it('folds diacritics so accented names match plain queries', () => {
    expect(matchScore(['Café Müller'], 'cafe muller')).toBeGreaterThan(0);
    expect(matchScore(['Cafe Muller'], 'café müller')).toBeGreaterThan(0);
    expect(matchScore(['Montréal'], 'montreal')).toBe(1);
  });
});
