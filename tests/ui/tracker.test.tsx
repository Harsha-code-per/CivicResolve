import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { computeAnalytics } from '../../src/domain/analytics.js';
import { IssueTracker } from '../../src/ui/IssueTracker.js';
import { LandingHero } from '../../src/ui/LandingHero.js';
import { ResolutionProgress } from '../../src/ui/ResolutionProgress.js';
import { TriageInspector } from '../../src/ui/TriageInspector.js';
import { sampleTriage, seedIssues } from './helpers.js';

const NOW = Date.parse('2026-11-22T00:00:00.000Z');

describe('IssueTracker', () => {
  it('filters by text and facets, shows SLA badges, photos and the table view', async () => {
    const issues = seedIssues();
    const first = issues[0];
    if (first) issues[0] = { ...first, hasImage: true, triageSource: 'gemini' };
    render(<IssueTracker issues={issues} analytics={computeAnalytics(issues, NOW)} nowMs={NOW} />);
    const user = userEvent.setup();

    expect(screen.getByAltText(/Citizen evidence: Deep pothole/)).toHaveAttribute(
      'src',
      '/api/issues/CR-2026-1001/image',
    );
    expect(screen.getAllByText(/Overdue by/).length).toBeGreaterThan(0);
    expect(screen.getByText('Resolved after SLA')).toBeInTheDocument();
    expect(screen.getByText(/Triaged by Gemini/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search ID, title, or location'), 'garbage');
    expect(screen.getByText('Showing 1 of 4 grievances (1 resolved).')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search ID, title, or location'));
    await user.selectOptions(screen.getByLabelText('Status'), 'resolved');
    await user.selectOptions(screen.getByLabelText('Priority'), 'critical');
    await user.selectOptions(screen.getByLabelText('Department'), 'Water Supply & Drainage Board');
    expect(screen.getByText('Showing 1 of 4 grievances (1 resolved).')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch to Accessible Table' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'CR-2026-1004' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to Card View' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows "No data yet" before anything is resolved', () => {
    render(<ResolutionProgress analytics={computeAnalytics([], NOW)} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

describe('LandingHero and TriageInspector', () => {
  it('navigates from the hero call-to-action buttons', async () => {
    const onNavigate = vi.fn();
    render(<LandingHero analytics={computeAnalytics(seedIssues(), NOW)} onNavigate={onNavigate} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Report a Civic Issue' }));
    await user.click(screen.getByRole('button', { name: 'Explore Live Tracker' }));
    await user.click(screen.getByRole('button', { name: 'Open Admin Command' }));
    expect(onNavigate.mock.calls.flat()).toEqual(['report', 'tracker', 'admin']);
  });

  it('explains the empty state and shows the rule engine when no model answered', () => {
    const { rerender } = render(<TriageInspector triage={null} />);
    expect(screen.getByText(/Preview AI Triage/)).toBeInTheDocument();
    rerender(<TriageInspector triage={sampleTriage} />);
    expect(screen.getByText('Engine: deterministic')).toBeInTheDocument();
  });
});
