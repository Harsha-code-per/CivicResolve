import { describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  const user = {
    uid: 'u',
    displayName: null,
    email: 'e@x.com',
    photoURL: null,
    isAnonymous: false,
    getIdToken: vi.fn(() => Promise.resolve('tok')),
  };
  const instance: { currentUser: typeof user | null } = { currentUser: null };
  return {
    user,
    instance,
    initializeApp: vi.fn(() => ({ name: 'app' })),
    initializeAuth: vi.fn(() => instance),
    onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
      cb(user);
      cb(null);
      return () => undefined;
    }),
    signInWithPopup: vi.fn(() => Promise.resolve()),
    signInAnonymously: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(),
  };
});

vi.mock('@firebase/app', () => ({ initializeApp: sdk.initializeApp }));
vi.mock('@firebase/auth', () => ({
  initializeAuth: sdk.initializeAuth,
  onAuthStateChanged: sdk.onAuthStateChanged,
  signInWithPopup: sdk.signInWithPopup,
  signInAnonymously: sdk.signInAnonymously,
  signOut: sdk.signOut,
  GoogleAuthProvider: sdk.GoogleAuthProvider,
  indexedDBLocalPersistence: 'idb',
  browserLocalPersistence: 'local',
  browserPopupRedirectResolver: 'popup',
}));

const { loadAuthService, toAuthUser } = await import('../../src/auth/firebase.js');

describe('Firebase auth service', () => {
  it('wires Firebase Auth to the app-level service', async () => {
    const service = await loadAuthService({
      apiKey: 'k',
      authDomain: 'd',
      projectId: 'p',
      appId: 'a',
    });
    expect(sdk.initializeAuth).toHaveBeenCalledWith(
      { name: 'app' },
      { persistence: ['idb', 'local'], popupRedirectResolver: 'popup' },
    );
    const seen: unknown[] = [];
    service.onChange((user) => seen.push(user));
    expect(seen).toEqual([toAuthUser(sdk.user), null]);

    await service.signInWithGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalled();
    await service.signInAsGuest();
    expect(sdk.signInAnonymously).toHaveBeenCalled();
    await service.signOut();
    expect(sdk.signOut).toHaveBeenCalled();

    expect(await service.getIdToken()).toBeNull();
    sdk.instance.currentUser = sdk.user;
    expect(await service.getIdToken()).toBe('tok');
  });

  it('names guests and falls back from display name to email to "Citizen"', () => {
    const base = { uid: 'u', photoURL: null, email: null, displayName: null };
    expect(toAuthUser({ ...base, isAnonymous: true }).name).toBe('Guest citizen');
    expect(toAuthUser({ ...base, isAnonymous: false, displayName: 'Ravi' }).name).toBe('Ravi');
    expect(toAuthUser({ ...base, isAnonymous: false, email: 'r@x.com' }).name).toBe('r@x.com');
    expect(toAuthUser({ ...base, isAnonymous: false }).name).toBe('Citizen');
  });
});
