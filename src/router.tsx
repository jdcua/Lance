import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Skeleton, { type SkeletonVariant } from './components/ui/Skeleton';
import { hasTrialPath } from './demo/isDemo';

const Dashboard = lazyRetry(() => import('./screens/Dashboard'));
const Proposals = lazyRetry(() => import('./screens/Proposals'));
const NewProposal = lazyRetry(() => import('./screens/NewProposal'));
const Contracts = lazyRetry(() => import('./screens/Contracts'));
const Projects = lazyRetry(() => import('./screens/Projects'));
const Time = lazyRetry(() => import('./screens/Time'));
const Invoices = lazyRetry(() => import('./screens/Invoices'));
const Clients = lazyRetry(() => import('./screens/Clients'));
const Finance = lazyRetry(() => import('./screens/Finance'));
const Insights = lazyRetry(() => import('./screens/Insights'));
const SettingsView = lazyRetry(() => import('./screens/Settings'));
const AchievementsPage = lazyRetry(() => import('./screens/Achievements'));
const Assets = lazyRetry(() => import('./screens/Assets'));
const SearchScreen = lazyRetry(() => import('./screens/Search'));
const FollowUps = lazyRetry(() => import('./screens/FollowUps'));
const Pipeline = lazyRetry(() => import('./screens/Pipeline'));
const ArchetypePicker = lazyRetry(() => import('./screens/ArchetypePicker'));
const ShareView = lazyRetry(() => import('./screens/ShareView'));
const NotFound = lazyRetry(() => import('./screens/NotFound'));

/**
 * Chunk-load retry: after a deploy, cached HTML can reference hashed chunks
 * that no longer exist, so a route import rejects. Reload once (the fresh
 * HTML points at live chunks); if it still fails, throw into the route's
 * ErrorBoundary, which offers a manual reload. The session flag prevents
 * reload loops; a successful import clears it.
 */
const CHUNK_RETRY_KEY = 'lance:chunk-retry';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRetry<T extends ComponentType<any>>(importer: () => Promise<{ default: T }>) {
  return lazy(() =>
    importer()
      .then((m): { default: T } => {
        try {
          sessionStorage.removeItem(CHUNK_RETRY_KEY);
        } catch {
          /* ignore */
        }
        return m;
      })
      .catch((err: unknown): Promise<{ default: T }> => {
        let fatal = true;
        try {
          if (!sessionStorage.getItem(CHUNK_RETRY_KEY)) {
            sessionStorage.setItem(CHUNK_RETRY_KEY, '1');
            window.location.reload();
            fatal = false;
          }
        } catch {
          /* ignore */
        }
        if (fatal) throw err;
        return new Promise<{ default: T }>(() => {});
      }),
  );
}
function lazyRoute(element: ReactNode, skeleton: SkeletonVariant = 'list') {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Skeleton variant={skeleton} />}>{element}</Suspense>
    </ErrorBoundary>
  );
}

// Trial is served under /try/ (vite base + worker route): the router must
// strip that prefix or every trial URL renders NotFound. Desktop and local
// dev keep '/'. hasTrialPath (not isTrial) so ?trial=1 dev at / still works.
const basename = typeof window !== 'undefined' && hasTrialPath() ? '/try' : '/';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: lazyRoute(<Dashboard />, 'dashboard') },
        { path: 'archetype', element: lazyRoute(<ArchetypePicker />, 'cards') },
        { path: 'proposals', element: lazyRoute(<Proposals />, 'table') },
        { path: 'proposals/new', element: lazyRoute(<NewProposal />, 'form') },
        { path: 'contracts', element: lazyRoute(<Contracts />, 'table') },
        { path: 'projects', element: lazyRoute(<Projects />, 'cards') },
        { path: 'time', element: lazyRoute(<Time />, 'list') },
        { path: 'invoices', element: lazyRoute(<Invoices />, 'table') },
        { path: 'follow-ups', element: lazyRoute(<FollowUps />, 'table') },
        { path: 'pipeline', element: lazyRoute(<Pipeline />, 'cards') },
        { path: 'clients', element: lazyRoute(<Clients />, 'detail') },
        { path: 'finance', element: lazyRoute(<Finance />, 'dashboard') },
        { path: 'insights', element: lazyRoute(<Insights />, 'cards') },
        { path: 'settings', element: lazyRoute(<SettingsView />, 'form') },
        { path: 'achievements', element: lazyRoute(<AchievementsPage />, 'cards') },
        { path: 'assets', element: lazyRoute(<Assets />, 'cards') },
        { path: 'search', element: lazyRoute(<SearchScreen />, 'list') },
        { path: '*', element: lazyRoute(<NotFound />, 'list') },
      ],
    },
    {
      // Public, client-facing share portal · rendered WITHOUT the app shell
      path: 'share/:token',
      element: lazyRoute(<ShareView />),
    },
  ],
  { basename },
);
