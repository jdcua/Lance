import { describe, it, expect, beforeEach } from 'vitest';
import { seedSampleData } from '../utils/seedData';

describe('seedSampleData guard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resolves instantly when already seeded and writes nothing', async () => {
    localStorage.setItem('lance:seeded', 'true');
    await seedSampleData();
    expect(localStorage.getItem('lance:seeding-at')).toBeNull();
    expect(localStorage.getItem('lance:store:clients')).toBeNull();
  });

  it('shares one run between concurrent callers (no duplicate seeds)', async () => {
    const first = seedSampleData();
    const second = seedSampleData();
    expect(second).toBe(first);
    await first;
    const clients = JSON.parse(localStorage.getItem('lance:store:clients') || '[]');
    const names = clients.map((c: { name: string }) => c.name);
    const jordans = names.filter((n: string) => n === 'Jordan Avery');
    expect(jordans).toHaveLength(1);
    expect(localStorage.getItem('lance:seeded')).toBe('true');
  });

  it('takes over a stale claim instead of waiting forever', async () => {
    localStorage.setItem('lance:seeding-at', String(Date.now() - 120_000));
    await seedSampleData();
    expect(localStorage.getItem('lance:seeded')).toBe('true');
  }, 30000);
});
