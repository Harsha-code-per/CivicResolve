import { createSeedIssues } from '../../src/domain/seed.js';
import type { CreateIssueInput, AdminUpdateIssueInput } from '../../src/domain/schemas.js';
import type { CivicIssue, TriageResult } from '../../src/domain/types.js';
import { applyAdminTransition } from '../../src/domain/workflow.js';

export interface IssueStore {
  list(): readonly CivicIssue[];
  getById(id: string): CivicIssue | undefined;
  create(input: CreateIssueInput, triage: TriageResult, nowIso?: string): CivicIssue;
  updateByAdmin(id: string, input: AdminUpdateIssueInput, nowIso?: string): CivicIssue | undefined;
}

/**
 * Creates a fast, deterministic in-memory civic issue store pre-seeded for live demos.
 *
 * @param initialIssues - Optional initial records (defaults to realistic municipal seed data).
 * @returns IssueStore repository instance.
 */
export function createIssueStore(initialIssues?: readonly CivicIssue[]): IssueStore {
  const issues: CivicIssue[] = [...(initialIssues ?? createSeedIssues())];
  let sequence = 1000 + issues.length;

  return {
    list(): readonly CivicIssue[] {
      return [...issues];
    },

    getById(id: string): CivicIssue | undefined {
      return issues.find((item) => item.id === id);
    },

    create(input: CreateIssueInput, triage: TriageResult, nowIso = new Date().toISOString()): CivicIssue {
      sequence += 1;
      const record: CivicIssue = {
        id: `CR-2026-${String(sequence)}`,
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
        ...(input.imageDataUrl ? { imageDataUrl: input.imageDataUrl } : {}),
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
      issues.unshift(record);
      return record;
    },

    updateByAdmin(
      id: string,
      input: AdminUpdateIssueInput,
      nowIso = new Date().toISOString(),
    ): CivicIssue | undefined {
      const idx = issues.findIndex((item) => item.id === id);
      const current = issues[idx];
      if (idx === -1 || !current) return undefined;

      const updated = applyAdminTransition(current, {
        status: input.status,
        note: input.note,
        timestamp: nowIso,
        ...(input.department ? { department: input.department } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
      });
      issues[idx] = updated;
      return updated;
    },
  };
}
