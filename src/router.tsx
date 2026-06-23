import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';

const Dashboard = lazy(() => import('./screens/Dashboard'));
const Proposals = lazy(() => import('./screens/Proposals'));
const NewProposal = lazy(() => import('./screens/NewProposal'));
const Contracts = lazy(() => import('./screens/Contracts'));
const Projects = lazy(() => import('./screens/Projects'));
const Time = lazy(() => import('./screens/Time'));
const Invoices = lazy(() => import('./screens/Invoices'));
const Clients = lazy(() => import('./screens/Clients'));
const Finance = lazy(() => import('./screens/Finance'));
const Insights = lazy(() => import('./screens/Insights'));
const SettingsView = lazy(() => import('./screens/Settings'));
const AchievementsPage = lazy(() => import('./screens/Achievements'));
const Assets = lazy(() => import('./screens/Assets'));
const SearchScreen = lazy(() => import('./screens/Search'));
const FollowUps = lazy(() => import('./screens/FollowUps'));
const ArchetypePicker = lazy(() => import('./screens/ArchetypePicker'));
const NotFound = lazy(() => import('./screens/NotFound'));

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-[12px] skeleton-pulse" />)}
        </div>
      </div>
    }>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <LazyRoute><Dashboard /></LazyRoute> },
      { path: 'archetype', element: <LazyRoute><ArchetypePicker /></LazyRoute> },
      { path: 'proposals', element: <LazyRoute><Proposals /></LazyRoute> },
      { path: 'proposals/new', element: <LazyRoute><NewProposal /></LazyRoute> },
      { path: 'contracts', element: <LazyRoute><Contracts /></LazyRoute> },
      { path: 'projects', element: <LazyRoute><Projects /></LazyRoute> },
      { path: 'time', element: <LazyRoute><Time /></LazyRoute> },
      { path: 'invoices', element: <LazyRoute><Invoices /></LazyRoute> },
      { path: 'follow-ups', element: <LazyRoute><FollowUps /></LazyRoute> },
      { path: 'clients', element: <LazyRoute><Clients /></LazyRoute> },
      { path: 'finance', element: <LazyRoute><Finance /></LazyRoute> },
      { path: 'insights', element: <LazyRoute><Insights /></LazyRoute> },
      { path: 'settings', element: <LazyRoute><SettingsView /></LazyRoute> },
      { path: 'achievements', element: <LazyRoute><AchievementsPage /></LazyRoute> },
      { path: 'assets', element: <LazyRoute><Assets /></LazyRoute> },
      { path: 'search', element: <LazyRoute><SearchScreen /></LazyRoute> },
      { path: '*', element: <LazyRoute><NotFound /></LazyRoute> },
    ],
  },
]);
