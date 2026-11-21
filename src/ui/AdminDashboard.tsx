import { useState, type ReactElement, type SyntheticEvent } from 'react';
import { useAuth } from '../auth/AuthProvider.js';
import type { CivicIssue } from '../domain/types.js';
import { loginAdmin, loginAdminWithGoogle, logoutAdmin } from '../lib/api.js';
import { AdminIssueRow } from './AdminIssueRow.js';
import { GoogleMark, Icon } from './Icon.js';

export interface AdminDashboardProps {
  readonly authenticated: boolean;
  readonly issues: readonly CivicIssue[];
  readonly onAuthChange: (authenticated: boolean) => void;
  readonly onUpdated: (issue: CivicIssue) => void;
}

const messageOf = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/**
 * Admin sign-in: an allow-listed Google account, or the demo passcode.
 *
 * @param props - Callback for a successful sign-in.
 * @returns Sign-in page.
 */
function AdminSignIn({ onSignedIn }: { readonly onSignedIn: () => void }): ReactElement {
  const auth = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const attempt = async (login: () => Promise<boolean>): Promise<void> => {
    setError(null);
    try {
      if (await login()) onSignedIn();
    } catch (err) {
      setError(messageOf(err, 'Sign in failed.'));
    }
  };

  const withGoogle = async (): Promise<boolean> => {
    if (!auth.user || auth.user.isGuest) await auth.signInWithGoogle();
    return loginAdminWithGoogle((await auth.getIdToken()) ?? '');
  };

  const handlePasscode = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void attempt(() => loginAdmin(passcode));
  };

  return (
    <section aria-labelledby="admin-login-heading" className="page">
      <div className="card auth-card">
        <span className="auth-icon">
          <Icon name="shield" />
        </span>
        <h1 id="admin-login-heading" className="page-title">
          Admin console sign-in
        </h1>
        <p className="muted">
          Sessions use an HMAC-signed, HttpOnly, SameSite=Strict cookie. Judges can use the demo
          passcode <code>civic-admin-2026</code>.
        </p>
        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        {auth.status === 'ready' && (
          <>
            <button
              type="button"
              className="btn btn-google btn-block"
              onClick={() => void attempt(withGoogle)}
            >
              <GoogleMark />
              Sign in with an admin Google account
            </button>
            <p className="divider">
              <span>or</span>
            </p>
          </>
        )}
        <form onSubmit={handlePasscode}>
          <div className="field">
            <label htmlFor="admin-passcode">Administrator passcode</label>
            <input
              id="admin-passcode"
              type="password"
              required
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Sign in with passcode
          </button>
        </form>
      </div>
    </section>
  );
}

/**
 * Admin console: sign-in, then the triage and resolution queue.
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutAdmin();
      onAuthChange(false);
    } catch (err) {
      setError(messageOf(err, 'Sign out failed.'));
    }
  };

  if (!authenticated) {
    return (
      <AdminSignIn
        onSignedIn={() => {
          onAuthChange(true);
        }}
      />
    );
  }

  return (
    <section aria-labelledby="admin-heading" className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Admin console</p>
          <h1 id="admin-heading" className="page-title">
            Triage and resolution queue
          </h1>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void handleLogout()}>
          <Icon name="logout" />
          Sign out
        </button>
      </header>
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
