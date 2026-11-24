import { describe, expect, it, vi, afterEach } from 'vitest';
import { getShortcutModifierLabel } from '../utils/shortcuts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getShortcutModifierLabel', () => {
  it('uses the command symbol on Apple platforms', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' });
    expect(getShortcutModifierLabel()).toBe('\u2318');
  });

  it('uses Ctrl on non-Apple platforms', () => {
    vi.stubGlobal('navigator', { platform: 'Linux x86_64' });
    expect(getShortcutModifierLabel()).toBe('Ctrl');
  });
});
