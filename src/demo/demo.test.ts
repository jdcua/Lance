import { describe, it, expect } from 'vitest';
import { formatBytes } from './storageProof';
import { isTrial } from './isDemo';

describe('trial storage proof', () => {
  it('formats bytes for humans', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
});

describe('trial detection', () => {
  it('is false on plain desktop path without flags', () => {
    expect(isTrial()).toBe(false);
  });
});
