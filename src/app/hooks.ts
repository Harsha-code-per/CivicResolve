import { useCallback, useEffect, useState } from 'react';
import { computeAnalytics } from '../domain/analytics.js';
import type { CivicIssue, IssueAnalytics } from '../domain/types.js';
import { fetchAdminSession, fetchIssues } from '../lib/api.js';
import { parseRoute, type AppRoute } from './routes.js';

const THEME_KEY = 'cr-theme';
const SIDEBAR_KEY = 'cr-sidebar-collapsed';
export type Theme = 'light' | 'dark';

/**
 * Tracks the hash route, so links, back and forward all work without a router.
 *
 * @returns Current route.
 */
export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const sync = (): void => {
      setRoute(parseRoute(window.location.hash));
    };
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
    };
  }, []);
  return route;
}

/**
 * Theme state that starts from what public/theme.js applied before first paint.
 *
 * @returns Current theme and a toggle that persists the choice.
 */
export function useTheme(): readonly [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);
  return [theme, toggle] as const;
}

/**
 * Remembers whether the desktop sidebar is collapsed.
 *
 * @returns Collapsed flag and a toggle.
 */
export function useSidebarCollapsed(): readonly [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_KEY, prev ? '0' : '1');
      return !prev;
    });
  }, []);
  return [collapsed, toggle] as const;
}

export interface IssuesState {
  readonly issues: readonly CivicIssue[];
  readonly analytics: IssueAnalytics;
  readonly loading: boolean;
  readonly error: string | null;
  readonly isAdmin: boolean;
  readonly nowMs: number;
  readonly setAdmin: (value: boolean) => void;
  readonly upsert: (issue: CivicIssue) => void;
}

/**
 * Loads the public issue list and the admin session once, and keeps them in sync
 * with local changes (new reports, admin updates).
 *
 * @returns Issues, derived analytics and mutators.
 */
export function useIssues(): IssuesState {
  const [issues, setIssues] = useState<readonly CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    void Promise.all([fetchIssues(), fetchAdminSession()])
      .then(([data, admin]) => {
        if (!active) return;
        setIssues(data.issues);
        setAdmin(admin);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load civic issues.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const upsert = useCallback((issue: CivicIssue) => {
    setIssues((prev) =>
      prev.some((item) => item.id === issue.id)
        ? prev.map((item) => (item.id === issue.id ? issue : item))
        : [issue, ...prev],
    );
  }, []);

  return {
    issues,
    analytics: computeAnalytics(issues, nowMs),
    loading,
    error,
    isAdmin,
    nowMs,
    setAdmin,
    upsert,
  };
}
