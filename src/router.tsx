import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Dashboard from './screens/Dashboard';
import Proposals from './screens/Proposals';
import NewProposal from './screens/NewProposal';
import Contracts from './screens/Contracts';
import Projects from './screens/Projects';
import Time from './screens/Time';
import Invoices from './screens/Invoices';
import Clients from './screens/Clients';
import Finance from './screens/Finance';
import Insights from './screens/Insights';
import SettingsView from './screens/Settings';
import AchievementsPage from './screens/Achievements';
import NotFound from './screens/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'proposals', element: <Proposals /> },
      { path: 'proposals/new', element: <NewProposal /> },
      { path: 'contracts', element: <Contracts /> },
      { path: 'projects', element: <Projects /> },
      { path: 'time', element: <Time /> },
      { path: 'invoices', element: <Invoices /> },
      { path: 'clients', element: <Clients /> },
      { path: 'finance', element: <Finance /> },
      { path: 'insights', element: <Insights /> },
      { path: 'settings', element: <SettingsView /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
