import { PRIORITY_RANK, slaHoursForPriority } from './priority.js';
import type { CreateIssueInput } from './schemas.js';
import type {
  CivicIssue,
  IssueFilters,
  IssuePriority,
  IssueStatus,
  MunicipalDepartment,
  StatusEvent,
  TriageResult,
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

/** Raised when an admin asks for a status change the workflow does not allow. */
export class InvalidTransitionError extends Error {
  constructor(from: IssueStatus, to: IssueStatus) {
    super(`Invalid status transition from ${from} to ${to}.`);
    this.name = 'InvalidTransitionError';
  }
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
    throw new InvalidTransitionError(issue.status, params.status);
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
  const haystack =
    `${issue.id} ${issue.title} ${issue.description} ${issue.location}`.toLowerCase();
  return haystack.includes(term);
}

/**
 * Checks one facet filter, where an absent filter or 'all' matches everything.
 *
 * @param value - The issue's value for this facet.
 * @param filter - The selected filter value.
 * @returns True if the issue passes this facet.
 */
function matchesFacet<T extends string>(value: T, filter?: T | 'all'): boolean {
  return !filter || filter === 'all' || value === filter;
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
    .filter(
      (issue) =>
        matchesFacet(issue.status, filters.status) &&
        matchesFacet(issue.priority, filters.priority) &&
        matchesFacet(issue.department, filters.department) &&
        matchesQuery(issue, filters.query),
    )
    .sort((left, right) => {
      const rankDiff = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
      if (rankDiff !== 0) return rankDiff;
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export interface NewIssueParams {
  readonly id: string;
  readonly input: CreateIssueInput;
  readonly triage: TriageResult;
  readonly nowIso: string;
}

/**
 * Builds a new Reported issue from a citizen's complaint and its triage.
 *
 * Shared by every store so in-memory and Firestore records are identical.
 *
 * @param params - Assigned id, validated input, triage result and creation time.
 * @returns New CivicIssue with its first audit timeline entry.
 */
export function buildIssueRecord({ id, input, triage, nowIso }: NewIssueParams): CivicIssue {
  return {
    id,
    title: input.title,
    description: input.description,
    location: input.location,
    category: triage.category,
    priority: triage.priority,
    urgencyScore: triage.urgencyScore,
    department: triage.department,
    slaHours: triage.slaHours,
    status: 'reported',
    aiSummary: triage.summary,
    aiRationale: triage.rationale,
    triageSource: triage.source,
    hasImage: Boolean(input.imageDataUrl),
    createdAt: nowIso,
    updatedAt: nowIso,
    timeline: [
      {
        status: 'reported',
        timestamp: nowIso,
        actor: 'citizen',
        note: `Submitted by citizen and triaged (${triage.source}) to ${triage.department}.`,
      },
    ],
  };
}

/** Prefix of every complaint reference number. */
const ISSUE_ID_PREFIX = 'CR-2026-';

/**
 * Formats a sequence number as a public complaint reference.
 *
 * @param sequence - Monotonic sequence number.
 * @returns Reference such as CR-2026-1005.
 */
export function formatIssueId(sequence: number): string {
  return `${ISSUE_ID_PREFIX}${String(sequence)}`;
}
