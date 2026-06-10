import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/proposals': 'Proposals',
  '/proposals/new': 'New Proposal',
  '/contracts': 'Contracts',
  '/projects': 'Projects',
  '/time': 'Time Tracking',
  '/invoices': 'Invoices',
  '/clients': 'Clients',
  '/finance': 'Finance',
  '/insights': 'Insights',
  '/settings': 'Settings',
};

export default function Topbar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Lance';

  return (
    <header className="h-[56px] bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center px-6 flex-shrink-0">
      <h1 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h1>
    </header>
  );
}
