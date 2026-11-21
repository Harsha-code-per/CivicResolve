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

/** Lowest urgency score consistent with each priority, so score and tier never disagree. */
export const PRIORITY_SCORE_FLOOR: Readonly<Record<IssuePriority, number>> = {
  critical: 80,
  high: 55,
  medium: 35,
  low: 10,
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

/** Score weights: a single critical signal plus the base lands in the high band. */
const SCORE_BASE = 25;
const CRITICAL_WEIGHT = 35;
const HIGH_WEIGHT = 18;
const MEDIUM_WEIGHT = 10;
const PHOTO_BONUS = 5;
const SCORE_MIN = 10;
const SCORE_MAX = 100;

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

  const raw =
    SCORE_BASE +
    criticalHits * CRITICAL_WEIGHT +
    highHits * HIGH_WEIGHT +
    mediumHits * MEDIUM_WEIGHT +
    (hasPhoto ? PHOTO_BONUS : 0);
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, raw));
}

/**
 * Maps a numeric urgency score to a canonical priority tier.
 *
 * @param score - Urgency score between 0 and 100.
 * @returns Canonical IssuePriority tier.
 */
export function priorityFromScore(score: number): IssuePriority {
  if (score >= PRIORITY_SCORE_FLOOR.critical) return 'critical';
  if (score >= PRIORITY_SCORE_FLOOR.high) return 'high';
  if (score >= PRIORITY_SCORE_FLOOR.medium) return 'medium';
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

/**
 * Returns whichever of two priorities is more urgent.
 *
 * @param left - First priority.
 * @param right - Second priority.
 * @returns The more urgent priority.
 */
export function moreUrgent(left: IssuePriority, right: IssuePriority): IssuePriority {
  return PRIORITY_RANK[left] <= PRIORITY_RANK[right] ? left : right;
}

/**
 * Merges Gemini's judgement with the rule engine under a safety floor.
 *
 * Gemini owns the category, department and wording. The rule engine owns the SLA and
 * sets a floor: the model may raise a priority but can never downgrade a hazard the
 * rules flag (for example an exposed live wire), and the urgency score always sits
 * inside the band of the final priority.
 *
 * @param ai - Category, priority, department and wording proposed by Gemini.
 * @param rules - The deterministic triage of the same complaint.
 * @param model - Name of the Gemini model that answered.
 * @returns Final TriageResult.
 */
export function reconcileTriage(
  ai: Pick<TriageResult, 'category' | 'priority' | 'department' | 'summary' | 'rationale'>,
  rules: TriageResult,
  model: string,
): TriageResult {
  const priority = moreUrgent(ai.priority, rules.priority);
  return {
    ...ai,
    priority,
    urgencyScore: Math.max(rules.urgencyScore, PRIORITY_SCORE_FLOOR[priority]),
    slaHours: slaHoursForPriority(priority),
    source: 'gemini',
    model,
  };
}
