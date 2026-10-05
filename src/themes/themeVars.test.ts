import { describe, it, expect } from 'vitest';
import { applyTheme, getTheme } from './themes';

function vars() {
  const cs = getComputedStyle(document.documentElement);
  return {
    secondary: cs.getPropertyValue('--text-secondary').trim(),
    tertiary: cs.getPropertyValue('--text-tertiary').trim(),
    border: cs.getPropertyValue('--border-color').trim(),
  };
}

describe('applyTheme palette trio (light + dark)', () => {
  it('keeps secondary/tertiary/border present in light mode', () => {
    document.documentElement.classList.remove('dark');
    applyTheme(getTheme('default'));
    const v = vars();
    expect(v.secondary).not.toBe('');
    expect(v.tertiary).not.toBe('');
    expect(v.border).not.toBe('');
  });

  it('keeps the trio present in dark mode', () => {
    document.documentElement.classList.add('dark');
    applyTheme(getTheme('default'));
    const v = vars();
    expect(v.secondary).not.toBe('');
    expect(v.tertiary).not.toBe('');
    expect(v.border).not.toBe('');
    document.documentElement.classList.remove('dark');
  });

  it('contrast boost sets the trio, unsetting restores the palette', () => {
    document.documentElement.classList.remove('dark');
    applyTheme(getTheme('default'));
    const before = vars();
    document.documentElement.classList.add('contrast-high');
    applyTheme(getTheme('default'));
    const boosted = vars();
    expect(boosted.secondary).not.toBe('');
    document.documentElement.classList.remove('contrast-high');
    applyTheme(getTheme('default'));
    // Re-applying without the class rewrites the palette; the trio must
    // come back exactly, never wiped.
    expect(vars()).toEqual(before);
  });
});
