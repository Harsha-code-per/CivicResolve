import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../../src/domain/analytics.js';
import {
  classifyCategoryDeterministic,
  recommendDepartment,
} from '../../src/domain/departments.js';
import {
  computeUrgencyScore,
  priorityFromScore,
  slaHoursForPriority,
  triageDeterministic,
} from '../../src/domain/priority.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import {
  applyAdminTransition,
  canTransitionStatus,
  filterAndSortIssues,
} from '../../src/domain/workflow.js';

describe('CivicResolve deterministic domain engine', () => {
  it('classifies canonical civic complaints into matching departments', () => {
    const cat = classifyCategoryDeterministic('Overflowing garbage bin', 'Trash piled on footpath');
    expect(cat).toBe('waste_management');
    expect(recommendDepartment(cat)).toBe('Solid Waste Management Department');
  });

  it('always bounds urgency scores to [10, 100] and maps valid SLAs (property-based)', () => {
    fc.assert(
      fc.property(fc.string(), fc.boolean(), (text, hasPhoto) => {
        const score = computeUrgencyScore(text, hasPhoto);
        expect(score).toBeGreaterThanOrEqual(10);
        expect(score).toBeLessThanOrEqual(100);
        const priority = priorityFromScore(score);
        expect(slaHoursForPriority(priority)).toBeGreaterThan(0);
      }),
    );
  });

  it('produces deterministic triage with escalated priority for critical safety hazards', () => {
    const triage = triageDeterministic({
      title: 'Live wire and burst main flooding school road',
      description: 'Exposed wire near flooding junction outside hospital gate.',
      location: 'Avinashi Road',
      hasPhoto: true,
    });
    expect(triage.priority).toBe('critical');
    expect(triage.slaHours).toBe(4);
    expect(triage.source).toBe('deterministic');
  });

  it('enforces valid status transitions and appends immutable audit events', () => {
    const seed = createSeedIssues();
    const issue = seed[1];
    expect(issue).toBeDefined();
    if (!issue) return;

    expect(canTransitionStatus('reported', 'in_progress')).toBe(true);
    expect(canTransitionStatus('resolved', 'reported')).toBe(false);

    const updated = applyAdminTransition(issue, {
      status: 'in_progress',
      note: 'Sanitation truck dispatched.',
      timestamp: '2026-11-21T05:00:00.000Z',
    });
    expect(updated.status).toBe('in_progress');
    expect(updated.timeline).toHaveLength(issue.timeline.length + 1);

    const resolved = applyAdminTransition(updated, {
      status: 'resolved',
      note: 'Area cleared and disinfected.',
      timestamp: '2026-11-21T07:00:00.000Z',
    });
    expect(() =>
      applyAdminTransition(resolved, {
        status: 'reported',
        note: 'Invalid rewind',
        timestamp: '2026-11-21T08:00:00.000Z',
      }),
    ).toThrow(/Invalid status transition/);
  });

  it('filters, sorts by priority, and aggregates analytics accurately', () => {
    const seed = createSeedIssues();
    const analytics = computeAnalytics(seed);
    expect(analytics.total).toBe(seed.length);
    expect(analytics.reported + analytics.inProgress + analytics.resolved).toBe(analytics.total);

    const filtered = filterAndSortIssues(seed, { status: 'reported', query: 'garbage' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('CR-2026-1002');
  });
});
