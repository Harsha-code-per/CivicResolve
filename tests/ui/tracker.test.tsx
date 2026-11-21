import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { computeAnalytics } from '../../src/domain/analytics.js';
import { IssueTracker } from '../../src/ui/IssueTracker.js';
import { Landing } from '../../src/landing/Landing.js';
import { Dashboard } from '../../src/ui/Dashboard.js';
import { ResolutionProgress } from '../../src/ui/ResolutionProgress.js';
import { TriageInspector } from '../../src/ui/TriageInspector.js';
import { sampleTriage, seedIssues } from './helpers.js';

const NOW = Date.parse('2026-11-22T00:00:00.000Z');

describe('IssueTracker', () => {
  it('filters by text and facets, shows SLA badges, photos and the table view', async () => {
    const issues = seedIssues();
    const first = issues[0];
    if (first) issues[0] = { ...first, hasImage: true, triageSource: 'gemini' };
    const fresh = issues[2];
    if (fresh) issues[2] = { ...fresh, createdAt: new Date(NOW - 3_600_000).toISOString() };
    render(<IssueTracker issues={issues} analytics={computeAnalytics(issues, NOW)} nowMs={NOW} />);
    const user = userEvent.setup();

    expect(screen.getByAltText(/Citizen evidence: Deep pothole/)).toHaveAttribute(
      'src',
      '/api/issues/CR-2026-1001/image',
    );
    expect(screen.getAllByText(/Overdue by/).length).toBeGreaterThan(0);
    expect(screen.getByText('Resolved after SLA')).toBeInTheDocument();
    expect(screen.getByText('Due in 23h')).toBeInTheDocument();
    expect(screen.getByText(/Triaged by Gemini/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search ID, title, or location'), 'garbage');
    expect(screen.getByText('Showing 1 of 4 grievances (1 resolved).')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search ID, title, or location'));
    await user.selectOptions(screen.getByLabelText('Status'), 'resolved');
    await user.selectOptions(screen.getByLabelText('Priority'), 'critical');
    await user.selectOptions(screen.getByLabelText('Department'), 'Water Supply & Drainage Board');
    expect(screen.getByText('Showing 1 of 4 grievances (1 resolved).')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show as table' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'CR-2026-1004' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show as cards' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows "No data yet" before anything is resolved', () => {
    render(<ResolutionProgress analytics={computeAnalytics([], NOW)} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

describe('Dashboard, Landing and TriageInspector', () => {
  it('shows headline numbers and the latest reports', () => {
    const issues = seedIssues();
    const { rerender } = render(
      <Dashboard issues={issues} analytics={computeAnalytics(issues, NOW)} nowMs={NOW} loading />,
    );
    expect(screen.getAllByText('…')).toHaveLength(4);
    rerender(
      <Dashboard
        issues={issues}
        analytics={computeAnalytics(issues, NOW)}
        nowMs={NOW}
        loading={false}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Resolution rate' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '#/track');
  });

  it('links the landing calls to action into the console', () => {
    render(
      <Landing
        analytics={computeAnalytics(seedIssues(), NOW)}
        loading={false}
        theme="light"
        onToggleTheme={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: 'Report an issue' })).toHaveAttribute(
      'href',
      '#/report',
    );
    expect(screen.getByRole('link', { name: 'Open console' })).toHaveAttribute(
      'href',
      '#/dashboard',
    );
  });

  it('explains the empty state and shows the rule engine when no model answered', () => {
    const { rerender } = render(<TriageInspector triage={null} />);
    expect(screen.getByText(/Preview AI triage/)).toBeInTheDocument();
    rerender(<TriageInspector triage={sampleTriage} />);
    expect(screen.getByText('Engine: deterministic')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Urgency score' })).toBeInTheDocument();
  });
});
