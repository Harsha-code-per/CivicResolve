import type { IncomingMessage, ServerResponse } from 'node:http';

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
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

/**
 * Validates that a base64 image data URL contains authentic PNG, JPEG, or WebP magic bytes.
 *
 * @param dataUrl - Data URL string from citizen upload.
 * @returns True when the decoded header matches the declared image MIME type.
 */
export function hasValidImageMagicBytes(dataUrl: string): boolean {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return false;

  const kind = match[1];
  const base64 = match[2];
  if (!kind || !base64) return false;

  const header = Buffer.from(base64.slice(0, 24), 'base64');
  if (kind === 'png') {
    return (
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    );
  }
  if (kind === 'jpeg') {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  return (
    header.length >= 12 &&
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
