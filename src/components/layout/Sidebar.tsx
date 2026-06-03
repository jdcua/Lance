import { NavLink, useLocation } from 'react-router-dom';
import {
  Scale,
  FileText,
  PenLine,
  FolderKanban,
  Clock,
  Receipt,
  Users,
  BarChart3,
  Lightbulb,
  Settings,
} from 'lucide-react';

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
  return (
    <aside className="w-[200px] h-full flex flex-col bg-white border-r border-[#E5E5E3] flex-shrink-0">
      <div className="flex items-center gap-2 px-4 h-[52px] border-b border-[#E5E5E3]">
        <Scale size={20} className="text-[#1D9E75]" />
        <span className="font-semibold text-sm text-[#1C1C1A]">Lance</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 mb-1 text-[10px] font-semibold text-[#A3A39E] uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white border-l-2 border-[#1D9E75] text-[#1D9E75] font-medium pl-[14px]'
                      : 'text-[#6B6B67] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] border-l-2 border-transparent'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#E5E5E3]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-white border-l-2 border-[#1D9E75] text-[#1D9E75] font-medium pl-[14px]'
                : 'text-[#6B6B67] hover:text-[#1C1C1A] hover:bg-[#F2F2F0] border-l-2 border-transparent'
            }`
          }
        >
          <Settings size={16} />
          Settings
        </NavLink>
        <div className="px-4 py-2">
          <p className="text-[10px] text-[#A3A39E] leading-relaxed">
            <span className="font-medium">⌘1</span>-8 navigate &middot; <span className="font-medium">⌘N</span> new
          </p>
        </div>
      </div>
    </aside>
  );
}
