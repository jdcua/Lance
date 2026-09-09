import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
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
const ShareView = lazy(() => import('./screens/ShareView'));
const NotFound = lazy(() => import('./screens/NotFound'));

// Plain Suspense wrapper (not a component) so this module only exports the
// router object and stays fast-refresh clean.
function lazyRoute(element: ReactNode) {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-[12px] skeleton-pulse" />)}
        </div>
      </div>
    }>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: lazyRoute(<Dashboard />) },
        { path: 'archetype', element: lazyRoute(<ArchetypePicker />) },
        { path: 'proposals', element: lazyRoute(<Proposals />) },
        { path: 'proposals/new', element: lazyRoute(<NewProposal />) },
        { path: 'contracts', element: lazyRoute(<Contracts />) },
        { path: 'projects', element: lazyRoute(<Projects />) },
        { path: 'time', element: lazyRoute(<Time />) },
        { path: 'invoices', element: lazyRoute(<Invoices />) },
        { path: 'follow-ups', element: lazyRoute(<FollowUps />) },
        { path: 'clients', element: lazyRoute(<Clients />) },
        { path: 'finance', element: lazyRoute(<Finance />) },
        { path: 'insights', element: lazyRoute(<Insights />) },
        { path: 'settings', element: lazyRoute(<SettingsView />) },
        { path: 'achievements', element: lazyRoute(<AchievementsPage />) },
        { path: 'assets', element: lazyRoute(<Assets />) },
        { path: 'search', element: lazyRoute(<SearchScreen />) },
        { path: '*', element: lazyRoute(<NotFound />) },
      ],
    },
    {
      // Public, client-facing share portal · rendered WITHOUT the app shell
      path: 'share/:token',
      element: lazyRoute(<ShareView />),
    },
  ],
);
