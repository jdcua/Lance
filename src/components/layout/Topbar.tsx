import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useStore } from '../../store';

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
};

export default function Topbar() {
  const location = useLocation();
  const profile = useStore((s) => s.profile);
  const saveProfile = useStore((s) => s.saveProfile);

  const title = pageTitles[location.pathname] || 'Lance';
  const isDark = profile?.theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    if (profile) {
      saveProfile({ ...profile, theme: newTheme });
    }
  };

  return (
    <div className="h-[56px] bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: "'Syne', sans-serif" }}>
        {title}
      </h1>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}
