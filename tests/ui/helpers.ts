import { vi } from 'vitest';
import type { AuthService, AuthUser } from '../../src/auth/firebase.js';
import { computeAnalytics } from '../../src/domain/analytics.js';
import { triageDeterministic } from '../../src/domain/priority.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import type { CivicIssue } from '../../src/domain/types.js';

interface FakeReply {
  readonly status?: number;
  readonly body: unknown;
}

type Handler = (body: unknown) => FakeReply;

export const seedIssues = (): CivicIssue[] => createSeedIssues();

export const sampleTriage = triageDeterministic({
  title: 'Severe waterlogging blocking road',
  description: 'Blocked storm drain is causing knee-deep flooding across both lanes.',
  location: 'Peelamedu',
});

/**
 * Replaces fetch with a router keyed by "METHOD /path". Unknown routes return 404.
 */
export function mockFetch(routes: Record<string, Handler>) {
  const spy = vi.fn((input: string | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const handler = routes[key];
    const reply = handler
      ? handler(init?.body ? JSON.parse(String(init.body)) : undefined)
      : { status: 404, body: { error: `No route for ${key}` } };
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 }),
    );
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** Routes the App needs on start-up. */
export function baseRoutes(issues = seedIssues(), authenticated = false): Record<string, Handler> {
  return {
    'GET /api/issues': () => ({ body: { issues, analytics: computeAnalytics(issues, 0) } }),
    'GET /api/admin/session': () => ({ body: { authenticated } }),
    'GET /api/config': () => ({ body: { firebase: null } }),
  };
}

const FIREBASE_CONFIG = { apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' };

/** Routes for a server with Firebase sign-in configured. */
export function authRoutes(issues = seedIssues(), authenticated = false): Record<string, Handler> {
  return {
    ...baseRoutes(issues, authenticated),
    'GET /api/config': () => ({ body: { firebase: FIREBASE_CONFIG } }),
  };
}

export const GOOGLE_USER: AuthUser = {
  uid: 'u-1',
  name: 'Asha Citizen',
  email: 'asha@example.com',
  photoUrl: null,
  isGuest: false,
};

export const GUEST_USER: AuthUser = {
  ...GOOGLE_USER,
  uid: 'g-1',
  name: 'Guest citizen',
  email: null,
  isGuest: true,
};

/**
 * A controllable stand-in for the Firebase auth service.
 */
export function fakeAuthService(initial: AuthUser | null = null) {
  let listener: ((user: AuthUser | null) => void) | undefined;
  const emit = (user: AuthUser | null) => {
    listener?.(user);
  };
  const service: AuthService = {
    onChange: (next) => {
      listener = next;
      next(initial);
      return () => {
        listener = undefined;
      };
    },
    signInWithGoogle: vi.fn(() => {
      emit(GOOGLE_USER);
      return Promise.resolve();
    }),
    signInAsGuest: vi.fn(() => {
      emit(GUEST_USER);
      return Promise.resolve();
    }),
    signOut: vi.fn(() => {
      emit(null);
      return Promise.resolve();
    }),
    getIdToken: vi.fn(() => Promise.resolve('id-token')),
  };
  return { service, emit, load: vi.fn(() => Promise.resolve(service)) };
}
