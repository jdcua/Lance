import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import SideLink from './SideLink';
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
  Banknote,
  CheckSquare,
  Calendar,
  Calculator,
  Pen,
  Bell,
  Columns3,
  ChevronDown,
  ChevronUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../../store';
import { usePrefs } from '../../lib/prefs';
import { commands } from '../../lib/commands';
import { getShortcutModifierLabel } from '../../utils/shortcuts';
import { setMobileNavOpen, useMobileNavOpen } from '../../lib/mobileNav';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  PenLine,
  FolderKanban,
  Clock,
  Receipt,
  Users,
  BarChart3,
  Lightbulb,
  Settings,
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
  Sparkles,
  Bell,
  ChevronDown,
  ChevronUp,
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

type NavItem = { id: string; label: string; path: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };
type BadgeCounts = {
  unpaidInvoices: number;
  draftProposals: number;
  activeProjects: number;
  totalAssets: number;
};
type BadgeKey = keyof BadgeCounts;

function isSidebarExpanded(
  mobileOpen: boolean,
  isMobile: boolean,
  collapsed: boolean,
  hovered: boolean,
): boolean {
  return (mobileOpen && isMobile) || ((!collapsed || hovered) && !isMobile);
}

function badgeKeyFor(path: string): BadgeKey | null {
  if (path === '/proposals') return 'draftProposals';
  if (path === '/projects') return 'activeProjects';
  if (path === '/invoices') return 'unpaidInvoices';
  if (path === '/assets') return 'totalAssets';
  return null;
}

function hiddenMoreCount(
  showImport: boolean,
  showPipeline: boolean,
  showFollowUps: boolean,
  showAchievements: boolean,
): number {
  return (
    (showImport ? 0 : 1) +
    (showPipeline ? 0 : 1) +
    (showFollowUps ? 0 : 1) +
    (showAchievements ? 0 : 1)
  );
}

function sidebarAsideClass(isMobile: boolean, isExpanded: boolean, mobileOpen: boolean): string {
  if (isMobile) {
    return `fixed inset-y-0 left-0 z-40 w-72 max-w-[86vw] h-full flex flex-col glass-dark border-r border-[var(--sb-border)] transition-transform duration-200 ${mobileOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'}`;
  }
  return `${isExpanded ? 'w-[248px]' : 'w-[60px]'} h-full flex flex-col glass-dark border-r border-[var(--sb-border)] flex-shrink-0 transition-[width] duration-200`;
}

function asideAria(isMobile: boolean, mobileOpen: boolean) {
  const hidden = isMobile && !mobileOpen;
  const modal = isMobile && mobileOpen;
  return {
    ariaHidden: hidden ? true : undefined,
    ariaModal: modal ? true : undefined,
    role: modal ? ('dialog' as const) : undefined,
    inert: hidden ? { inert: '' } : {},
  };
}

function showDisclosure(showAll: boolean, hiddenTotal: number): boolean {
  return (!showAll && hiddenTotal > 0) || showAll;
}

function DisclosureToggle({
  showAll,
  hiddenTotal,
  isExpanded,
  onToggle,
}: {
  showAll: boolean;
  hiddenTotal: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const title = showAll ? 'Show fewer sections' : `Show all sections (${hiddenTotal} more)`;
  return (
    <div className="px-2 pb-2">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-3 h-[32px] text-xs transition-colors text-[var(--sb-label)] hover:text-[var(--sb-text-active)] hover:bg-[var(--sb-bg-hover)] rounded-[10px] ${!isExpanded ? 'justify-center px-0' : ''}`}
        title={title}
        aria-label={title}
      >
        {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {isExpanded && (showAll ? 'Show less' : `Show all (${hiddenTotal} more)`)}
      </button>
    </div>
  );
}

function NavBadge({
  item,
  badgeKey,
  showBadges,
  isExpanded,
  badgeMap,
}: {
  item: NavItem;
  badgeKey: BadgeKey | null;
  showBadges: boolean;
  isExpanded: boolean;
  badgeMap: BadgeCounts;
}) {
  return (
    <>
      {showBadges && isExpanded && (item as { badge?: string }).badge === 'new' && (
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] sb-accent-text">
          New
        </span>
      )}
      {showBadges &&
        isExpanded &&
        (item as { badge?: string }).badge === 'alert' &&
        badgeMap.unpaidInvoices > 0 && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
            {badgeMap.unpaidInvoices}
          </span>
        )}
      {showBadges && isExpanded && badgeKey && badgeMap[badgeKey] > 0 && (
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            badgeKey === 'unpaidInvoices'
              ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
              : 'bg-[var(--accent-bg)] sb-accent-text'
          }`}
        >
          {badgeMap[badgeKey]}
        </span>
      )}
    </>
  );
}

function SidebarHeader({
  isExpanded,
  isMobile,
  onNavigateHome,
  onToggleCollapsed,
  onCloseMobile,
  closeButtonRef,
}: {
  isExpanded: boolean;
  isMobile: boolean;
  onNavigateHome: () => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <div className="flex items-center gap-2 px-3 h-[60px] border-b border-[var(--sb-border)]">
      {isExpanded && (
        <>
          <button
            onClick={onNavigateHome}
            className="flex-shrink-0 p-1 hover:bg-[var(--sb-bg-hover)] rounded-sm transition-colors"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <BrandLogo size={22} className="text-[var(--accent)]" />
          </button>
          <span className="font-semibold text-[15px] text-[var(--sb-text-active)] flex-1 tracking-tight">
            Lance
          </span>
        </>
      )}
      {!isExpanded && (
        <button
          onClick={onNavigateHome}
          className="mx-auto p-1 hover:bg-[var(--sb-bg-hover)] rounded-sm transition-colors"
          title="Dashboard"
          aria-label="Dashboard"
        >
          <BrandLogo size={22} className="text-[var(--accent)]" />
        </button>
      )}
      {isExpanded &&
        (isMobile ? (
          <button
            ref={closeButtonRef}
            onClick={onCloseMobile}
            className="p-1.5 rounded-[10px] text-[var(--sb-label)] hover:text-[var(--sb-text-active)] hover:bg-[var(--sb-bg-hover)] transition-colors"
            title="Close navigation"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onToggleCollapsed}
            className="p-1 rounded-xs text-[var(--sb-label)] hover:text-[var(--sb-text-active)] hover:bg-[var(--sb-bg-hover)] transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        ))}
    </div>
  );
}

function NavGroups({
  groups,
  isExpanded,
  isMobile,
  mobileOpen,
  showBadges,
  badgeMap,
}: {
  groups: NavGroup[];
  isExpanded: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  showBadges: boolean;
  badgeMap: BadgeCounts;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          {isExpanded && (
            <p
              className="px-3 mb-1.5 text-[10px] font-semibold text-[var(--sb-label)]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const key = badgeKeyFor(item.path);
            return (
              <SideLink
                focusable={!isMobile || mobileOpen}
                key={item.path}
                to={item.path}
                tour={`nav-${item.id}`}
                title={item.label}
                icon={Icon}
                label={item.label}
                expanded={isExpanded}
                badge={
                  <NavBadge
                    item={item}
                    badgeKey={key}
                    showBadges={showBadges}
                    isExpanded={isExpanded}
                    badgeMap={badgeMap}
                  />
                }
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

function MoreSection({
  isExpanded,
  isMobile,
  mobileOpen,
  showImport,
  showPipeline,
  showFollowUps,
  showAchievements,
  showBadges,
  pendingFollowUpsCount,
  onOpenImport,
}: {
  isExpanded: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  showImport: boolean;
  showPipeline: boolean;
  showFollowUps: boolean;
  showAchievements: boolean;
  showBadges: boolean;
  pendingFollowUpsCount: number;
  onOpenImport: () => void;
}) {
  return (
    <div className="mb-4">
      {isExpanded && (
        <p
          className="px-3 mb-1.5 text-[10px] font-semibold text-[var(--sb-label)]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          More
        </p>
      )}
      {showImport && (
        <button
          onClick={onOpenImport}
          className={`w-full flex items-center gap-2.5 px-3 h-[36px] text-[13.5px] font-medium transition-colors duration-150 text-[var(--sb-text)] hover:text-[var(--sb-text-active)] hover:bg-[var(--sb-bg-hover)] rounded-[10px] ${!isExpanded ? 'justify-center px-0' : ''}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
          title="Import"
        >
          <Upload size={16} />
          {isExpanded && 'Import'}
        </button>
      )}
      <SideLink
        focusable={!isMobile || mobileOpen}
        to="/search"
        title="Search"
        icon={Search}
        label="Search"
        expanded={isExpanded}
      />
      {showPipeline && (
        <SideLink
          focusable={!isMobile || mobileOpen}
          to="/pipeline"
          title="Pipeline"
          icon={Columns3}
          label="Pipeline"
          expanded={isExpanded}
        />
      )}
      {showFollowUps && (
        <SideLink
          focusable={!isMobile || mobileOpen}
          to="/follow-ups"
          title="Follow-ups"
          icon={Bell}
          label="Follow-ups"
          expanded={isExpanded}
          badge={
            showBadges && isExpanded && pendingFollowUpsCount > 0 ? (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] sb-accent-text">
                {pendingFollowUpsCount}
              </span>
            ) : undefined
          }
        />
      )}
      {showAchievements && (
        <SideLink
          focusable={!isMobile || mobileOpen}
          to="/achievements"
          title="Achievements"
          icon={Trophy}
          label="Achievements"
          expanded={isExpanded}
        />
      )}
    </div>
  );
}

function SidebarFooter({
  isExpanded,
  isMobile,
  mobileOpen,
  onNavigateSettings,
  onToggleCollapsed,
  profile,
  modifierLabel,
}: {
  isExpanded: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onNavigateSettings: () => void;
  onToggleCollapsed: () => void;
  profile: { name?: string } | null;
  modifierLabel: string;
}) {
  return (
    <div className="border-t border-[var(--sb-border)] px-2 pt-2 pb-3">
      <SideLink
        focusable={!isMobile || mobileOpen}
        to="/settings"
        title="Settings"
        icon={Settings}
        label="Settings"
        expanded={isExpanded}
      />
      {isExpanded && (
        <div className="mt-1">
          <button
            onClick={onNavigateSettings}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-[var(--sb-bg-hover)] transition-colors text-left"
            title="Profile & settings"
          >
            <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-on)] text-[11px] font-semibold grid place-items-center flex-shrink-0">
              {profile?.name
                ?.trim()
                ?.split(/\s+/)
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'L'}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-[var(--sb-text-active)] truncate">
                {profile?.name?.trim() || 'Freelancer'}
              </span>
            </span>
            <Settings size={13} className="text-[var(--sb-label)] flex-shrink-0" />
          </button>
          <p className="text-[10px] text-[var(--sb-text)] leading-relaxed px-2.5 pt-2 pb-2">
            <span className="font-medium">{modifierLabel}1</span>-8 navigate &middot;{' '}
            <span className="font-medium">{modifierLabel}N</span> new
          </p>
        </div>
      )}
      {!isExpanded && (
        <button
          onClick={onToggleCollapsed}
          className="w-full flex items-center justify-center h-[36px] text-[var(--sb-label)] hover:text-[var(--sb-text-active)] hover:bg-[var(--sb-bg-hover)] rounded-[10px] transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          tabIndex={isMobile && !mobileOpen ? -1 : 0}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('lance:sidebar-collapsed') === 'true',
  );
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );
  const mobileOpen = useMobileNavOpen();
  const setMobileOpen = setMobileNavOpen;
  // Progressive disclosure: new users see essentials; the sidebar grows with
  // their business. One-way data/visit unlocks + a manual "show all" toggle.
  const [showAll, setShowAll] = useState(() => localStorage.getItem(SIDEBAR_FULL_KEY) === 'true');
  const [visited, setVisited] = useState<Set<string>>(loadVisited);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const isExpanded = isSidebarExpanded(mobileOpen, isMobile, collapsed, hovered);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      // Keep keyboard focus inside the drawer while it is open.
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to the trigger instead of dropping it on the body.
      const trigger = document.querySelector<HTMLElement>('[data-mobile-nav-trigger]');
      (trigger ?? previouslyFocused)?.focus?.();
    };
  }, [mobileOpen]);
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  const {
    proposals,
    projects,
    invoices,
    allAttachments,
    pendingFollowUps,
    profile,
    clients,
    contracts,
    timeEntries,
    expenses,
  } = useStore((s) => ({
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
  }));
  const prefs = usePrefs();
  const showBadges = prefs.badges;
  const badgeMap = { unpaidInvoices: 0, draftProposals: 0, activeProjects: 0, totalAssets: 0 };

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
      } catch {
        /* private mode etc.: disclosure just won't persist */
      }
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

  const sidebarItems = useMemo(() => {
    // Default nav items shown progressively — replaces the old archetype-driven sidebar.
    const defaultItems = [
      { id: 'clients', label: 'Clients', path: '/clients', icon: Users },
      { id: 'projects', label: 'Projects', path: '/projects', icon: FolderKanban },
      { id: 'invoices', label: 'Invoices', path: '/invoices', icon: Receipt },
      { id: 'contracts', label: 'Contracts', path: '/contracts', icon: FileEdit },
      { id: 'finance', label: 'Finance', path: '/finance', icon: Banknote },
      { id: 'time', label: 'Time', path: '/time', icon: Clock },
      { id: 'proposals', label: 'Proposals', path: '/proposals', icon: FileText },
      { id: 'follow-ups', label: 'Follow-ups', path: '/follow-ups', icon: Bell },
      { id: 'pipeline', label: 'Pipeline', path: '/pipeline', icon: Columns3 },
      { id: 'insights', label: 'Insights', path: '/insights', icon: BarChart3 },
      { id: 'achievements', label: 'Achievements', path: '/achievements', icon: Trophy },
      { id: 'assets', label: 'Assets', path: '/assets', icon: Package },
      { id: 'search', label: 'Search', path: '/search', icon: Search },
    ];
    const hasData: Record<string, boolean> = {
      clients: clients.length > 0,
      projects: projects.length > 0,
      invoices: invoices.length > 0,
      finance: invoices.length > 0 || expenses.length > 0,
      proposals: proposals.length > 0,
      contracts: contracts.length > 0,
      time: timeEntries.length > 0,
      assets: allAttachments.length > 0,
    };
    const ESSENTIAL_COUNT = 4;
    const visibleItems = showAll
      ? defaultItems
      : defaultItems.filter(
          (item, i) => i < ESSENTIAL_COUNT || hasData[item.id] || visited.has(item.path),
        );
    const hiddenCount = defaultItems.length - visibleItems.length;
    const visiblePaths = new Set(visibleItems.map((i) => i.path));
    const groups: { label: string; items: typeof defaultItems }[] = [];
    const groupLabels = ['Work', 'Manage', 'Analyze'];
    const splitSize = Math.max(1, Math.ceil(defaultItems.length / 3));
    for (let i = 0; i < defaultItems.length; i += splitSize) {
      const groupItems = defaultItems
        .slice(i, i + splitSize)
        .filter((item) => visiblePaths.has(item.path));
      if (groupItems.length === 0) continue;
      groups.push({ label: groupLabels[Math.floor(i / splitSize)] || 'MORE', items: groupItems });
    }
    return { items: visibleItems, groups, hiddenCount };
  }, [
    showAll,
    visited,
    clients.length,
    projects.length,
    invoices.length,
    expenses.length,
    contracts.length,
    proposals.length,
    allAttachments.length,
    timeEntries.length,
  ]);

  // MORE-group progressive disclosure. Search is wayfinding and always
  // shows; the rest reveal on use or via "show all".
  const showImport = showAll;
  const showPipeline =
    showAll ||
    proposals.length + contracts.length + projects.length + invoices.length > 0 ||
    visited.has('/pipeline');
  const showFollowUps = showAll || pendingFollowUps.length > 0 || visited.has('/follow-ups');
  const showAchievements = showAll || visited.has('/achievements');
  const showArchetype = showAll || visited.has('/archetype');
  // archetype sidebar entry removed
  const hiddenTotal =
    sidebarItems.hiddenCount +
    hiddenMoreCount(showImport, showPipeline, showFollowUps, showAchievements);
  const asideClassName = sidebarAsideClass(isMobile, isExpanded, mobileOpen);
  const aria = asideAria(isMobile, mobileOpen);

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        ref={drawerRef}
        id="mobile-navigation"
        aria-label="Primary navigation"
        className={asideClassName}
        aria-hidden={aria.ariaHidden}
        aria-modal={aria.ariaModal}
        role={aria.role}
        {...aria.inert}
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarHeader
          isExpanded={isExpanded}
          isMobile={isMobile}
          onNavigateHome={() => navigate('/')}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
          closeButtonRef={closeButtonRef}
        />

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <SideLink
            focusable={!isMobile || mobileOpen}
            to="/"
            end
            tour="nav-dashboard"
            title="Dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            expanded={isExpanded}
            className="mb-1"
          />

          <NavGroups
            groups={sidebarItems.groups as NavGroup[]}
            isExpanded={isExpanded}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            showBadges={showBadges}
            badgeMap={badgeMap}
          />

          {/* Always-available items (progressively disclosed) */}
          <MoreSection
            isExpanded={isExpanded}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            showImport={showImport}
            showPipeline={showPipeline}
            showFollowUps={showFollowUps}
            showAchievements={showAchievements}
            showBadges={showBadges}
            pendingFollowUpsCount={pendingFollowUps.length}
            onOpenImport={() => commands.dispatch('lance:open-import')}
          />

          {/* Progressive disclosure toggle */}
          {showDisclosure(showAll, hiddenTotal) ? (
            <DisclosureToggle
              showAll={showAll}
              hiddenTotal={hiddenTotal}
              isExpanded={isExpanded}
              onToggle={toggleShowAll}
            />
          ) : null}
        </nav>

        <SidebarFooter
          isExpanded={isExpanded}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onNavigateSettings={() => navigate('/settings')}
          onToggleCollapsed={toggleCollapsed}
          profile={profile}
          modifierLabel={getShortcutModifierLabel()}
        />
      </aside>
    </>
  );
}
