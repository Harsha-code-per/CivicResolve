import { useEffect, useState, type KeyboardEvent, type ReactElement } from 'react';
import { computeAnalytics } from '../domain/analytics.js';
import type { CivicIssue } from '../domain/types.js';
import { fetchAdminSession, fetchIssues } from '../lib/api.js';
import { AdminDashboard } from './AdminDashboard.js';
import { IssueTracker } from './IssueTracker.js';
import { LandingHero, type ActiveView } from './LandingHero.js';
import { ReportForm } from './ReportForm.js';

const TABS: readonly { readonly id: ActiveView; readonly label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'report', label: 'Report Issue' },
  { id: 'tracker', label: 'Track Issues' },
  { id: 'admin', label: 'Admin Command' },
];

/**
 * Root CivicResolve application shell with keyboard-navigable ARIA tabs and theme toggle.
 *
 * @returns Root App element.
 */
export function App(): ReactElement {
  const [view, setView] = useState<ActiveView>('overview');
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchIssues(), fetchAdminSession()])
      .then(([data, isAdmin]) => {
        if (!active) return;
        setIssues(data.issues);
        setAuthenticated(isAdmin);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Unable to load civic issues.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const [nowMs] = useState(() => Date.now());
  const analytics = computeAnalytics(issues, nowMs);

  // WAI-ARIA tabs: Left/Right wrap around, Home/End jump, and focus follows selection.
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const moves: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: TABS.length - 1,
    };
    const move = moves[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const next = (move + TABS.length) % TABS.length;
    TABS.forEach((tab, position) => {
      if (position !== next) return;
      setView(tab.id);
      document.getElementById(`tab-${tab.id}`)?.focus();
    });
  };

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          <span>CivicResolve</span>
        </div>

        <nav aria-label="Primary workspaces">
          <div className="tablist" role="tablist">
            {TABS.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={view === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={view === tab.id ? 0 : -1}
                className="tab"
                onClick={() => {
                  setView(tab.id);
                }}
                onKeyDown={(e) => {
                  handleTabKeyDown(e, idx);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <button
          type="button"
          className="btn"
          aria-pressed={theme === 'dark'}
          onClick={() => {
            setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
          }}
        >
          Dark mode
        </button>
      </header>

      <main id="main-content">
        {loadError && (
          <div role="alert" className="alert">
            {loadError}
          </div>
        )}

        <div id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`}>
          {view === 'overview' && (
            <LandingHero analytics={analytics} onNavigate={setView} loading={loading} />
          )}
          {view === 'report' && (
            <ReportForm
              onCreated={(created) => {
                setIssues((prev) => [created, ...prev]);
              }}
            />
          )}
          {view === 'tracker' && (
            <IssueTracker issues={issues} analytics={analytics} nowMs={nowMs} />
          )}
          {view === 'admin' && (
            <AdminDashboard
              authenticated={authenticated}
              issues={issues}
              onAuthChange={setAuthenticated}
              onUpdated={(updated) => {
                setIssues((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
              }}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <span>CivicResolve — AI-Powered Citizen Grievance Management &amp; Resolution</span>
        <span>Built with Google Gemini, Firestore &amp; Cloud Run</span>
      </footer>
    </div>
  );
}
