import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from '../../src/ui/AdminDashboard.js';
import { AuthProvider } from '../../src/auth/AuthProvider.js';
import { authRoutes, fakeAuthService, GUEST_USER, mockFetch, seedIssues } from './helpers.js';

describe('AdminDashboard', () => {
  it('signs in, reports a wrong passcode, and signs out', async () => {
    let attempts = 0;
    mockFetch({
      'POST /api/admin/login': () => {
        attempts += 1;
        return attempts === 1
          ? { status: 401, body: { error: 'Invalid administrator passcode.' } }
          : { body: { authenticated: true } };
      },
    });
    const onAuthChange = vi.fn();
    render(
      <AdminDashboard
        authenticated={false}
        issues={[]}
        onAuthChange={onAuthChange}
        onUpdated={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Administrator passcode'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in with passcode' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid administrator passcode.');
    await user.type(screen.getByLabelText('Administrator passcode'), 'civic-admin-2026');
    await user.click(screen.getByRole('button', { name: 'Sign in with passcode' }));
    await vi.waitFor(() => {
      expect(onAuthChange).toHaveBeenCalledWith(true);
    });
  });

  it('falls back to generic messages for non-Error failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject('offline')),
    );
    render(
      <AdminDashboard
        authenticated={false}
        issues={[]}
        onAuthChange={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Administrator passcode'), 'pass');
    await user.click(screen.getByRole('button', { name: 'Sign in with passcode' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in failed.');
  });

  it('updates an issue, surfaces update errors, and handles sign-out failures', async () => {
    const issues = seedIssues().slice(0, 1);
    let patches = 0;
    let logouts = 0;
    mockFetch({
      'PATCH /api/admin/issues/CR-2026-1001': () => {
        patches += 1;
        return patches === 1
          ? {
              status: 409,
              body: { error: 'Invalid status transition from in_progress to reported.' },
            }
          : { body: { issue: { ...issues[0], status: 'resolved' } } };
      },
      'POST /api/admin/logout': () => {
        logouts += 1;
        return logouts === 1
          ? { status: 500, body: { error: 'Sign out broke.' } }
          : { body: { authenticated: false } };
      },
    });
    const onUpdated = vi.fn();
    const onAuthChange = vi.fn();
    render(
      <AdminDashboard
        authenticated
        issues={issues}
        onAuthChange={onAuthChange}
        onUpdated={onUpdated}
      />,
    );
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.selectOptions(
      screen.getByLabelText('Department'),
      'Traffic & Public Safety Authority',
    );
    await user.type(screen.getByLabelText('Audit note (required)'), 'Patched');
    await user.click(screen.getByRole('button', { name: 'Save update for CR-2026-1001' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid status transition');

    await user.type(screen.getByLabelText('Audit note (required)'), 'Patched again');
    await user.click(screen.getByRole('button', { name: 'Save update for CR-2026-1001' }));
    expect(await screen.findByText('Updated CR-2026-1001 to resolved.')).toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign out broke.');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await vi.waitFor(() => {
      expect(onAuthChange).toHaveBeenCalledWith(false);
    });
  });

  it('uses generic messages when updates and sign-out fail without an Error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject('offline')),
    );
    render(
      <AdminDashboard
        authenticated
        issues={seedIssues().slice(0, 1)}
        onAuthChange={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Audit note (required)'), 'Note');
    await user.click(screen.getByRole('button', { name: 'Save update for CR-2026-1001' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update issue.');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed.');
  });

  it('signs in with an allow-listed Google account, signing in to Google first if needed', async () => {
    let calls = 0;
    mockFetch({
      ...authRoutes(),
      'POST /api/admin/google': () => {
        calls += 1;
        return calls === 1
          ? { status: 403, body: { error: 'This Google account is not an administrator.' } }
          : { body: { authenticated: true } };
      },
    });
    const auth = fakeAuthService(GUEST_USER);
    const onAuthChange = vi.fn();
    render(
      <AuthProvider load={auth.load}>
        <AdminDashboard
          authenticated={false}
          issues={[]}
          onAuthChange={onAuthChange}
          onUpdated={vi.fn()}
        />
      </AuthProvider>,
    );
    const user = userEvent.setup();
    const google = await screen.findByRole('button', {
      name: 'Sign in with an admin Google account',
    });
    await user.click(google);
    expect(await screen.findByRole('alert')).toHaveTextContent('not an administrator');
    expect(auth.service.signInWithGoogle).toHaveBeenCalledTimes(1);
    vi.mocked(auth.service.getIdToken).mockResolvedValueOnce(null);
    await user.click(google);
    await vi.waitFor(() => {
      expect(onAuthChange).toHaveBeenCalledWith(true);
    });
    expect(auth.service.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('does not report success when the server says the session was not opened', async () => {
    mockFetch({ 'POST /api/admin/login': () => ({ body: { authenticated: false } }) });
    const onAuthChange = vi.fn();
    render(
      <AdminDashboard
        authenticated={false}
        issues={[]}
        onAuthChange={onAuthChange}
        onUpdated={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Administrator passcode'), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in with passcode' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onAuthChange).not.toHaveBeenCalled();
  });
});
