import { getShortcutModifierLabel } from '../../utils/shortcuts';
import Modal from './Modal';

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Find',
    rows: [
      ['K', 'Command palette'],
      ['/', 'This cheatsheet'],
      ['1–8', 'Jump to section'],
    ],
  },
  {
    title: 'Create',
    rows: [
      ['N', 'New item (contextual: proposal, client, invoice…)'],
      ['Shift + L', 'Quick log time'],
    ],
  },
  {
    title: 'System',
    rows: [
      ['Shift + T', 'Start/stop timer'],
      [',', 'Settings'],
      ['Escape', 'Close modal / palette'],
    ],
  },
];

function SectionJumps() {
  return null;
}

/**
 * Keyboard cheatsheet (Cmd/Ctrl+/). Grouped by intent; the section jumps
 * follow the active archetype, so the legend is never stale. Pure surface —
 * no shortcut behavior lives here (see App.tsx keydown handler).
 */
export default function ShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mod = getShortcutModifierLabel();
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mb-1.5">
              {g.title}
            </p>
            <div className="space-y-0.5">
              {g.rows.map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-1.5 rounded-sm hover:bg-[var(--bg-secondary)]"
                >
                  <kbd className="text-[11px] font-mono text-[var(--accent-ink,var(--accent))] bg-[var(--accent-bg)] px-1.5 py-0.5 rounded-[4px]">
                    {mod} + {key}
                  </kbd>
                  <span className="text-xs text-[var(--text-secondary)] text-right ml-4">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <SectionJumps />
      </div>
    </Modal>
  );
}
