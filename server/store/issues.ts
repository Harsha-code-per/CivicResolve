import type { AdminUpdateIssueInput, CreateIssueInput } from '../../src/domain/schemas.js';
import { createSeedIssues } from '../../src/domain/seed.js';
import type { CivicIssue, TriageResult } from '../../src/domain/types.js';
import {
  applyAdminTransition,
  buildIssueRecord,
  formatIssueId,
} from '../../src/domain/workflow.js';

/** First reference number handed out after the seed records. */
export const SEQUENCE_START = 1000;

/** Storage port: the HTTP layer depends on this, never on a concrete database. */
export interface IssueStore {
  list(): Promise<readonly CivicIssue[]>;
  getById(id: string): Promise<CivicIssue | undefined>;
  getImage(id: string): Promise<string | undefined>;
  create(input: CreateIssueInput, triage: TriageResult): Promise<CivicIssue>;
  update(id: string, input: AdminUpdateIssueInput): Promise<CivicIssue | undefined>;
}

export interface StoreOptions {
  readonly seed?: readonly CivicIssue[];
  readonly now?: () => Date;
}

/**
 * Turns a validated admin update into the domain transition parameters.
 *
 * @param input - Validated admin update payload.
 * @param timestamp - ISO time of the change.
 * @returns Parameters for applyAdminTransition.
 */
export function toTransition(
  input: AdminUpdateIssueInput,
  timestamp: string,
): Parameters<typeof applyAdminTransition>[1] {
  return {
    status: input.status,
    note: input.note,
    timestamp,
    ...(input.department ? { department: input.department } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
  };
}

/**
 * Creates an in-memory issue store, pre-seeded for demos and used by tests and local dev.
 *
 * @param options - Optional seed records and clock.
 * @returns IssueStore backed by process memory.
 */
export function createMemoryIssueStore(options: StoreOptions = {}): IssueStore {
  const issues = new Map((options.seed ?? createSeedIssues()).map((issue) => [issue.id, issue]));
  const images = new Map<string, string>();
  const now = options.now ?? (() => new Date());
  let sequence = SEQUENCE_START + issues.size;

  return {
    list: () => Promise.resolve([...issues.values()]),
    getById: (id) => Promise.resolve(issues.get(id)),
    getImage: (id) => Promise.resolve(images.get(id)),

    create(input, triage) {
      sequence += 1;
      const issue = buildIssueRecord({
        id: formatIssueId(sequence),
        input,
        triage,
        nowIso: now().toISOString(),
      });
      issues.set(issue.id, issue);
      if (input.imageDataUrl) images.set(issue.id, input.imageDataUrl);
      return Promise.resolve(issue);
    },

    update(id, input) {
      // The executor turns a rejected transition into a rejected promise, like a database would.
      return new Promise((resolve) => {
        const current = issues.get(id);
        if (!current) {
          resolve(undefined);
          return;
        }
        const updated = applyAdminTransition(current, toTransition(input, now().toISOString()));
        issues.set(id, updated);
        resolve(updated);
      });
    },
  };
}
