import { useLocation } from 'react-router-dom';

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

  return (
    <div className="h-[56px] bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>
        {title}
      </h1>
    </div>
  );
}
