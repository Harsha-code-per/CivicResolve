import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.js';
import { baseRoutes, mockFetch, sampleTriage, seedIssues } from './helpers.js';

const go = (hash: string) => {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

afterEach(() => {
  window.location.hash = '';
  localStorage.clear();
});

describe('landing page', () => {
  it('shows the hero, live numbers and no axe violations', async () => {
    mockFetch(baseRoutes());
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/See it resolved/);
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    expect(await screen.findByText('Reports filed')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('…')).not.toBeInTheDocument();
    });
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('toggles and remembers the colour theme', async () => {
    mockFetch(baseRoutes());
    document.documentElement.dataset['theme'] = 'dark';
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Dark mode', pressed: true }));
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('cr-theme')).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: 'Dark mode', pressed: false }));
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('shows load errors, with a generic message for non-Error failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network down'))),
    );
    const first = render(<App />);
    expect(await screen.findByText('Network down')).toBeInTheDocument();
    first.unmount();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject('boom')),
    );
    render(<App />);
    expect(await screen.findByText('Unable to load civic issues.')).toBeInTheDocument();
  });

  it('ignores replies that arrive after unmounting', async () => {
    mockFetch(baseRoutes());
    render(<App />).unmount();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('late'))),
    );
    render(<App />).unmount();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('late')).not.toBeInTheDocument();
  });
});

describe('console', () => {
  it('renders each section from the URL hash with one h1 and focus on main', async () => {
    mockFetch(baseRoutes());
    window.location.hash = '#/dashboard';
    const { container } = render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'City resolution overview' }),
    ).toBeVisible();
    expect(await screen.findByText(/Deep pothole near PSG iTech/)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect((await axe.run(container)).violations).toEqual([]);

    const pages: [string, string][] = [
      ['#/report', 'Report a civic issue'],
      ['#/track', 'Live issue tracker'],
      ['#/mine', 'My reports'],
      ['#/admin', 'Admin console sign-in'],
    ];
    for (const [hash, title] of pages) {
      go(hash);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      expect(screen.getByRole('link', { current: 'page' })).toBeInTheDocument();
    }
    go('#/unknown');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/See it resolved/);
  });

  it('collapses the sidebar to an icon rail and remembers it', async () => {
    mockFetch(baseRoutes());
    window.location.hash = '#/track';
    const { container } = render(<App />);
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('.console')).toHaveAttribute('data-collapsed', 'true');
    expect(localStorage.getItem('cr-sidebar-collapsed')).toBe('1');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('title', 'Overview');
    await userEvent.click(toggle);
    expect(localStorage.getItem('cr-sidebar-collapsed')).toBe('0');
  });

  it('opens the mobile drawer and closes it with Escape, the scrim, or a link', async () => {
    mockFetch(baseRoutes());
    window.location.hash = '#/track';
    const { container } = render(<App />);
    const user = userEvent.setup();
    const menu = screen.getByRole('button', { name: 'Menu' });
    const layout = container.querySelector('.console');
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('a');
    expect(layout).toHaveAttribute('data-drawer', 'true');
    await user.keyboard('{Escape}');
    expect(layout).toHaveAttribute('data-drawer', 'false');
    await user.click(menu);
    await user.click(container.querySelector<HTMLElement>('.scrim')!);
    expect(layout).toHaveAttribute('data-drawer', 'false');
    await user.click(menu);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Console' })).getByText('Overview'),
    );
    expect(layout).toHaveAttribute('data-drawer', 'false');
  });

  it('files a report, shows it in the tracker, and lets an admin update it', async () => {
    const issues = seedIssues();
    const created = {
      ...issues[1]!,
      id: 'CR-2026-1005',
      title: 'Severe waterlogging blocking road',
    };
    mockFetch({
      ...baseRoutes(issues, true),
      'POST /api/issues': () => ({ status: 201, body: { issue: created, triage: sampleTriage } }),
      'PATCH /api/admin/issues/CR-2026-1005': () => ({
        body: { issue: { ...created, status: 'in_progress' } },
      }),
    });
    window.location.hash = '#/report';
    render(<App />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Issue title'), created.title);
    await user.type(screen.getByLabelText('Location or landmark'), 'Peelamedu');
    await user.type(screen.getByLabelText('What is wrong?'), 'Knee-deep flooding across lanes.');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('status')).toHaveTextContent('CR-2026-1005');

    go('#/track');
    expect(screen.getByText('Showing 5 of 5 grievances (1 resolved).')).toBeInTheDocument();

    go('#/admin');
    await user.type(
      screen.getByLabelText('Audit note (required)', { selector: '#note-CR-2026-1005' }),
      'Crew sent',
    );
    await user.selectOptions(
      screen.getByLabelText('Status', { selector: '#status-CR-2026-1005' }),
      'in_progress',
    );
    await user.click(screen.getByRole('button', { name: 'Save update for CR-2026-1005' }));
    expect(await screen.findByText('Updated CR-2026-1005 to in_progress.')).toBeInTheDocument();
  });
});
