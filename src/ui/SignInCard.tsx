import type { ReactElement } from 'react';
import { useAuth } from '../auth/AuthProvider.js';
import { GoogleMark, Icon } from './Icon.js';

/**
 * Sign-in prompt with Google or a one-click guest account (Firebase anonymous auth).
 *
 * @param props - Why sign-in is needed, shown as the lead.
 * @returns Sign-in card.
 */
export function SignInCard({ reason }: { readonly reason: string }): ReactElement {
  const auth = useAuth();
  return (
    <div className="signin-card" role="group" aria-labelledby="signin-title">
      <div className="signin-icon">
        <Icon name="user" />
      </div>
      <div className="signin-body">
        <p id="signin-title" className="signin-title">
          Sign in to continue
        </p>
        <p className="muted">{reason}</p>
        {auth.error && (
          <p role="alert" className="field-error">
            {auth.error}
          </p>
        )}
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-google"
            onClick={() => void auth.signInWithGoogle()}
          >
            <GoogleMark />
            Continue with Google
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void auth.signInAsGuest()}>
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}
