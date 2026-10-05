import { describe, it, expect } from 'vitest';
import { compareVersions } from './useAutoUpdater';

/**
 * Rollback protection for the auto-updater.
 *
 * The updater manifest carries no signature of its own; only the bundles do, and
 * those signatures are genuine. So a manifest advertising an OLD version would
 * pass signature verification while rolling a client back onto a build with a
 * known vulnerability. The client keeps a high-water mark and refuses anything
 * below it.
 */

describe('compareVersions', () => {
  it('orders plain numeric versions', () => {
    expect(compareVersions('0.9.9', '0.9.10')).toBeLessThan(0);
    expect(compareVersions('0.9.10', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareVersions('0.9.9', '0.9.9')).toBe(0);
  });

  it('treats a pre-release as LOWER than its release', () => {
    // This is the current shipped state: 0.9.9-1 is a pre-release of 0.9.9.
    expect(compareVersions('0.9.9-1', '0.9.9')).toBeLessThan(0);
    expect(compareVersions('0.9.9', '0.9.9-1')).toBeGreaterThan(0);
  });

  it('orders pre-release counters numerically, not lexically', () => {
    // Lexically '0.9.9-10' < '0.9.9-2', which would let a rollback through.
    expect(compareVersions('0.9.9-10', '0.9.9-2')).toBeGreaterThan(0);
    expect(compareVersions('0.9.9-2', '0.9.9-10')).toBeLessThan(0);
  });

  it('pads missing segments', () => {
    expect(compareVersions('1', '1.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1')).toBeGreaterThan(0);
  });

  it('rejects the exact case it exists to catch', () => {
    // The endpoint served 0.9.2 to installs running 0.9.9-1 during the audit.
    expect(compareVersions('0.9.2', '0.9.9-1')).toBeLessThan(0);
  });

  it('survives junk without throwing', () => {
    expect(() => compareVersions('', '0.9.9')).not.toThrow();
    expect(() => compareVersions('not-a-version', '0.9.9')).not.toThrow();
    expect(() => compareVersions('0.9.9', undefined as unknown as string)).not.toThrow();
  });

  it('is not fooled by a v prefix', () => {
    expect(compareVersions('v0.9.10', '0.9.9')).toBeGreaterThan(0);
  });
});
