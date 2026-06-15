import { NavLink, useLocation } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';
import {
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
  Trophy,
  LayoutDashboard,
} from 'lucide-react';
import { useStore } from '../../store';

const navGroups = [
  {
    label: 'WIN WORK',
    items: [
      { to: '/proposals', icon: FileText, label: 'Proposals', badgeKey: 'draftProposals' },
      { to: '/contracts', icon: PenLine, label: 'Contracts', badgeKey: null },
    ],
  },
  {
    label: 'RUN PROJECTS',
    items: [
      { to: '/projects', icon: FolderKanban, label: 'Projects', badgeKey: 'activeProjects' },
      { to: '/time', icon: Clock, label: 'Time', badgeKey: null },
    ],
  },
  {
    label: 'GET PAID',
    items: [
      { to: '/invoices', icon: Receipt, label: 'Invoices', badgeKey: 'unpaidInvoices' },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { to: '/clients', icon: Users, label: 'Clients', badgeKey: null },
      { to: '/finance', icon: BarChart3, label: 'Finance', badgeKey: null },
      { to: '/insights', icon: Lightbulb, label: 'Insights', badgeKey: null },
    ],
  },
];

export default function Sidebar() {
  const isLicensed = useStore((s) => s.isLicensed);
  const proposals = useStore((s) => s.proposals);
  const projects = useStore((s) => s.projects);
  const invoices = useStore((s) => s.invoices);

  const draftProposals = proposals.filter((p) => p.status === 'draft').length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const unpaidInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').length;

  const badgeMap: Record<string, number> = { draftProposals, activeProjects, unpaidInvoices };

  return (
    <aside className="w-[220px] h-full flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-shrink-0">
      <div className="flex items-center gap-2 px-4 h-[56px] border-b border-[var(--border-color)]">
        <BrandLogo size={20} className="text-[var(--accent)]" />
        <span className="font-semibold text-sm text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>Lance</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors mb-1 ${
              isActive
                ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
            }`
          }
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

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
                <span className="flex-1">{item.label}</span>
                {item.badgeKey && badgeMap[item.badgeKey] > 0 && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    item.badgeKey === 'unpaidInvoices' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  }`}>
                    {badgeMap[item.badgeKey]}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="mb-4">
          <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
            MORE
          </p>
          <NavLink
            to="/achievements"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${
                isActive
                  ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <Trophy size={16} />
            Achievements
          </NavLink>
        </div>
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
