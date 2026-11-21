import type {
  AdminUpdateIssueInput,
  CreateIssueInput,
  TriagePreviewInput,
} from '../domain/schemas.js';
import type { FirebaseWebConfig } from '../auth/firebase.js';
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
interface RequestInit {
  readonly method?: 'POST' | 'PATCH';
  readonly body?: string;
  /** Firebase ID token, sent as a bearer credential when present. */
  readonly token?: string | null;
}

/**
 * Builds request headers for a JSON body and an optional bearer token.
 *
 * @param init - Request options.
 * @returns Header map.
 */
function headersFor(init: RequestInit): Record<string, string> {
  return {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
  };
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...(init.method ? { method: init.method } : {}),
    ...(init.body ? { body: init.body } : {}),
    headers: headersFor(init),
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
 * @param token - The citizen's Firebase ID token, when signed in.
 * @returns Newly created CivicIssue and TriageResult.
 */
export function submitIssue(
  input: CreateIssueInput,
  token: string | null,
): Promise<{ issue: CivicIssue; triage: TriageResult }> {
  return requestJson<{ issue: CivicIssue; triage: TriageResult }>('/api/issues', {
    method: 'POST',
    body: JSON.stringify(input),
    token,
  });
}

/**
 * Loads the complaints the signed-in citizen has filed.
 *
 * @param token - The citizen's Firebase ID token.
 * @returns The citizen's issues, newest first.
 */
export async function fetchMyIssues(token: string): Promise<CivicIssue[]> {
  const data = await requestJson<{ issues: CivicIssue[] }>('/api/me/issues', { token });
  return data.issues;
}

/**
 * Reads the public client config (Firebase web settings, or null when sign-in is off).
 *
 * @returns Client config.
 */
export function fetchClientConfig(): Promise<{ firebase: FirebaseWebConfig | null }> {
  return requestJson<{ firebase: FirebaseWebConfig | null }>('/api/config');
}

/**
 * Exchanges an allow-listed Google account's ID token for an admin session.
 *
 * @param token - Firebase ID token of a Google-signed-in user.
 * @returns True on success.
 */
export async function loginAdminWithGoogle(token: string): Promise<boolean> {
  const data = await requestJson<{ authenticated: boolean }>('/api/admin/google', {
    method: 'POST',
    token,
  });
  return data.authenticated;
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
