import type {
  AdminUpdateIssueInput,
  CreateIssueInput,
  TriagePreviewInput,
} from '../domain/schemas.js';
import type { CivicIssue, IssueAnalytics, TriageResult } from '../domain/types.js';

export interface IssuesResponse {
  readonly issues: CivicIssue[];
  readonly analytics: IssueAnalytics;
}

/**
 * Executes a JSON fetch request and throws a descriptive Error on non-2xx responses.
 *
 * @param url - Relative API path.
 * @param init - Optional fetch configuration.
 * @returns Parsed JSON response body.
 */
async function requestJson<T>(
  url: string,
  init?: { readonly method: 'POST' | 'PATCH'; readonly body?: string },
): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : {},
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${String(response.status)}.`);
  }
  return data;
}

/**
 * Loads all civic issues and computed dashboard analytics.
 *
 * @returns Issues list and analytics summary.
 */
export function fetchIssues(): Promise<IssuesResponse> {
  return requestJson<IssuesResponse>('/api/issues');
}

/**
 * Requests a live AI triage preview for a citizen complaint before submission.
 *
 * @param input - Draft complaint fields.
 * @returns Preview TriageResult from Gemini or deterministic fallback.
 */
export async function previewTriage(input: TriagePreviewInput): Promise<TriageResult> {
  const data = await requestJson<{ triage: TriageResult }>('/api/triage', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.triage;
}

/**
 * Submits a new citizen grievance for AI triage and persistent tracking.
 *
 * @param input - Validated citizen complaint fields.
 * @returns Newly created CivicIssue and TriageResult.
 */
export function submitIssue(
  input: CreateIssueInput,
): Promise<{ issue: CivicIssue; triage: TriageResult }> {
  return requestJson<{ issue: CivicIssue; triage: TriageResult }>('/api/issues', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Checks whether the current browser holds a valid HttpOnly admin session.
 *
 * @returns Session authentication boolean.
 */
export async function fetchAdminSession(): Promise<boolean> {
  const data = await requestJson<{ authenticated: boolean }>('/api/admin/session');
  return data.authenticated;
}

/**
 * Authenticates an administrator using the configured server passcode.
 *
 * @param passcode - Administrator passcode string.
 * @returns True on successful authentication.
 */
export async function loginAdmin(passcode: string): Promise<boolean> {
  const data = await requestJson<{ authenticated: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
  return data.authenticated;
}

/**
 * Logs out the current administrator and clears the HttpOnly session cookie.
 */
export async function logoutAdmin(): Promise<void> {
  await requestJson<{ authenticated: boolean }>('/api/admin/logout', { method: 'POST' });
}

/**
 * Updates an issue's status, department, or priority with an immutable audit note.
 *
 * @param id - Civic issue identifier.
 * @param input - Admin update payload.
 * @returns Updated CivicIssue record.
 */
export async function updateIssueAsAdmin(
  id: string,
  input: AdminUpdateIssueInput,
): Promise<CivicIssue> {
  const data = await requestJson<{ issue: CivicIssue }>(`/api/admin/issues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.issue;
}
