import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { fetchClientConfig } from '../lib/api.js';
import { loadAuthService, type AuthService, type AuthUser } from './firebase.js';

/** loading: checking the session; disabled: the server has no sign-in configured. */
type AuthStatus = 'loading' | 'disabled' | 'ready';

export interface AuthState {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
  readonly error: string | null;
  readonly signInWithGoogle: () => Promise<void>;
  readonly signInAsGuest: () => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly getIdToken: () => Promise<string | null>;
}

const noToken = (): Promise<string | null> => Promise.resolve(null);
const unavailable = (): Promise<void> => Promise.reject(new Error('Sign-in is not available.'));

const AuthContext = createContext<AuthState>({
  status: 'disabled',
  user: null,
  error: null,
  signInWithGoogle: unavailable,
  signInAsGuest: unavailable,
  signOut: unavailable,
  getIdToken: noToken,
});

/**
 * Reads the current sign-in state.
 *
 * @returns AuthState from the nearest AuthProvider.
 */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/**
 * Wraps an auth action so a failure (closed popup, network) becomes a visible message.
 *
 * @param action - Sign-in or sign-out call.
 * @param setError - Error setter.
 * @returns Wrapped action.
 */
function guarded(action: () => Promise<void>, setError: (msg: string | null) => void) {
  return async (): Promise<void> => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  };
}

/**
 * Provides Firebase sign-in (Google or guest) to the app. When the server has no
 * Firebase config, auth is "disabled" and reports are filed without an account.
 *
 * @param props - Children, plus an optional service loader for tests.
 * @returns Provider element.
 */
export function AuthProvider({
  children,
  load = loadAuthService,
}: {
  readonly children: ReactNode;
  readonly load?: typeof loadAuthService;
}): ReactElement {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [service, setService] = useState<AuthService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void fetchClientConfig()
      .then(async ({ firebase }) => {
        if (!firebase) throw new Error('disabled');
        const loaded = await load(firebase);
        if (!active) return;
        setService(loaded);
        unsubscribe = loaded.onChange((next) => {
          setUser(next);
          setStatus('ready');
        });
      })
      .catch(() => {
        if (active) setStatus('disabled');
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [load]);

  const value: AuthState = service
    ? {
        status,
        user,
        error,
        signInWithGoogle: guarded(service.signInWithGoogle, setError),
        signInAsGuest: guarded(service.signInAsGuest, setError),
        signOut: guarded(service.signOut, setError),
        getIdToken: service.getIdToken,
      }
    : {
        status,
        user,
        error,
        signInWithGoogle: unavailable,
        signInAsGuest: unavailable,
        signOut: unavailable,
        getIdToken: noToken,
      };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
