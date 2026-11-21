import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  buildSessionCookie,
  constantTimeMatch,
  createSessionToken,
  readCookie,
  verifySessionToken,
} from '../../server/lib/auth.js';
import { getClientIp } from '../../server/lib/http.js';
import { decodeImageDataUrl, hasValidImageMagicBytes } from '../../server/lib/images.js';
import { createRateLimiter } from '../../server/lib/rate-limit.js';
import { isSameOriginRequest } from '../../server/lib/security.js';
import { PNG } from './fixtures.js';

const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]).toString('base64')}`;
const WEBP = `data:image/webp;base64,${Buffer.from('RIFF\0\0\0\0WEBPVP8 ').toString('base64')}`;

const request = (headers: Record<string, string>, remoteAddress?: string): IncomingMessage =>
  ({ headers, socket: { remoteAddress } }) as unknown as IncomingMessage;

describe('image validation', () => {
  it('accepts real PNG, JPEG and WebP headers', () => {
    expect(hasValidImageMagicBytes(PNG)).toBe(true);
    expect(hasValidImageMagicBytes(JPEG)).toBe(true);
    expect(hasValidImageMagicBytes(WEBP)).toBe(true);
  });

  it('rejects spoofed content, mismatched types and non-image data URLs', () => {
    const script = Buffer.from('<script>alert(1)</script>').toString('base64');
    expect(hasValidImageMagicBytes(`data:image/png;base64,${script}`)).toBe(false);
    expect(hasValidImageMagicBytes(`data:image/webp;base64,${script}`)).toBe(false);
    expect(hasValidImageMagicBytes(JPEG.replace('jpeg', 'png'))).toBe(false);
    expect(hasValidImageMagicBytes('data:text/html;base64,AAAA')).toBe(false);
  });

  it('decodes a data URL into type, payload and bytes', () => {
    expect(decodeImageDataUrl(JPEG)).toMatchObject({ mimeType: 'image/jpeg' });
    expect(decodeImageDataUrl(JPEG)?.bytes[0]).toBe(0xff);
    expect(decodeImageDataUrl('not a data url')).toBeUndefined();
  });
});

describe('admin session tokens', () => {
  const secret = 'test-secret-that-is-long-enough-123';

  it('round-trips a signed token and rejects expiry, tampering and malformed input', () => {
    const token = createSessionToken(secret, 1_000);
    expect(verifySessionToken(token, secret, 2_000)).toBe(true);
    expect(verifySessionToken(token, secret, 1_000 + 9 * 3_600_000)).toBe(false);
    expect(verifySessionToken(token, 'other-secret', 2_000)).toBe(false);
    expect(verifySessionToken(`${token}x`, secret, 2_000)).toBe(false);
    expect(verifySessionToken(undefined, secret)).toBe(false);
    expect(verifySessionToken('a.b.c', secret)).toBe(false);
    expect(verifySessionToken('.sig', secret)).toBe(false);
    expect(verifySessionToken('abc.sig', secret)).toBe(false);
  });

  it('compares secrets in constant time, including different lengths', () => {
    expect(constantTimeMatch('abc', 'abc')).toBe(true);
    expect(constantTimeMatch('abc', 'abd')).toBe(false);
    expect(constantTimeMatch('abc', 'abcd')).toBe(false);
  });

  it('reads cookies and builds hardened Set-Cookie headers', () => {
    expect(readCookie(request({ cookie: 'a=1; cr_admin_session=tok' }), 'cr_admin_session')).toBe(
      'tok',
    );
    expect(readCookie(request({ cookie: 'a=1' }), 'cr_admin_session')).toBeUndefined();
    expect(readCookie(request({}), 'cr_admin_session')).toBeUndefined();
    expect(buildSessionCookie('tok', true)).toMatch(
      /HttpOnly; SameSite=Strict; Max-Age=28800; Secure$/,
    );
    expect(buildSessionCookie('', false, true)).toContain('Max-Age=0');
  });
});

describe('request helpers', () => {
  it('trusts only the rightmost X-Forwarded-For hop', () => {
    expect(getClientIp(request({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }))).toBe('203.0.113.9');
    expect(getClientIp(request({}, '10.0.0.1'))).toBe('10.0.0.1');
    expect(getClientIp(request({}))).toBe('unknown');
  });

  it('allows same-origin or configured-origin mutations only', () => {
    expect(isSameOriginRequest(request({}))).toBe(true);
    expect(isSameOriginRequest(request({ origin: 'https://a.example', host: 'a.example' }))).toBe(
      true,
    );
    expect(
      isSameOriginRequest(request({ origin: 'https://evil.example', host: 'a.example' })),
    ).toBe(false);
    expect(isSameOriginRequest(request({ origin: 'https://evil.example' }))).toBe(false);
    expect(
      isSameOriginRequest(request({ origin: 'https://cdn.example' }), 'https://cdn.example'),
    ).toBe(true);
  });

  it('rate limits per key, reports retry time and evicts the oldest key when full', () => {
    const limiter = createRateLimiter(2, 1_000, 2);
    expect(limiter.check('a', 0).allowed).toBe(true);
    expect(limiter.check('a', 10).remaining).toBe(0);
    expect(limiter.check('a', 20)).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.check('a', 1_500).allowed).toBe(true);
    limiter.check('b', 1_500);
    limiter.check('c', 1_500);
    expect(limiter.check('a', 1_600).remaining).toBe(1);
    expect(createRateLimiter(1, 1_000).check('z').allowed).toBe(true);
    expect(createRateLimiter(0, 1_000).check('z', 0)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(createRateLimiter(1, 1_000, 0).check('z').allowed).toBe(true);
  });
});
