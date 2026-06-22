import { useMemo } from 'react';
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
} from 'lucide-react';
import { useStore } from '../../store';
import { getArchetype } from '../../archetypes';
import type { SidebarItemDef } from '../../archetypes';

const ICON_MAP: Record<string, any> = {
  FileText, PenLine, FolderKanban, Clock, Receipt, Users, BarChart3, Lightbulb,
  Settings, Trophy, LayoutDashboard, Upload, Package, Camera, Monitor,
  Clapperboard, Code2, Palette, Brain, Film, Paintbrush, Box, Gamepad2,
  Layers, Target, MessageCircle, FileEdit, Music, FileAudio, Building2,
  ClipboardList, Languages, Search, BarChart4, Settings2, Briefcase,
  CheckSquare, Calendar, Calculator, Pen, Sparkles,
};

export default function Sidebar() {
  const { isLicensed, proposals, projects, invoices, allAttachments, pendingFollowUps, profile } = useStore((s) => ({
    isLicensed: s.isLicensed,
    proposals: s.proposals,
    projects: s.projects,
    invoices: s.invoices,
    allAttachments: s.allAttachments,
    pendingFollowUps: s.pendingFollowUps,
    profile: s.profile,
  }));

  const archetype = useMemo(() => getArchetype(profile?.profession || 'default'), [profile?.profession]);

  const badgeMap: Record<string, number> = useMemo(() => ({
    draftProposals: proposals.filter((p) => p.status === 'draft').length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    unpaidInvoices: invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').length,
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

        {sidebarItems.groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
              {group.label}
            </p>
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
                    `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${
                      isActive
                        ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
                    }`
                  }
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'new' && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">New</span>
                  )}
                  {item.badge === 'alert' && badgeMap.unpaidInvoices > 0 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#FCEBEB] text-[#A32D2D]">{badgeMap.unpaidInvoices}</span>
                  )}
                  {badgeKey && badgeMap[badgeKey] > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      badgeKey === 'unpaidInvoices' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[var(--accent-bg)] text-[var(--accent)]'
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
          <p className="px-4 mb-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.8px]" style={{ fontFamily: "'Syne', sans-serif" }}>
            MORE
          </p>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('lance:open-import'))}
            className="w-full flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <Upload size={16} />
            Import
          </button>
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
          <NavLink
            to="/archetype"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 h-[36px] text-sm transition-colors ${
                isActive
                  ? 'border-l-[3px] border-[var(--accent)] text-[var(--accent)] font-medium pl-[13px] bg-[var(--accent-bg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border-l-[3px] border-transparent'
              }`
            }
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <Sparkles size={16} />
            Archetype
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
