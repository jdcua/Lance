/**
 * Global keyboard shortcuts for the app shell.
 *
 * The setting handlers themselves stay pure and live beside the one listener
 * that installs them; App only supplies toggleTimer and the modal setters.
 */
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { commands } from '../lib/commands';

type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;

type ShortcutDeps = {
  navigate: NavigateFunction;
  pathname: string;
  isEditing: () => boolean;
  toggleTimer: () => void;
  setPalette: BoolSetter;
  setQuickLog: BoolSetter;
  setShortcuts: BoolSetter;
};

function handlePaletteAndSettingsShortcut(e: KeyboardEvent, deps: ShortcutDeps): boolean {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    deps.setPalette((prev) => !prev);
    return true;
  }
  if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    if (!deps.isEditing()) deps.navigate('/settings', { replace: true });
    return true;
  }
  return false;
}

function handleModShiftShortcut(e: KeyboardEvent, deps: ShortcutDeps): boolean {
  if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return false;
  if (e.key === 'T' || e.key === 't') {
    e.preventDefault();
    deps.toggleTimer();
    return true;
  }
  if (e.key === 'L' || e.key === 'l') {
    e.preventDefault();
    deps.setQuickLog(true);
    return true;
  }
  return false;
}

type NewShortcutCommand =
  | 'lance:add-client'
  | 'lance:add-invoice'
  | 'lance:add-project'
  | 'lance:add-time'
  | 'lance:add-contract'
  | 'lance:add-expense';

const NEW_SHORTCUT_COMMANDS: Array<[string, NewShortcutCommand]> = [
  ['/clients', 'lance:add-client'],
  ['/invoices', 'lance:add-invoice'],
  ['/projects', 'lance:add-project'],
  ['/time', 'lance:add-time'],
  ['/contracts', 'lance:add-contract'],
  ['/finance', 'lance:add-expense'],
];

function handleNewShortcut(e: KeyboardEvent, pathname: string, navigate: NavigateFunction): void {
  if (pathname.startsWith('/proposals')) {
    e.preventDefault();
    navigate('/proposals/new');
    return;
  }
  for (const [prefix, command] of NEW_SHORTCUT_COMMANDS) {
    if (pathname.startsWith(prefix)) {
      e.preventDefault();
      commands.dispatch(command);
      return;
    }
  }
}

function navigateToNumberedPath(e: KeyboardEvent, navigate: NavigateFunction): void {
  if (e.shiftKey || e.key < '1' || e.key > '8') return;
  e.preventDefault();
  const paths = [
    '/',
    '/clients',
    '/projects',
    '/invoices',
    '/contracts',
    '/finance',
    '/insights',
    '/settings',
  ];
  const path = paths[parseInt(e.key) - 1];
  if (path) navigate(path);
}

function handleNonEditingShortcut(e: KeyboardEvent, deps: ShortcutDeps): void {
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.key === '/' || e.key === '?') {
    e.preventDefault();
    deps.setShortcuts((prev) => !prev);
    return;
  }
  if (e.key === 'n') {
    handleNewShortcut(e, deps.pathname, deps.navigate);
    return;
  }
  navigateToNumberedPath(e, deps.navigate);
}

type KeyboardShortcutDeps = {
  toggleTimer: () => void;
  setPalette: BoolSetter;
  setQuickLog: BoolSetter;
  setShortcuts: BoolSetter;
};

export function useKeyboardShortcuts({
  toggleTimer,
  setPalette,
  setQuickLog,
  setShortcuts,
}: KeyboardShortcutDeps): void {
  const navigate = useNavigate();
  const location = useLocation();

  const isEditing = useCallback((): boolean => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    if (
      document.activeElement?.closest('[contenteditable="true"]') ||
      document.activeElement?.closest('.tiptap')
    )
      return true;
    return false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const deps: ShortcutDeps = {
        navigate,
        pathname: location.pathname,
        isEditing,
        toggleTimer,
        setPalette,
        setQuickLog,
        setShortcuts,
      };
      if (handlePaletteAndSettingsShortcut(e, deps)) return;
      if (handleModShiftShortcut(e, deps)) return;
      if (isEditing()) return;
      handleNonEditingShortcut(e, deps);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location, isEditing, toggleTimer, setPalette, setQuickLog, setShortcuts]);
}
