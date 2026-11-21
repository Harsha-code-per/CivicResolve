import { computeSlaState, MS_PER_HOUR, resolvedAt } from './sla.js';
import {
  ISSUE_PRIORITIES,
  MUNICIPAL_DEPARTMENTS,
  type CivicIssue,
  type DepartmentProgress,
  type IssueAnalytics,
  type IssuePriority,
} from './types.js';

const PERCENT = 100;
const HALF = 2;

/**
 * Returns the median of a list of numbers, or null for an empty list.
 *
 * @param values - Numbers to summarise.
 * @returns Median value rounded to one decimal place, or null.
 */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / HALF);
  const start = sorted.length % HALF === 0 ? mid - 1 : mid;
  const middle = sorted.slice(start, mid + 1);
  const value = middle.reduce((sum, item) => sum + item, 0) / middle.length;
  return Math.round(value * 10) / 10;
}

/**
 * Hours between submission and resolution for every resolved issue.
 *
 * @param issues - Civic issues.
 * @returns Resolution durations in hours.
 */
function resolutionDurations(issues: readonly CivicIssue[]): number[] {
  return issues.flatMap((issue) => {
    const closed = resolvedAt(issue);
    return closed ? [(Date.parse(closed) - Date.parse(issue.createdAt)) / MS_PER_HOUR] : [];
  });
}

/**
 * Counts open and resolved issues for every department, in a fixed order.
 *
 * @param issues - Civic issues.
 * @returns One progress row per municipal department.
 */
function departmentProgress(issues: readonly CivicIssue[]): DepartmentProgress[] {
  return MUNICIPAL_DEPARTMENTS.map((department) => {
    const owned = issues.filter((issue) => issue.department === department);
    const resolved = owned.filter((issue) => issue.status === 'resolved').length;
    return { department, open: owned.length - resolved, resolved };
  });
}

/**
 * Computes dashboard KPIs, SLA breaches and per-department progress.
 *
 * @param issues - List of civic issues to aggregate.
 * @param nowMs - Current time in epoch milliseconds (passed in to keep the domain pure).
 * @returns Complete IssueAnalytics summary object.
 */
export function computeAnalytics(issues: readonly CivicIssue[], nowMs: number): IssueAnalytics {
  const count = (predicate: (issue: CivicIssue) => boolean): number =>
    issues.filter(predicate).length;
  const open = (issue: CivicIssue): boolean => issue.status !== 'resolved';

  const byPriority = Object.fromEntries(
    ISSUE_PRIORITIES.map((priority) => [priority, count((issue) => issue.priority === priority)]),
  ) as Record<IssuePriority, number>;

  const resolved = count((issue) => issue.status === 'resolved');
  const total = issues.length;

  return {
    total,
    reported: count((issue) => issue.status === 'reported'),
    inProgress: count((issue) => issue.status === 'in_progress'),
    resolved,
    criticalOpen: count((issue) => issue.priority === 'critical' && open(issue)),
    resolutionRate: total === 0 ? 0 : Math.round((resolved / total) * PERCENT),
    overdueOpen: count((issue) => open(issue) && computeSlaState(issue, nowMs).breached),
    medianResolutionHours: median(resolutionDurations(issues)),
    byPriority,
    departmentProgress: departmentProgress(issues),
  };
}
