import {
  CATEGORY_LABELS,
  classifyCategoryDeterministic,
  recommendDepartment,
} from './departments.js';
import type { IssueCategory, IssuePriority, TriageResult } from './types.js';

export const PRIORITY_SLA_HOURS: Readonly<Record<IssuePriority, number>> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export const PRIORITY_RANK: Readonly<Record<IssuePriority, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const CRITICAL_SIGNALS = [
  'exposed wire',
  'live wire',
  'electrocution',
  'sinkhole',
  'gas leak',
  'burst main',
  'collapse',
  'accident',
  'hospital',
  'school',
  'flooding',
  'fire',
] as const;

const HIGH_SIGNALS = [
  'broken',
  'overflowing',
  'sewage',
  'major',
  'deep pothole',
  'no light',
  'pitch dark',
  'signal down',
  'blocked',
  'leaking',
  'hazard',
] as const;

const MEDIUM_SIGNALS = ['damaged', 'cracked', 'flickering', 'clogged', 'pile', 'slow'] as const;

/**
 * Counts how many urgency signals appear in the normalized complaint text.
 *
 * @param text - Lowercased complaint text.
 * @param signals - Signal phrases to check.
 * @returns Match count.
 */
function matchSignals(text: string, signals: readonly string[]): number {
  return signals.reduce((sum, signal) => (text.includes(signal) ? sum + 1 : sum), 0);
}

/**
 * Computes a deterministic 0–100 urgency and public-impact score.
 *
 * @param text - Combined title, description, and location.
 * @param hasPhoto - Whether visual evidence was attached.
 * @returns Integer urgency score clamped to [10, 100].
 */
export function computeUrgencyScore(text: string, hasPhoto: boolean): number {
  const normalized = text.toLowerCase();
  const criticalHits = matchSignals(normalized, CRITICAL_SIGNALS);
  const highHits = matchSignals(normalized, HIGH_SIGNALS);
  const mediumHits = matchSignals(normalized, MEDIUM_SIGNALS);

  const raw = 25 + criticalHits * 35 + highHits * 18 + mediumHits * 10 + (hasPhoto ? 5 : 0);
  return Math.max(10, Math.min(100, raw));
}

/**
 * Maps a numeric urgency score to a canonical priority tier.
 *
 * @param score - Urgency score between 0 and 100.
 * @returns Canonical IssuePriority tier.
 */
export function priorityFromScore(score: number): IssuePriority {
  if (score >= 80) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

/**
 * Returns the canonical SLA target in hours for a priority level.
 *
 * @param priority - Canonical priority tier.
 * @returns Target resolution SLA in hours.
 */
export function slaHoursForPriority(priority: IssuePriority): number {
  return PRIORITY_SLA_HOURS[priority];
}

export interface DeterministicTriageInput {
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly category?: IssueCategory;
  readonly hasPhoto?: boolean;
}

/**
 * Produces a complete, deterministic civic triage assessment with zero network calls.
 *
 * @param input - Citizen complaint fields.
 * @returns Complete TriageResult grounded in domain rules.
 */
export function triageDeterministic(input: DeterministicTriageInput): TriageResult {
  const category = classifyCategoryDeterministic(input.title, input.description, input.category);
  const combined = `${input.title} ${input.description} ${input.location}`;
  const urgencyScore = computeUrgencyScore(combined, Boolean(input.hasPhoto));
  const priority = priorityFromScore(urgencyScore);
  const department = recommendDepartment(category);
  const slaHours = slaHoursForPriority(priority);
  const label = CATEGORY_LABELS[category];

  return {
    category,
    priority,
    urgencyScore,
    department,
    slaHours,
    summary: `${label} issue reported near ${input.location}; routed to ${department}.`,
    rationale: `Classified as ${priority.toUpperCase()} priority (urgency ${String(urgencyScore)}/100, ${String(slaHours)}h SLA) based on public-safety and infrastructure impact signals.`,
    source: 'deterministic',
  };
}
