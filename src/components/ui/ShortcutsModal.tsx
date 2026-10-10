import { useStore } from '../../store';
import { getArchetype } from '../../archetypes';
import type { SidebarItemDef } from '../../archetypes';
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
  const profile = useStore((s) => s.profile);
  const config = getArchetype(profile?.profession || 'default');
  const items = config.sidebar.slice(0, 8).map((s: SidebarItemDef, i: number) => ({
    label: s.label.charAt(0).toUpperCase() + s.label.slice(1),
    num: i + 1,
  }));
  if (items.length === 0) return null;
  return (
    <div className="pt-2 border-t border-[var(--border-color)]">
      <p className="text-[10px] text-[var(--text-tertiary)] text-center">
        {items.map((item, i) => (
          <span key={item.num}>
            {item.label} = {getShortcutModifierLabel()}
            {item.num}
            {i < items.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
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
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.6px] mb-1.5">
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
