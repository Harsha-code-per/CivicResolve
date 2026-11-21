import { useState, type ReactElement } from 'react';
import { AuthProvider } from '../auth/AuthProvider.js';
import { Landing } from '../landing/Landing.js';
import { AdminDashboard } from '../ui/AdminDashboard.js';
import { Dashboard } from '../ui/Dashboard.js';
import { IssueTracker } from '../ui/IssueTracker.js';
import { MyReports } from '../ui/MyReports.js';
import { ReportForm } from '../ui/ReportForm.js';
import { ConsoleLayout } from './ConsoleLayout.js';
import { useHashRoute, useIssues, useTheme, type IssuesState } from './hooks.js';
import type { ConsoleRoute } from './routes.js';

/**
 * Renders the page for one console section.
 *
 * @param props - Route, shared issue state and the "report filed" counter.
 * @returns Page element.
 */
function ConsolePage({
  route,
  state,
  filed,
  onFiled,
}: {
  readonly route: ConsoleRoute;
  readonly state: IssuesState;
  readonly filed: number;
  readonly onFiled: () => void;
}): ReactElement {
  switch (route) {
    case 'report':
      return (
        <ReportForm
          onCreated={(issue) => {
            state.upsert(issue);
            onFiled();
          }}
        />
      );
    case 'track':
      return <IssueTracker issues={state.issues} analytics={state.analytics} nowMs={state.nowMs} />;
    case 'mine':
      return <MyReports nowMs={state.nowMs} refreshKey={filed} />;
    case 'admin':
      return (
        <AdminDashboard
          authenticated={state.isAdmin}
          issues={state.issues}
          onAuthChange={state.setAdmin}
          onUpdated={state.upsert}
        />
      );
    default:
      return (
        <Dashboard
          issues={state.issues}
          analytics={state.analytics}
          nowMs={state.nowMs}
          loading={state.loading}
        />
      );
  }
}

/**
 * Root component: the public landing page, or the console with its collapsible
 * sidebar, chosen by the URL hash.
 *
 * @returns App element.
 */
export function App(): ReactElement {
  const route = useHashRoute();
  const [theme, toggleTheme] = useTheme();
  const state = useIssues();
  const [filed, setFiled] = useState(0);

  return (
    <AuthProvider>
      {state.error && (
        <div role="alert" className="alert alert-global">
          {state.error}
        </div>
      )}
      {route === 'home' ? (
        <Landing
          analytics={state.analytics}
          loading={state.loading}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <ConsoleLayout route={route} theme={theme} onToggleTheme={toggleTheme}>
          <ConsolePage
            route={route}
            state={state}
            filed={filed}
            onFiled={() => {
              setFiled((count) => count + 1);
            }}
          />
        </ConsoleLayout>
      )}
    </AuthProvider>
  );
}
