import type { IncomingMessage, ServerResponse } from 'node:http';

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
};

/**
 * Applies defense-in-depth HTTP security headers to a server response.
 *
 * @param res - Node HTTP ServerResponse.
 */
export function applySecurityHeaders(res: ServerResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

/**
 * Verifies that state-changing requests originate from the same host or configured public origin.
 *
 * @param req - Incoming HTTP request.
 * @param allowedOrigin - Optional configured PUBLIC_ORIGIN environment value.
 * @returns True if the request passes same-origin validation.
 */
export function isSameOriginRequest(req: IncomingMessage, allowedOrigin?: string): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (allowedOrigin && origin === allowedOrigin) return true;

  const host = req.headers.host;
  if (!host) return false;
  return origin === `http://${host}` || origin === `https://${host}`;
}
