import { useEffect, useState, type ReactElement } from 'react';
import { hrefFor } from '../app/routes.js';
import { useAuth } from '../auth/AuthProvider.js';
import { describeSla } from '../domain/sla.js';
import type { CivicIssue } from '../domain/types.js';
import { fetchMyIssues } from '../lib/api.js';
import { SignInCard } from './SignInCard.js';
import { StatusStepper } from './StatusStepper.js';

/**
 * Loads the signed-in citizen's own reports whenever the account changes.
 *
 * @param uid - Current user id, or undefined when signed out.
 * @param getIdToken - Supplies the ID token.
 * @param refreshKey - Changes when a new report is filed, to reload.
 * @returns Issues (null while loading) and any error.
 */
function useMyIssues(
  uid: string | undefined,
  getIdToken: () => Promise<string | null>,
  refreshKey: number,
): { issues: CivicIssue[] | null; error: string | null } {
  const [issues, setIssues] = useState<CivicIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return undefined;
    let active = true;
    void getIdToken()
      .then((token) => fetchMyIssues(token ?? ''))
      .then((mine) => {
        if (active) setIssues(mine);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your reports.');
      });
    return () => {
      active = false;
    };
  }, [uid, getIdToken, refreshKey]);
  return { issues, error };
}

/**
 * The citizen's own reports with a progress stepper and SLA countdown for each.
 *
 * @param props - Current time and a counter that changes when a report is filed.
 * @returns My reports page.
 */
export function MyReports({
  nowMs,
  refreshKey,
}: {
  readonly nowMs: number;
  readonly refreshKey: number;
}): ReactElement {
  const auth = useAuth();
  const { issues, error } = useMyIssues(auth.user?.uid, auth.getIdToken, refreshKey);

  const body = (): ReactElement => {
    if (auth.status === 'disabled') {
      return (
        <p className="empty">Sign-in is not configured on this server, so reports are anonymous.</p>
      );
    }
    if (auth.status === 'loading') return <p className="empty">Checking your session…</p>;
    if (!auth.user) {
      return (
        <SignInCard reason="Sign in to see the reports you have filed and follow them to resolution." />
      );
    }
    if (error) {
      return (
        <p role="alert" className="alert">
          {error}
        </p>
      );
    }
    if (!issues) return <p className="empty">Loading your reports…</p>;
    if (issues.length === 0) {
      return (
        <p className="empty">
          You have not filed a report yet. <a href={hrefFor('report')}>Report an issue</a>.
        </p>
      );
    }
    return (
      <ul className="mine-list">
        {issues.map((issue) => (
          <li key={issue.id} className="card mine-card">
            <div className="card-head">
              <div>
                <span className="issue-id">{issue.id}</span>
                <h2>{issue.title}</h2>
                <p className="muted">
                  {issue.location} · {issue.department}
                </p>
              </div>
              <span className="chip chip-neutral">{describeSla(issue, nowMs)}</span>
            </div>
            <StatusStepper status={issue.status} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section aria-labelledby="mine-title" className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Your account</p>
          <h1 id="mine-title" className="page-title">
            My reports
          </h1>
        </div>
      </header>
      {body()}
    </section>
  );
}
