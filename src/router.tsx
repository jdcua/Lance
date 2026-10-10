import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
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
function lazyRoute(element: ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="p-6 space-y-6">
            <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded skeleton-pulse" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-[var(--bg-secondary)] rounded-lg skeleton-pulse"
                />
              ))}
            </div>
          </div>
        }
      >
        {element}
      </Suspense>
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
  { basename },
);
