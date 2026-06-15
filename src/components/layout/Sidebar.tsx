import { NavLink, useLocation } from 'react-router-dom';
import {
  ArrowUpDown,
  FileText,
  PenLine,
  FolderKanban,
  Clock,
  Receipt,
  Users,
  BarChart3,
  Lightbulb,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../store';

const navGroups = [
  {
    label: 'WIN WORK',
    items: [
      { to: '/proposals', icon: FileText, label: 'Proposals' },
      { to: '/contracts', icon: PenLine, label: 'Contracts' },
    ],
  },
  {
    label: 'RUN PROJECTS',
    items: [
      { to: '/projects', icon: FolderKanban, label: 'Projects' },
      { to: '/time', icon: Clock, label: 'Time' },
    ],
  },
  {
    label: 'GET PAID',
    items: [
      { to: '/invoices', icon: Receipt, label: 'Invoices' },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { to: '/clients', icon: Users, label: 'Clients' },
      { to: '/finance', icon: BarChart3, label: 'Finance' },
      { to: '/insights', icon: Lightbulb, label: 'Insights' },
    ],
  },
];

export default function Sidebar() {
  const isLicensed = useStore((s) => s.isLicensed);
  return (
    <aside className="w-[220px] h-full flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-shrink-0">
      <div className="flex items-center gap-2 px-4 h-[56px] border-b border-[var(--border-color)]">
        <ArrowUpDown size={20} className="text-[var(--accent)]" />
        <span className="font-semibold text-sm text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>Lance</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${
                    isActive
                      ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
                  }`
                }
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border-color)]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${
              isActive
                ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
            }`
          }
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <Settings size={16} />
          Settings
        </NavLink>
        <div className="px-4 py-2">
          <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
            <span className="font-medium">⌘1</span>-8 navigate &middot; <span className="font-medium">⌘N</span> new
          </p>
          {isLicensed && (
            <p className="text-[10px] text-[var(--accent)] font-medium mt-1 flex items-center gap-1">
              <Sparkles size={10} />
              Licensed
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
