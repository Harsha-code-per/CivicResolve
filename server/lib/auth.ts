import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export const SESSION_COOKIE_NAME = 'cr_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Compares two strings in constant time to prevent timing side-channel attacks.
 *
 * @param actual - Provided secret string.
 * @param expected - Expected secret string.
 * @returns True if strings are identical.
 */
export function constantTimeMatch(actual: string, expected: string): boolean {
  const left = Buffer.from(actual, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Signs an expiration timestamp with HMAC-SHA256 to create a stateless admin session token.
 *
 * @param secret - Server-side signing secret.
 * @param nowMs - Optional current timestamp for deterministic testing.
 * @returns Signed session token string.
 */
export function createSessionToken(secret: string, nowMs = Date.now()): string {
  const expiresAt = String(nowMs + SESSION_TTL_MS);
  const sig = createHmac('sha256', secret).update(expiresAt).digest('base64url');
  return `${expiresAt}.${sig}`;
}

/**
 * Verifies a signed admin session token and checks its expiration.
 *
 * @param token - Candidate token string from cookie.
 * @param secret - Server-side signing secret.
 * @param nowMs - Optional current timestamp for deterministic testing.
 * @returns True if token is cryptographically valid and unexpired.
 */
export function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiresAt, providedSig] = parts;
  if (!expiresAt || !providedSig) return false;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= nowMs) return false;

  const expectedSig = createHmac('sha256', secret).update(expiresAt).digest('base64url');
  return constantTimeMatch(providedSig, expectedSig);
}

/**
 * Extracts a named cookie value from the HTTP Cookie request header.
 *
 * @param req - Incoming HTTP request.
 * @param name - Cookie name to read.
 * @returns Cookie value if present, otherwise undefined.
 */
export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const prefix = `${name}=`;
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return undefined;
}

/**
 * Formats an HttpOnly, SameSite=Strict Set-Cookie header for admin authentication.
 *
 * @param value - Token value (empty string to clear cookie).
 * @param isProduction - Whether Secure attribute should be enforced.
 * @param clear - When true, sets Max-Age=0 to log out immediately.
 * @returns Formatted Set-Cookie header value.
 */
export function buildSessionCookie(value: string, isProduction: boolean, clear = false): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    clear ? 'Max-Age=0' : `Max-Age=${String(SESSION_TTL_MS / 1000)}`,
  ];
  if (isProduction) parts.push('Secure');
  return parts.join('; ');
}
