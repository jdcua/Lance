import { useLocation } from 'react-router-dom';
import { Menu, Search, Timer } from 'lucide-react';
import { getShortcutModifierLabel } from '../../utils/shortcuts';
import { commands } from '../../lib/commands';
import { setMobileNavOpen, useMobileNavOpen } from '../../lib/mobileNav';

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
  '/pipeline': 'Pipeline',
  '/assets': 'Assets',
  '/search': 'Search',
  '/archetype': 'Archetype',
};

export default function Topbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Lance';
  const mod = getShortcutModifierLabel();
  const mobileNavOpen = useMobileNavOpen();

  return (
    <div className="h-[52px] glass border-b-0 flex items-center gap-2.5 pl-2 pr-4 lg:px-4 flex-shrink-0 print:hidden">
      <button
        type="button"
        data-mobile-nav-trigger
        onClick={() => setMobileNavOpen(true)}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-[0.96] transition-[background-color,color,transform] lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        aria-controls="mobile-navigation"
      >
        <Menu size={18} />
      </button>
      <nav className="flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Breadcrumb">
        <span className="text-[var(--text-secondary)] flex-shrink-0">Workspace</span>
        <span className="text-[var(--text-tertiary)] flex-shrink-0">/</span>
        <h1 className="font-semibold text-[13px] text-[var(--text-primary)] truncate">{title}</h1>
      </nav>

      <div className="flex-1" />

      <div className="hidden sm:block min-w-[200px]">
        <button
          onClick={() => commands.dispatch('lance:open-command')}
          className="flex w-full items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-sm pl-2.5 pr-1.5 py-1.5 transition-colors"
          title={`Search and commands (${mod}K)`}
        >
          <Search size={13} />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-color)] border-b-2 rounded-[5px] px-1.5 py-0.5">
            {mod}K
          </kbd>
        </button>
      </div>

      <button
        onClick={() => commands.dispatch('lance:toggle-timer')}
        className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] rounded-sm px-2.5 py-1.5 transition-colors"
        title={`Toggle timer (${mod}⇧T)`}
      >
        <Timer size={14} />
        <span className="hidden md:inline">Timer</span>
      </button>
    </div>
  );
}
