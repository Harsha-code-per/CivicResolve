import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../../src/domain/analytics.js';
import {
  CATEGORY_TO_DEPARTMENT,
  classifyCategoryDeterministic,
  recommendDepartment,
} from '../../src/domain/departments.js';
import {
  computeUrgencyScore,
  moreUrgent,
  PRIORITY_SCORE_FLOOR,
  priorityFromScore,
  reconcileTriage,
  slaHoursForPriority,
  triageDeterministic,
} from '../../src/domain/priority.js';
import { adminUpdateIssueSchema, createIssueSchema } from '../../src/domain/schemas.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import { computeSlaState, describeSla, MS_PER_HOUR, resolvedAt } from '../../src/domain/sla.js';
import {
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  type CivicIssue,
  type IssuePriority,
} from '../../src/domain/types.js';
import {
  applyAdminTransition,
  buildIssueRecord,
  canTransitionStatus,
  filterAndSortIssues,
  formatIssueId,
  InvalidTransitionError,
} from '../../src/domain/workflow.js';

const seed = createSeedIssues();
const byId = (id: string): CivicIssue => {
  const issue = seed.find((item) => item.id === id);
  if (!issue) throw new Error(`missing seed ${id}`);
  return issue;
};

describe('department routing', () => {
  it('routes every category to exactly one department', () => {
    for (const category of ISSUE_CATEGORIES) {
      expect(recommendDepartment(category)).toBe(CATEGORY_TO_DEPARTMENT[category]);
    }
  });

  it('classifies by keywords, and falls back to the citizen hint or roads', () => {
    expect(classifyCategoryDeterministic('Overflowing garbage bin', 'Trash on footpath')).toBe(
      'waste_management',
    );
    expect(classifyCategoryDeterministic('Something odd', 'Hard to say', 'public_health')).toBe(
      'public_health',
    );
    expect(classifyCategoryDeterministic('Something odd', 'Hard to say')).toBe('roads_potholes');
  });
});

describe('priority engine', () => {
  it('keeps urgency within [10, 100] and maps every score to a priority with an SLA', () => {
    fc.assert(
      fc.property(fc.string(), fc.boolean(), (text, hasPhoto) => {
        const score = computeUrgencyScore(text, hasPhoto);
        expect(score).toBeGreaterThanOrEqual(10);
        expect(score).toBeLessThanOrEqual(100);
        expect(slaHoursForPriority(priorityFromScore(score))).toBeGreaterThan(0);
      }),
    );
  });

  it('maps score bands to priorities', () => {
    expect(priorityFromScore(90)).toBe('critical');
    expect(priorityFromScore(60)).toBe('high');
    expect(priorityFromScore(40)).toBe('medium');
    expect(priorityFromScore(20)).toBe('low');
  });

  it('escalates life-safety hazards to critical with a 4h SLA', () => {
    const triage = triageDeterministic({
      title: 'Live wire and burst main flooding school road',
      description: 'Exposed wire near flooding junction outside hospital gate.',
      location: 'Avinashi Road',
      hasPhoto: true,
    });
    expect(triage).toMatchObject({ priority: 'critical', slaHours: 4, source: 'deterministic' });
  });

  it('honours the category hint and rates a cosmetic issue low', () => {
    const triage = triageDeterministic({
      title: 'Faded paint',
      description: 'Paint on the bench is faded.',
      location: 'Park',
      category: 'public_health',
    });
    expect(triage.category).toBe('public_health');
    expect(triage.priority).toBe('low');
  });

  it('picks the more urgent of two priorities (property)', () => {
    const priority = fc.constantFrom(...ISSUE_PRIORITIES);
    fc.assert(
      fc.property(priority, priority, (a: IssuePriority, b: IssuePriority) => {
        const winner = moreUrgent(a, b);
        expect([a, b]).toContain(winner);
        expect(moreUrgent(b, a)).toBe(winner);
      }),
    );
  });

  it('never lets Gemini downgrade a hazard the rules flag, and keeps score in band', () => {
    const rules = triageDeterministic({
      title: 'Exposed live wire',
      description: 'Live wire hanging near the school gate.',
      location: 'Peelamedu',
    });
    const merged = reconcileTriage(
      {
        category: 'street_lighting',
        priority: 'low',
        department: 'Street Lighting & Electrical Wing',
        summary: 'Wire hanging from pole near school.',
        rationale: 'Model under-rated the hazard.',
      },
      rules,
      'gemini-test',
    );
    expect(merged.priority).toBe(rules.priority);
    expect(merged.urgencyScore).toBeGreaterThanOrEqual(PRIORITY_SCORE_FLOOR[merged.priority]);
    expect(merged).toMatchObject({ source: 'gemini', model: 'gemini-test' });
  });

  it('lets Gemini raise a priority and lifts the score to that band', () => {
    const rules = triageDeterministic({
      title: 'Paint faded',
      description: 'Bench paint is faded in the park.',
      location: 'Park',
    });
    const merged = reconcileTriage(
      {
        category: 'traffic_safety',
        priority: 'critical',
        department: 'Traffic & Public Safety Authority',
        summary: 'Photo shows a collapsed signal pole.',
        rationale: 'Visual evidence of danger.',
      },
      rules,
      'gemini-test',
    );
    expect(merged.priority).toBe('critical');
    expect(merged.slaHours).toBe(4);
    expect(merged.urgencyScore).toBe(PRIORITY_SCORE_FLOOR.critical);
  });
});

describe('SLA tracking', () => {
  const resolvedIssue = byId('CR-2026-1004');
  const openIssue = byId('CR-2026-1002');

  it('finds the resolution time only for resolved issues', () => {
    expect(resolvedAt(resolvedIssue)).toBe('2026-11-18T08:20:00.000Z');
    expect(resolvedAt(openIssue)).toBeUndefined();
  });

  it('counts down for an open issue and flags it once overdue', () => {
    const created = Date.parse(openIssue.createdAt);
    expect(describeSla(openIssue, created + 4 * MS_PER_HOUR)).toBe('Due in 20h');
    expect(describeSla(openIssue, created + 27 * MS_PER_HOUR)).toBe('Overdue by 3h');
    expect(computeSlaState(openIssue, created + 27 * MS_PER_HOUR).breached).toBe(true);
  });

  it('judges a resolved issue at its resolution time, not now', () => {
    const farFuture = Date.parse('2030-01-01T00:00:00.000Z');
    expect(describeSla(resolvedIssue, farFuture)).toBe('Resolved after SLA');
    const quick = { ...resolvedIssue, slaHours: 24 };
    expect(describeSla(quick, farFuture)).toBe('Resolved within SLA');
  });
});

describe('workflow', () => {
  it('allows only valid transitions and appends an audit event', () => {
    expect(canTransitionStatus('reported', 'in_progress')).toBe(true);
    expect(canTransitionStatus('resolved', 'reported')).toBe(false);

    const updated = applyAdminTransition(byId('CR-2026-1002'), {
      status: 'in_progress',
      note: 'Sanitation truck dispatched.',
      timestamp: '2026-11-21T05:00:00.000Z',
      priority: 'critical',
      department: 'Public Health & Sanitation Cell',
    });
    expect(updated).toMatchObject({
      status: 'in_progress',
      priority: 'critical',
      slaHours: 4,
      department: 'Public Health & Sanitation Cell',
    });
    expect(updated.timeline.at(-1)).toMatchObject({ actor: 'admin', status: 'in_progress' });
  });

  it('rejects rewinding a resolved issue to reported', () => {
    expect(() =>
      applyAdminTransition(byId('CR-2026-1004'), {
        status: 'reported',
        note: 'Invalid rewind',
        timestamp: '2026-11-21T08:00:00.000Z',
      }),
    ).toThrow(InvalidTransitionError);
  });

  it('filters by every facet and free text, sorted by priority then recency', () => {
    expect(filterAndSortIssues(seed, {}).map((issue) => issue.priority)).toEqual([
      'critical',
      'critical',
      'high',
      'high',
    ]);
    expect(filterAndSortIssues(seed, { status: 'reported', query: 'garbage' })[0]?.id).toBe(
      'CR-2026-1002',
    );
    expect(filterAndSortIssues(seed, { priority: 'critical', status: 'all' })).toHaveLength(2);
    expect(
      filterAndSortIssues(seed, { department: 'Water Supply & Drainage Board', query: '  ' }),
    ).toHaveLength(1);
    expect(filterAndSortIssues(seed, { query: 'no-such-thing' })).toHaveLength(0);
  });

  it('builds a new reported record with a photo flag and formats ids', () => {
    const triage = triageDeterministic({
      title: 'Overflowing bin',
      description: 'Garbage bin overflowing for days.',
      location: 'RS Puram',
    });
    const record = buildIssueRecord({
      id: formatIssueId(1010),
      input: {
        title: 'Overflowing bin',
        description: 'Garbage bin overflowing for days.',
        location: 'RS Puram',
        imageDataUrl: 'data:image/png;base64,AAAA',
      },
      triage,
      nowIso: '2026-11-21T00:00:00.000Z',
    });
    expect(record).toMatchObject({ id: 'CR-2026-1010', status: 'reported', hasImage: true });
    expect(record.timeline).toHaveLength(1);
  });
});

describe('analytics', () => {
  it('aggregates statuses, SLA breaches, departments and median resolution time', () => {
    const analytics = computeAnalytics(seed, Date.parse('2026-11-22T00:00:00.000Z'));
    expect(analytics.total).toBe(seed.length);
    expect(analytics.reported + analytics.inProgress + analytics.resolved).toBe(analytics.total);
    expect(analytics.overdueOpen).toBe(3);
    expect(analytics.medianResolutionHours).toBe(5.5);
    expect(analytics.departmentProgress).toHaveLength(6);
    expect(analytics.byPriority.critical).toBe(2);
  });

  it('handles an empty list and an even number of resolved issues', () => {
    expect(computeAnalytics([], 0)).toMatchObject({
      total: 0,
      resolutionRate: 0,
      medianResolutionHours: null,
    });
    const resolved = byId('CR-2026-1004');
    const slower = {
      ...resolved,
      id: 'CR-2026-2000',
      timeline: [
        ...resolved.timeline.slice(0, -1),
        {
          status: 'resolved' as const,
          timestamp: '2026-11-18T12:50:00.000Z',
          actor: 'admin' as const,
          note: 'Done',
        },
      ],
    };
    expect(computeAnalytics([resolved, slower], 0).medianResolutionHours).toBe(7.8);
  });
});

describe('schemas', () => {
  it('reports friendly length messages from the shared field limits', () => {
    const result = createIssueSchema.safeParse({ title: 'x', description: 'short', location: 'a' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Title must be at least 5 characters.');
    const tooLong = adminUpdateIssueSchema.safeParse({ status: 'resolved', note: 'x'.repeat(401) });
    expect(tooLong.error?.issues[0]?.message).toBe('Audit note must be at most 400 characters.');
  });
});
