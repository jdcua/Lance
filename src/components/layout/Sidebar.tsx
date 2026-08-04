import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  Upload,
  Package,
  Camera,
  Monitor,
  Clapperboard,
  Code2,
  Palette,
  Brain,
  Film,
  Paintbrush,
  Box,
  Gamepad2,
  Layers,
  Target,
  MessageCircle,
  FileEdit,
  Music,
  FileAudio,
  Building2,
  ClipboardList,
  Languages,
  Search,
  BarChart4,
  Settings2,
  Briefcase,
  CheckSquare,
  Calendar,
  Calculator,
  Pen,
  Bell,
} from 'lucide-react';
import { useStore } from '../../store';
import { getArchetype } from '../../archetypes';
import type { SidebarItemDef } from '../../archetypes';
import { getShortcutModifierLabel } from '../../utils/shortcuts';

const ICON_MAP: Record<string, any> = {
  FileText, PenLine, FolderKanban, Clock, Receipt, Users, BarChart3, Lightbulb,
  Settings, Trophy, LayoutDashboard, Upload, Package, Camera, Monitor,
  Clapperboard, Code2, Palette, Brain, Film, Paintbrush, Box, Gamepad2,
  Layers, Target, MessageCircle, FileEdit, Music, FileAudio, Building2,
  ClipboardList, Languages, Search, BarChart4, Settings2, Briefcase,
  CheckSquare, Calendar, Calculator, Pen, Sparkles, Bell,
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lance:sidebar-collapsed') === 'true');
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const isExpanded = (!collapsed || hovered) && !isMobile;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { isLicensed, proposals, projects, invoices, allAttachments, pendingFollowUps, profile, archetypeAppliedAt } = useStore((s) => ({
    isLicensed: s.isLicensed,
    proposals: s.proposals,
    projects: s.projects,
    invoices: s.invoices,
    allAttachments: s.allAttachments,
    pendingFollowUps: s.pendingFollowUps,
    profile: s.profile,
    archetypeAppliedAt: s.archetypeAppliedAt,
  }));

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('lance:sidebar-collapsed', String(next));
  };

  const archetype = useMemo(() => getArchetype(profile?.profession || 'default'), [profile?.profession, archetypeAppliedAt]);

  const badgeMap: Record<string, number> = useMemo(() => ({
    draftProposals: proposals.filter((p) => p.status === 'draft').length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    unpaidInvoices: invoices.filter((i) => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue').length,
    totalAssets: allAttachments.length,
    proposalFollowUps: pendingFollowUps.filter((f) => f.entity_type === 'proposal').length,
    invoiceFollowUps: pendingFollowUps.filter((f) => f.entity_type === 'invoice').length,
  }), [proposals, projects, invoices, allAttachments, pendingFollowUps]);

  const sidebarItems = useMemo(() => {
    const items = archetype.sidebar || [];
    // Group items into labeled groups based on archetype order
    const groups: { label: string; items: SidebarItemDef[] }[] = [];
    const groupLabels = ['WORK', 'MANAGE', 'ANALYZE'];
    const splitSize = Math.ceil(items.length / 3);

    for (let i = 0; i < items.length; i += splitSize) {
      groups.push({
        label: groupLabels[Math.floor(i / splitSize)] || 'MORE',
        items: items.slice(i, i + splitSize),
      });
    }
    return { items, groups };
  }, [archetype]);

  return (
    <aside
      className={`${isExpanded ? 'w-[220px]' : 'w-[52px]'} h-full flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-shrink-0 transition-[width] duration-200`}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 px-3 h-[56px] border-b border-[var(--border-color)]">
        {isExpanded && (
          <>
            <BrandLogo size={20} className="text-[var(--accent)]" />
            <span className="font-semibold text-sm text-[var(--text-primary)] flex-1" style={{ fontFamily: "'Syne', sans-serif" }}>Lance</span>
          </>
        )}
        {!isExpanded && <BrandLogo size={20} className="text-[var(--accent)] mx-auto" />}
        {isExpanded && (
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors mb-1 ${
              !isExpanded ? 'justify-center px-0' : ''
            } ${
              isActive
                ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
            }`
          }
          style={{ fontFamily: "'Syne', sans-serif" }}
          title="Dashboard"
        >
          <LayoutDashboard size={16} />
          {isExpanded && 'Dashboard'}
        </NavLink>

        {sidebarItems.groups.map((group) => (
          <div key={group.label} className="mb-4">
            {isExpanded && (
              <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = ICON_MAP[item.icon] || Package;
              const badgeKey = item.path === '/proposals' ? 'draftProposals'
                : item.path === '/projects' ? 'activeProjects'
                : item.path === '/invoices' ? 'unpaidInvoices'
                : item.path === '/assets' ? 'totalAssets'
                : null;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                      isActive
                        ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
                    }`
                  }
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  title={item.label}
                >
                  <Icon size={16} />
                  {isExpanded && <span className="flex-1">{item.label}</span>}
                  {isExpanded && item.badge === 'new' && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">New</span>
                  )}
                  {isExpanded && item.badge === 'alert' && badgeMap.unpaidInvoices > 0 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">{badgeMap.unpaidInvoices}</span>
                  )}
                  {isExpanded && badgeKey && badgeMap[badgeKey] > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      badgeKey === 'unpaidInvoices' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    }`}>
                      {badgeMap[badgeKey]}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* Always-available items */}
        <div className="mb-4">
          {isExpanded && (
            <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
              MORE
            </p>
          )}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('lance:open-import'))}
            className={`w-full flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent ${!isExpanded ? 'justify-center px-0' : ''}`}
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Import"
          >
            <Upload size={16} />
            {isExpanded && 'Import'}
          </button>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Search"
          >
            <Search size={16} />
            {isExpanded && <span className="flex-1">Search</span>}
          </NavLink>
          <NavLink
            to="/follow-ups"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Follow-ups"
          >
            <Bell size={16} />
            {isExpanded && <span className="flex-1">Follow-ups</span>}
            {isExpanded && pendingFollowUps.length > 0 && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
                {pendingFollowUps.length}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/achievements"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Achievements"
          >
            <Trophy size={16} />
            {isExpanded && 'Achievements'}
          </NavLink>
          <NavLink
            to="/archetype"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Archetype"
          >
            <Sparkles size={16} />
            {isExpanded && 'Archetype'}
          </NavLink>
        </div>
      </nav>

      <div className="border-t border-[var(--border-color)]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
              isActive
                ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
            }`
          }
          style={{ fontFamily: "'Syne', sans-serif" }}
          title="Settings"
        >
          <Settings size={16} />
          {isExpanded && 'Settings'}
        </NavLink>
        {isExpanded && (
          <div className="px-4 py-2">
            <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
              <span className="font-medium">{getShortcutModifierLabel()}1</span>-8 navigate &middot; <span className="font-medium">{getShortcutModifierLabel()}N</span> new
            </p>
            {isLicensed && (
              <p className="text-[10px] text-[var(--accent)] font-medium mt-1 flex items-center gap-1">
                <Sparkles size={10} />
                Licensed
              </p>
            )}
          </div>
        )}
        {!isExpanded && (
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center h-[36px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}
