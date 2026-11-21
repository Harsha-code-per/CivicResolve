import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App.js';
import { baseRoutes, mockFetch, sampleTriage, seedIssues } from './helpers.js';

describe('App shell', () => {
  it('renders the landing page with live metrics and no axe violations', async () => {
    mockFetch(baseRoutes());
    const { container } = render(<App />);
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/verified resolution/);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    mockFetch(baseRoutes());
    render(<App />);
    const user = userEvent.setup();
    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Report Issue' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{ArrowLeft}');
    expect(overview).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Admin Command' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{Home}');
    expect(overview).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Admin Command' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('a');
    expect(screen.getByRole('tab', { name: 'Admin Command' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('toggles the theme and starts dark when the system prefers it', async () => {
    mockFetch(baseRoutes());
    vi.mocked(window.matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);
    render(<App />);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Dark mode', pressed: true }));
    expect(document.documentElement.dataset['theme']).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: 'Dark mode', pressed: false }));
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('shows a load error when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network down'))),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  });

  it('shows a generic load error for non-Error failures and ignores late replies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('x'))),
    );
    const { unmount } = render(<App />);
    unmount();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject('boom')),
    );
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load civic issues.');
    mockFetch(baseRoutes());
    const second = render(<App />);
    second.unmount();
  });

  it('adds a submitted complaint to the tracker and an admin update replaces it', async () => {
    const issues = seedIssues();
    const created = {
      ...issues[1],
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
    render(<App />);
    const user = userEvent.setup();
    await screen.findByText('4');

    await user.click(screen.getByRole('tab', { name: 'Report Issue' }));
    await user.type(screen.getByLabelText('Issue Title'), created.title);
    await user.type(screen.getByLabelText('Location / Landmark'), 'Peelamedu');
    await user.type(
      screen.getByLabelText('Detailed Description'),
      'Knee-deep flooding across lanes.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit Grievance' }));
    expect(await screen.findByRole('status')).toHaveTextContent('CR-2026-1005');

    await user.click(screen.getByRole('tab', { name: 'Track Issues' }));
    expect(screen.getByText('Showing 5 of 5 grievances (1 resolved).')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Admin Command' }));
    await user.type(
      screen.getByLabelText('Resolution / Dispatch Audit Note', { selector: '#note-CR-2026-1005' }),
      'Crew sent',
    );
    await user.selectOptions(
      screen.getByLabelText('Status', { selector: '#status-CR-2026-1005' }),
      'in_progress',
    );
    await user.click(screen.getAllByRole('button', { name: 'Save Status Update' })[0]!);
    await waitFor(() => {
      expect(screen.getByText('Updated CR-2026-1005 to in_progress.')).toBeInTheDocument();
    });
  });
});
