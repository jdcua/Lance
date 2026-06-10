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
    <header className="h-[56px] bg-white border-b border-[#E5E5E3] flex items-center px-6 flex-shrink-0">
      <h1 className="text-sm font-semibold text-[#1C1C1A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{title}</h1>
    </header>
  );
}
