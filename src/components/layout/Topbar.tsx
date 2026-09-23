import { useLocation } from 'react-router-dom';
import { Search, Timer } from 'lucide-react';
import { getShortcutModifierLabel } from '../../utils/shortcuts';
import Fade from '../motion/Fade';
import Magnetic from '../motion/Magnetic';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/proposals': 'Proposals',
  '/proposals/new': 'New Proposal',
  '/contracts': 'Contracts',
  '/projects': 'Projects',
  '/time': 'Time',
  '/invoices': 'Invoices',
  '/clients': 'Clients',
  '/finance': 'Finance',
  '/insights': 'Insights',
  '/settings': 'Settings',
  '/achievements': 'Achievements',
  '/follow-ups': 'Follow-ups',
  '/assets': 'Assets',
  '/search': 'Search',
  '/archetype': 'Archetype',
};

export default function Topbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Lance';
  const mod = getShortcutModifierLabel();

  return (
    <Fade className="h-[52px] bg-[var(--bg-card)]/85 backdrop-blur-md border-b border-[var(--border-color)] flex items-center gap-3 px-4 flex-shrink-0" y={-10}>
      <nav className="flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Breadcrumb">
        <span className="text-[var(--text-tertiary)] flex-shrink-0">Workspace</span>
        <span className="text-[var(--text-tertiary)] flex-shrink-0">/</span>
        <h1 className="font-semibold text-[var(--text-primary)] truncate">{title}</h1>
      </nav>

      <div className="flex-1" />

      <Magnetic className="hidden sm:block min-w-[200px]">
      <button
        onClick={() => document.dispatchEvent(new CustomEvent('lance:open-command'))}
        className="flex w-full items-center gap-2 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--bg-secondary)]/60 hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[8px] pl-2.5 pr-1.5 py-1.5 transition-colors"
        title={`Search and commands (${mod}K)`}
      >
        <Search size={13} />
        <span className="flex-1 text-left">Search or command…</span>
        <kbd className="text-[10px] font-medium bg-[var(--bg-card)] border border-[var(--border-color)] border-b-2 rounded-[5px] px-1.5 py-0.5">
          {mod}K
        </kbd>
      </button>
      </Magnetic>

      <button
        onClick={() => document.dispatchEvent(new CustomEvent('lance:toggle-timer'))}
        className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] rounded-[8px] px-2.5 py-1.5 transition-colors"
        title={`Toggle timer (${mod}⇧T)`}
      >
        <Timer size={14} />
        <span className="hidden md:inline">Timer</span>
      </button>
    </Fade>
  );
}
