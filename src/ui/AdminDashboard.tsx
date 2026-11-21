import { useState, type FormEvent, type ReactElement } from 'react';
import type { CivicIssue } from '../domain/types.js';
import { loginAdmin, logoutAdmin } from '../lib/api.js';
import { AdminIssueRow } from './AdminIssueRow.js';

export interface AdminDashboardProps {
  readonly authenticated: boolean;
  readonly issues: readonly CivicIssue[];
  readonly onAuthChange: (authenticated: boolean) => void;
  readonly onUpdated: (issue: CivicIssue) => void;
}

/**
 * Renders the authenticated Administrator Command Center for triaging and resolving issues.
 *
 * @param props - Auth state, issue list, and callbacks.
 * @returns AdminDashboard element.
 */
export function AdminDashboard({
  authenticated,
  issues,
  onAuthChange,
  onUpdated,
}: AdminDashboardProps): ReactElement {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      const ok = await loginAdmin(passcode);
      setPasscode('');
      onAuthChange(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    }
  };

  const handleLogout = async (): Promise<void> => {
    await logoutAdmin();
    onAuthChange(false);
  };

  if (!authenticated) {
    return (
      <section aria-labelledby="admin-login-heading" className="panel">
        <h2 id="admin-login-heading">Administrator Command Sign-In</h2>
        <p>
          Protected by HMAC-SHA256 HttpOnly session cookies. Demo passcode:{' '}
          <code>civic-admin-2026</code>
        </p>
        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        <form onSubmit={(e) => void handleLogin(e)}>
          <div className="field">
            <label htmlFor="admin-passcode">Administrator Passcode</label>
            <input
              id="admin-passcode"
              type="password"
              required
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Sign In to Admin Dashboard
          </button>
        </form>
      </section>
    );
  }

  return (
    <section aria-labelledby="admin-heading">
      <div className="issue-header">
        <h2 id="admin-heading">Administrator Triage &amp; Resolution Queue</h2>
        <button type="button" className="btn" onClick={() => void handleLogout()}>
          Sign Out
        </button>
      </div>
      {error && (
        <div role="alert" className="alert">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" aria-live="polite" className="alert alert-success">
          {notice}
        </div>
      )}
      <div className="issue-list">
        {issues.map((issue) => (
          <AdminIssueRow
            key={issue.id}
            issue={issue}
            onError={setError}
            onUpdated={(updated) => {
              setError(null);
              setNotice(`Updated ${updated.id} to ${updated.status}.`);
              onUpdated(updated);
            }}
          />
        ))}
      </div>
    </section>
  );
}
