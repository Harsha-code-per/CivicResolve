import type { CivicIssue, SlaState } from './types.js';

export const MS_PER_HOUR = 3_600_000;

/**
 * Finds when an issue was last marked resolved, from its audit timeline.
 *
 * @param issue - Civic issue record.
 * @returns ISO timestamp of the latest resolution event, or undefined if still open.
 */
export function resolvedAt(issue: CivicIssue): string | undefined {
  if (issue.status !== 'resolved') return undefined;
  return issue.timeline.findLast((event) => event.status === 'resolved')?.timestamp;
}

/**
 * Computes the SLA due time and whether it has been breached.
 *
 * A resolved issue is judged at the moment it was resolved, so fixing a road late
 * stays recorded as a breach. The clock is passed in to keep the domain pure.
 *
 * @param issue - Civic issue record.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Due time, signed hours remaining (negative when late), and breach flag.
 */
export function computeSlaState(issue: CivicIssue, nowMs: number): SlaState {
  const dueMs = Date.parse(issue.createdAt) + issue.slaHours * MS_PER_HOUR;
  const closedAt = resolvedAt(issue);
  const referenceMs = closedAt ? Date.parse(closedAt) : nowMs;
  const hoursRemaining = Math.round((dueMs - referenceMs) / MS_PER_HOUR);
  return {
    dueAt: new Date(dueMs).toISOString(),
    hoursRemaining,
    breached: referenceMs > dueMs,
  };
}

/**
 * Describes an SLA state in plain words for badges and screen readers.
 *
 * @param issue - Civic issue record.
 * @param nowMs - Current time in epoch milliseconds.
 * @returns Short label such as "Due in 5h", "Overdue by 3h" or "Resolved within SLA".
 */
export function describeSla(issue: CivicIssue, nowMs: number): string {
  const sla = computeSlaState(issue, nowMs);
  if (issue.status === 'resolved') {
    return sla.breached ? 'Resolved after SLA' : 'Resolved within SLA';
  }
  if (sla.breached) return `Overdue by ${String(Math.abs(sla.hoursRemaining))}h`;
  return `Due in ${String(sla.hoursRemaining)}h`;
}
