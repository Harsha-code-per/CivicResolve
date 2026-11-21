import { PRIORITY_RANK, slaHoursForPriority } from './priority.js';
import type {
  CivicIssue,
  IssueFilters,
  IssuePriority,
  IssueStatus,
  MunicipalDepartment,
  StatusEvent,
} from './types.js';

const ALLOWED_TRANSITIONS: Readonly<Record<IssueStatus, readonly IssueStatus[]>> = {
  reported: ['reported', 'in_progress', 'resolved'],
  in_progress: ['in_progress', 'resolved', 'reported'],
  resolved: ['resolved', 'in_progress'],
};

/**
 * Checks whether a status transition is permitted by the civic resolution workflow.
 *
 * @param current - Current issue status.
 * @param next - Desired next status.
 * @returns True if the transition is valid.
 */
export function canTransitionStatus(current: IssueStatus, next: IssueStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

export interface AdminTransitionParams {
  readonly status: IssueStatus;
  readonly note: string;
  readonly timestamp: string;
  readonly department?: MunicipalDepartment;
  readonly priority?: IssuePriority;
}

/**
 * Produces an updated CivicIssue with an appended immutable audit timeline entry.
 *
 * @param issue - Existing civic issue record.
 * @param params - Admin transition parameters.
 * @returns Updated CivicIssue record.
 */
export function applyAdminTransition(issue: CivicIssue, params: AdminTransitionParams): CivicIssue {
  if (!canTransitionStatus(issue.status, params.status)) {
    throw new Error(`Invalid status transition from ${issue.status} to ${params.status}.`);
  }

  const nextPriority = params.priority ?? issue.priority;
  const nextDepartment = params.department ?? issue.department;
  const event: StatusEvent = {
    status: params.status,
    timestamp: params.timestamp,
    actor: 'admin',
    note: params.note,
  };

  return {
    ...issue,
    status: params.status,
    priority: nextPriority,
    slaHours: slaHoursForPriority(nextPriority),
    department: nextDepartment,
    updatedAt: params.timestamp,
    timeline: [...issue.timeline, event],
  };
}

/**
 * Checks whether an issue matches a free-text search query.
 *
 * @param issue - Civic issue record.
 * @param query - Optional search query.
 * @returns True if query is empty or matches title, description, location, or id.
 */
function matchesQuery(issue: CivicIssue, query?: string): boolean {
  const term = query?.trim().toLowerCase() ?? '';
  if (!term) return true;
  const haystack = `${issue.id} ${issue.title} ${issue.description} ${issue.location}`.toLowerCase();
  return haystack.includes(term);
}

/**
 * Filters and sorts civic issues by priority urgency and recency.
 *
 * @param issues - Full list of civic issues.
 * @param filters - Active status, priority, department, and text filters.
 * @returns New sorted array of matching issues.
 */
export function filterAndSortIssues(
  issues: readonly CivicIssue[],
  filters: IssueFilters,
): CivicIssue[] {
  return issues
    .filter((issue) => {
      if (filters.status && filters.status !== 'all' && issue.status !== filters.status) {
        return false;
      }
      if (filters.priority && filters.priority !== 'all' && issue.priority !== filters.priority) {
        return false;
      }
      if (
        filters.department &&
        filters.department !== 'all' &&
        issue.department !== filters.department
      ) {
        return false;
      }
      return matchesQuery(issue, filters.query);
    })
    .sort((left, right) => {
      const rankDiff = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
      if (rankDiff !== 0) return rankDiff;
      return right.createdAt.localeCompare(left.createdAt);
    });
}
