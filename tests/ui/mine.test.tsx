import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../src/auth/AuthProvider.js';
import { MyReports } from '../../src/ui/MyReports.js';
import {
  authRoutes,
  baseRoutes,
  fakeAuthService,
  GOOGLE_USER,
  mockFetch,
  seedIssues,
} from './helpers.js';

const NOW = Date.parse('2026-11-22T00:00:00.000Z');

const renderMine = (load?: ReturnType<typeof fakeAuthService>['load']) =>
  render(
    <AuthProvider {...(load ? { load } : {})}>
      <MyReports nowMs={NOW} refreshKey={0} />
    </AuthProvider>,
  );

describe('MyReports', () => {
  it('explains when sign-in is not configured', async () => {
    mockFetch(baseRoutes());
    renderMine();
    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
    expect(await screen.findByText(/Sign-in is not configured/)).toBeInTheDocument();
  });

  it('asks signed-out citizens to sign in, then lists their reports with progress', async () => {
    const mine = seedIssues().slice(0, 2);
    const spy = mockFetch({
      ...authRoutes(),
      'GET /api/me/issues': () => ({ body: { issues: mine } }),
    });
    renderMine(fakeAuthService().load);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue as guest' }));
    expect(await screen.findByRole('heading', { name: mine[0]!.title })).toBeInTheDocument();
    expect(screen.getAllByRole('list', { name: 'Progress toward resolution' })).toHaveLength(2);
    const call = spy.mock.calls.find(([url]) => url === '/api/me/issues');
    expect(call?.[1]?.headers).toEqual({ Authorization: 'Bearer id-token' });
  });

  it('shows an empty state with a link to report', async () => {
    mockFetch({ ...authRoutes(), 'GET /api/me/issues': () => ({ body: { issues: [] } }) });
    renderMine(fakeAuthService(GOOGLE_USER).load);
    expect(await screen.findByRole('link', { name: 'Report an issue' })).toHaveAttribute(
      'href',
      '#/report',
    );
  });

  it('shows load errors, generic for non-Errors, and a loading state', async () => {
    mockFetch({
      ...authRoutes(),
      'GET /api/me/issues': () => ({ status: 401, body: { error: 'Expired' } }),
    });
    const first = renderMine(fakeAuthService(GOOGLE_USER).load);
    expect(await screen.findByRole('alert')).toHaveTextContent('Expired');
    first.unmount();

    const auth = fakeAuthService(GOOGLE_USER);
    vi.mocked(auth.service.getIdToken).mockRejectedValueOnce('nope');
    mockFetch(authRoutes());
    const second = renderMine(auth.load);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your reports.');
    second.unmount();

    const slow = fakeAuthService(GOOGLE_USER);
    vi.mocked(slow.service.getIdToken).mockReturnValueOnce(new Promise(() => undefined));
    const third = renderMine(slow.load);
    expect(await screen.findByText('Loading your reports…')).toBeInTheDocument();
    third.unmount();

    for (const reply of [{ body: { issues: [] } }, { status: 500, body: {} }]) {
      const late = fakeAuthService(GOOGLE_USER);
      let finish: (token: string | null) => void = () => undefined;
      vi.mocked(late.service.getIdToken).mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      const spy = mockFetch({ ...authRoutes(), 'GET /api/me/issues': () => reply });
      const view = renderMine(late.load);
      await screen.findByText('Loading your reports…');
      view.unmount();
      finish(null);
      await vi.waitFor(() => {
        expect(spy.mock.calls.some(([url]) => url === '/api/me/issues')).toBe(true);
      });
    }
  });
});
