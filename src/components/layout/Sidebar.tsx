import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../../store';
import { trialDaysRemaining } from '../../lib/trial';
import { getArchetype } from '../../archetypes';
import type { SidebarItemDef } from '../../archetypes';
import { getShortcutModifierLabel } from '../../utils/shortcuts';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, PenLine, FolderKanban, Clock, Receipt, Users, BarChart3, Lightbulb,
  Settings, Trophy, LayoutDashboard, Upload, Package, Camera, Monitor,
  Clapperboard, Code2, Palette, Brain, Film, Paintbrush, Box, Gamepad2,
  Layers, Target, MessageCircle, FileEdit, Music, FileAudio, Building2,
  ClipboardList, Languages, Search, BarChart4, Settings2, Briefcase,
  CheckSquare, Calendar, Calculator, Pen, Sparkles, Bell, ChevronDown, ChevronUp,
};

// localStorage keys for progressive disclosure.
const SIDEBAR_FULL_KEY = 'lance:sidebar-full';
const SIDEBAR_VISITED_KEY = 'lance:sidebar-visited';

function loadVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(SIDEBAR_VISITED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lance:sidebar-collapsed') === 'true');
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  // Progressive disclosure: new users see essentials; the sidebar grows with
  // their business. One-way data/visit unlocks + a manual "show all" toggle.
  const [showAll, setShowAll] = useState(() => localStorage.getItem(SIDEBAR_FULL_KEY) === 'true');
  const [visited, setVisited] = useState<Set<string>>(loadVisited);
  const isExpanded = (!collapsed || hovered) && !isMobile;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { isLicensed, proposals, projects, invoices, allAttachments, pendingFollowUps, profile, clients, contracts, timeEntries, expenses, getActiveTier } = useStore((s) => ({
    isLicensed: s.isLicensed,
    proposals: s.proposals,
    projects: s.projects,
    invoices: s.invoices,
    allAttachments: s.allAttachments,
    pendingFollowUps: s.pendingFollowUps,
    profile: s.profile,
    clients: s.clients,
    contracts: s.contracts,
    timeEntries: s.timeEntries,
    expenses: s.expenses,
    getActiveTier: s.getActiveTier,
  }));
  const isTrial = getActiveTier() === 'trial';

  // Remember every section the user visits (palette, deep link, tour CTA…).
  // Visited sections stay visible: nothing the user found gets taken away.
  useEffect(() => {
    const path = location.pathname;
    setVisited((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      try {
        localStorage.setItem(SIDEBAR_VISITED_KEY, JSON.stringify([...next]));
      } catch { /* private mode etc.: disclosure just won't persist */ }
      return next;
    });
  }, [location.pathname]);

  const toggleShowAll = () => {
    setShowAll((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_FULL_KEY, String(next));
      return next;
    });
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('lance:sidebar-collapsed', String(next));
  };

  const archetype = useMemo(() => getArchetype(profile?.profession || 'default'), [profile?.profession]);

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
    // Progressive disclosure: the first 3 archetype items are the core loop
    // and always show. The rest reveal when the user has data there, has
    // visited, or flips "show all". The sidebar grows with the business
    // instead of interrogating a day-one user with 9+ sections.
    const hasData: Record<string, boolean> = {
      clients: clients.length > 0,
      projects: projects.length > 0,
      time: timeEntries.length > 0,
      invoices: invoices.length > 0,
      finance: invoices.length > 0 || expenses.length > 0,
      contracts: contracts.length > 0,
      proposals: proposals.length > 0,
      assets: allAttachments.length > 0,
      insights: clients.length > 0,
    };
    const ESSENTIAL_COUNT = 3;
    const visibleItems = showAll
      ? items
      : items.filter((item, i) => i < ESSENTIAL_COUNT || hasData[item.id] || visited.has(item.path));
    const hiddenCount = items.length - visibleItems.length;
    // Group by the archetype's original thirds (WORK/MANAGE/ANALYZE), then
    // drop groups with nothing visible, so labels keep their meaning as
    // sections reveal instead of reshuffling on every unlock.
    const visiblePaths = new Set(visibleItems.map((i) => i.path));
    const groups: { label: string; items: SidebarItemDef[] }[] = [];
    const groupLabels = ['WORK', 'MANAGE', 'ANALYZE'];
    const splitSize = Math.max(1, Math.ceil(items.length / 3));

    for (let i = 0; i < items.length; i += splitSize) {
      const groupItems = items.slice(i, i + splitSize).filter((item) => visiblePaths.has(item.path));
      if (groupItems.length === 0) continue;
      groups.push({
        label: groupLabels[Math.floor(i / splitSize)] || 'MORE',
        items: groupItems,
      });
    }
    return { items: visibleItems, groups, hiddenCount };
  }, [archetype, showAll, visited, clients.length, projects.length, timeEntries.length, invoices.length, expenses.length, contracts.length, proposals.length, allAttachments.length]);

  // MORE-group progressive disclosure. Search is wayfinding and always
  // shows; the rest reveal on use or via "show all".
  const showImport = showAll;
  const showFollowUps = showAll || pendingFollowUps.length > 0 || visited.has('/follow-ups');
  const showAchievements = showAll || visited.has('/achievements');
  const showArchetype = showAll || visited.has('/archetype');
  const hiddenMoreCount =
    (showImport ? 0 : 1) + (showFollowUps ? 0 : 1) + (showAchievements ? 0 : 1) + (showArchetype ? 0 : 1);
  const hiddenTotal = sidebarItems.hiddenCount + hiddenMoreCount;

  return (
    <aside
      className={`${isExpanded ? 'w-[220px]' : 'w-[52px]'} h-full flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-color)] flex-shrink-0 transition-[width] duration-200`}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 px-3 h-[56px] border-b border-[var(--border-color)]">
        {isExpanded && (
          <>
            <button
              onClick={() => navigate('/')}
              className="flex-shrink-0 p-1 hover:bg-[var(--bg-secondary)] rounded-[6px] transition-colors"
              title="Dashboard"
              aria-label="Dashboard"
            >
              <BrandLogo size={20} className="text-[var(--accent)]" />
            </button>
            <span className="font-semibold text-sm text-[var(--text-primary)] flex-1" style={{ fontFamily: "'Syne', sans-serif" }}>Lance</span>
          </>
        )}
        {!isExpanded && (
          <button
            onClick={() => navigate('/')}
            className="mx-auto p-1 hover:bg-[var(--bg-secondary)] rounded-[6px] transition-colors"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <BrandLogo size={20} className="text-[var(--accent)]" />
          </button>
        )}
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

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <NavLink
          to="/"
          end
          data-tour="nav-dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors mb-1 ${
              !isExpanded ? 'justify-center px-0' : ''
            } ${
              isActive
                ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
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
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
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
                  data-tour={`nav-${item.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                      isActive
                        ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
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

        {/* Always-available items (progressively disclosed) */}
        <div className="mb-4">
          {isExpanded && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
              MORE
            </p>
          )}
          {showImport &&
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('lance:open-import'))}
            className={`w-full flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px] ${!isExpanded ? 'justify-center px-0' : ''}`}
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Import"
          >
            <Upload size={16} />
            {isExpanded && 'Import'}
          </button>
          }
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Search"
          >
            <Search size={16} />
            {isExpanded && <span className="flex-1">Search</span>}
          </NavLink>
          {showFollowUps &&
          <NavLink
            to="/follow-ups"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
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
          }
          {showAchievements &&
          <NavLink
            to="/achievements"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Achievements"
          >
            <Trophy size={16} />
            {isExpanded && 'Achievements'}
          </NavLink>
          }
          {showArchetype &&
          <NavLink
            to="/archetype"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
                isActive
                  ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
            title="Archetype"
          >
            <Sparkles size={16} />
            {isExpanded && 'Archetype'}
          </NavLink>
          }
        </div>

        {/* Progressive disclosure toggle */}
        {(!showAll && hiddenTotal > 0) || showAll ? (
          <div className="px-2 pb-2">
            <button
              onClick={toggleShowAll}
              className={`w-full flex items-center gap-2.5 px-4 h-[32px] text-xs transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px] ${!isExpanded ? 'justify-center px-0' : ''}`}
              style={{ fontFamily: "'Syne', sans-serif" }}
              title={showAll ? 'Show fewer sections' : `Show all sections (${hiddenTotal} more)`}
              aria-label={showAll ? 'Show fewer sections' : `Show all sections (${hiddenTotal} more)`}
            >
              {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded && (showAll ? 'Show less' : `Show all (${hiddenTotal} more)`)}
            </button>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-[var(--border-color)]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 h-[36px] text-sm transition-colors ${!isExpanded ? 'justify-center px-0' : ''} ${
              isActive
                ? 'bg-[var(--accent-bg)] text-[var(--text-primary)] font-medium rounded-[8px]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[8px]'
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
            {!isLicensed && isTrial && (
              <p className="text-[10px] text-[var(--accent)] font-medium mt-1 flex items-center gap-1">
                <Sparkles size={10} />
                Trial: {trialDaysRemaining(profile?.trial_started_at)} days left
              </p>
            )}
            {!isLicensed && getActiveTier() === 'expired' && (
              <p className="text-[10px] text-[var(--text-tertiary)] font-medium mt-1 flex items-center gap-1">
                <Sparkles size={10} />
                Trial ended
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
