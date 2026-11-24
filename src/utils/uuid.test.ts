import { describe, it, expect } from 'vitest';
import { safeRandomUUID } from './uuid';

describe('safeRandomUUID', () => {
  it('produces v4-shaped ids', () => {
    const id = safeRandomUUID();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => safeRandomUUID()));
    expect(ids.size).toBe(1000);
  });
});
