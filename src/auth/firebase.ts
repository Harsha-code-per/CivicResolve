/** Public Firebase web config served by GET /api/config. */
export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

/** The signed-in citizen, reduced to what the UI shows. */
export interface AuthUser {
  readonly uid: string;
  readonly name: string;
  readonly email: string | null;
  readonly photoUrl: string | null;
  readonly isGuest: boolean;
}

/** The sign-in operations the app needs, independent of the Firebase SDK. */
export interface AuthService {
  readonly onChange: (listener: (user: AuthUser | null) => void) => () => void;
  readonly signInWithGoogle: () => Promise<void>;
  readonly signInAsGuest: () => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly getIdToken: () => Promise<string | null>;
}

interface FirebaseUserLike {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly photoURL: string | null;
  readonly isAnonymous: boolean;
}

/**
 * Maps a Firebase user to the app's AuthUser.
 *
 * @param user - Firebase user.
 * @returns AuthUser.
 */
export function toAuthUser(user: FirebaseUserLike): AuthUser {
  return {
    uid: user.uid,
    name: user.isAnonymous ? 'Guest citizen' : (user.displayName ?? user.email ?? 'Citizen'),
    email: user.email,
    photoUrl: user.photoURL,
    isGuest: user.isAnonymous,
  };
}

/**
 * Loads Firebase Auth on demand, so its code never weighs on the first paint.
 *
 * @param config - Firebase web config.
 * @returns AuthService backed by Firebase Authentication.
 */
export async function loadAuthService(config: FirebaseWebConfig): Promise<AuthService> {
  const [{ initializeApp }, auth] = await Promise.all([
    import('@firebase/app'),
    import('@firebase/auth'),
  ]);
  const instance = auth.initializeAuth(initializeApp(config), {
    persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence],
    popupRedirectResolver: auth.browserPopupRedirectResolver,
  });
  return {
    onChange: (listener) =>
      auth.onAuthStateChanged(instance, (user) => {
        listener(user ? toAuthUser(user) : null);
      }),
    signInWithGoogle: async () => {
      await auth.signInWithPopup(instance, new auth.GoogleAuthProvider());
    },
    signInAsGuest: async () => {
      await auth.signInAnonymously(instance);
    },
    signOut: () => auth.signOut(instance),
    getIdToken: async () => (instance.currentUser ? instance.currentUser.getIdToken() : null),
  };
}
