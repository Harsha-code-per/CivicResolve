import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../../src/auth/AuthProvider.js';
import { Sidebar } from '../../src/app/Sidebar.js';
import { SignInCard } from '../../src/ui/SignInCard.js';
import { authRoutes, baseRoutes, fakeAuthService, GOOGLE_USER, mockFetch } from './helpers.js';

function Probe() {
  const auth = useAuth();
  return (
    <p>
      {auth.status}:{auth.user?.name ?? 'nobody'}
    </p>
  );
}

const sidebar = (
  <Sidebar route="dashboard" collapsed={false} onToggleCollapsed={vi.fn()} onNavigate={vi.fn()} />
);

describe('AuthProvider', () => {
  it('is disabled when the server has no Firebase config, and its actions refuse', async () => {
    mockFetch(baseRoutes());
    let captured: ReturnType<typeof useAuth> | undefined;
    function Capture() {
      captured = useAuth();
      return null;
    }
    render(
      <AuthProvider>
        <Probe />
        <Capture />
      </AuthProvider>,
    );
    expect(screen.getByText('loading:nobody')).toBeInTheDocument();
    expect(await screen.findByText('disabled:nobody')).toBeInTheDocument();
    await expect(captured?.signInAsGuest()).rejects.toThrow('Sign-in is not available.');
    expect(await captured?.getIdToken()).toBeNull();
  });

  it('falls back to disabled when the config cannot be read, and ignores late loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('disabled:nobody')).toBeInTheDocument();
    mockFetch(authRoutes());
    const { load } = fakeAuthService();
    render(
      <AuthProvider load={load}>
        <Probe />
      </AuthProvider>,
    ).unmount();
    await waitFor(() => {
      expect(load).toHaveBeenCalled();
    });
  });

  it('signs in with Google or as a guest, shows the account, and signs out', async () => {
    mockFetch(authRoutes());
    const { load, service } = fakeAuthService();
    render(
      <AuthProvider load={load}>
        <Probe />
        <SignInCard reason="Needed to file." />
        {sidebar}
      </AuthProvider>,
    );
    const user = userEvent.setup();
    expect(await screen.findByText('ready:nobody')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '#/mine');
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(screen.getByText('ready:Guest citizen')).toBeInTheDocument();
    expect(screen.getByText('Guest account')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('ready:nobody')).toBeInTheDocument();
    expect(service.signOut).toHaveBeenCalled();
  });

  it('shows sign-in failures as alerts, with a generic message for non-Errors', async () => {
    mockFetch(authRoutes());
    const { load, service } = fakeAuthService();
    vi.mocked(service.signInWithGoogle).mockRejectedValueOnce(new Error('Popup closed'));
    vi.mocked(service.signInAsGuest).mockRejectedValueOnce('nope');
    render(
      <AuthProvider load={load}>
        <SignInCard reason="Needed." />
      </AuthProvider>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Popup closed');
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed.');
  });

  it('hides the account area until sign-in is ready', () => {
    mockFetch(baseRoutes());
    render(<AuthProvider>{sidebar}</AuthProvider>);
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(GOOGLE_USER.isGuest).toBe(false);
  });
});
