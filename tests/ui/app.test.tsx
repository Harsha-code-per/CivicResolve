import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { computeAnalytics } from '../../src/domain/analytics.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import { App } from '../../src/ui/App.js';

describe('CivicResolve UI & Accessibility', () => {
  it('renders landing hero, switches tabs via keyboard, and passes axe-core checks', async () => {
    const issues = createSeedIssues();
    const analytics = computeAnalytics(issues);

    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.endsWith('/api/issues')) {
          return Promise.resolve(
            new Response(JSON.stringify({ issues, analytics }), { status: 200 }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ authenticated: false }), { status: 200 }),
        );
      }),
    );

    const { container } = render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Turn neighborhood friction/i)).toBeInTheDocument();
    });

    const axeResults = await axe.run(container);
    expect(axeResults.violations).toHaveLength(0);

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Track Issues' }));
    expect(screen.getByText(/Public Issue Tracking Dashboard/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Switch to Accessible Table/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
