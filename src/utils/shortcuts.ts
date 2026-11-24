export function getShortcutModifierLabel(): string {
  if (navigator.platform.toUpperCase().includes('MAC')) return '\u2318';
  return 'Ctrl';
}

export function formatShortcutCombo(keys: string[]): string {
  const modifier = getShortcutModifierLabel();
  return [modifier, ...keys].join('');
}
