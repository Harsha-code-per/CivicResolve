import type { IssuePriority, IssueStatus } from '../domain/types.js';

export const STATUS_LABELS: Readonly<Record<IssueStatus, string>> = {
  reported: 'Reported',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const PRIORITY_LABELS: Readonly<Record<IssuePriority, string>> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
