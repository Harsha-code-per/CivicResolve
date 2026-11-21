import {
  ISSUE_PRIORITIES,
  MUNICIPAL_DEPARTMENTS,
  type CivicIssue,
  type IssueAnalytics,
  type IssuePriority,
  type MunicipalDepartment,
} from './types.js';

/**
 * Computes deterministic dashboard KPIs and category/department breakdowns.
 *
 * @param issues - List of civic issues to aggregate.
 * @returns Complete IssueAnalytics summary object.
 */
export function computeAnalytics(issues: readonly CivicIssue[]): IssueAnalytics {
  const byDepartment = Object.fromEntries(
    MUNICIPAL_DEPARTMENTS.map((dept) => [dept, 0]),
  ) as Record<MunicipalDepartment, number>;

  const byPriority = Object.fromEntries(ISSUE_PRIORITIES.map((prio) => [prio, 0])) as Record<
    IssuePriority,
    number
  >;

  let reported = 0;
  let inProgress = 0;
  let resolved = 0;
  let criticalOpen = 0;

  for (const issue of issues) {
    byDepartment[issue.department] += 1;
    byPriority[issue.priority] += 1;

    if (issue.status === 'reported') reported += 1;
    if (issue.status === 'in_progress') inProgress += 1;
    if (issue.status === 'resolved') resolved += 1;
    if (issue.priority === 'critical' && issue.status !== 'resolved') criticalOpen += 1;
  }

  const total = issues.length;
  const resolutionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);

  return {
    total,
    reported,
    inProgress,
    resolved,
    criticalOpen,
    resolutionRate,
    byDepartment,
    byPriority,
  };
}
