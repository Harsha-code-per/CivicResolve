import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createAiTriageClient } from '../../server/ai/triage.js';
import { createApp } from '../../server/app.js';
import { createRateLimiter } from '../../server/lib/rate-limit.js';
import { hasValidImageMagicBytes } from '../../server/lib/security.js';
import { createIssueStore } from '../../server/store/issues.js';

const VALID_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('CivicResolve HTTP API & security controls', () => {
  let closeServer: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (closeServer) {
      await closeServer();
      closeServer = undefined;
    }
  });

  async function bootTestServer(maxRequests = 60): Promise<string> {
    const app = createApp({
      store: createIssueStore(),
      ai: createAiTriageClient(),
      adminPasscode: 'test-passcode',
      sessionSecret: 'test-session-secret-key-32-characters',
      isProduction: false,
      rateLimiter: createRateLimiter(maxRequests, 60_000),
    });
    const server = createServer((req, res) => {
      void app(req, res);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    closeServer = () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    const addr = server.address() as AddressInfo;
    return `http://127.0.0.1:${String(addr.port)}`;
  }

  it('returns security headers on /healthz and lists seeded issues', async () => {
    const base = await bootTestServer();
    const health = await fetch(`${base}/healthz`);
    expect(health.status).toBe(200);
    expect(health.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(health.headers.get('x-frame-options')).toBe('DENY');

    const res = await fetch(`${base}/api/issues`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { issues: unknown[]; analytics: { total: number } };
    expect(data.analytics.total).toBeGreaterThanOrEqual(4);
  });

  it('validates image magic bytes and completes citizen submit + admin resolution flow', async () => {
    expect(hasValidImageMagicBytes(VALID_PNG_DATA_URL)).toBe(true);
    expect(hasValidImageMagicBytes('data:image/png;base64,bm90LWEtcG5n')).toBe(false);

    const base = await bootTestServer();
    const createdRes = await fetch(`${base}/api/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Broken streetlight near campus gate',
        description: 'Streetlight pole has been pitch dark for four evenings causing safety risks.',
        location: 'Neelambur Main Road',
        imageDataUrl: VALID_PNG_DATA_URL,
      }),
    });
    expect(createdRes.status).toBe(201);
    const created = (await createdRes.json()) as { issue: { id: string; category: string } };
    expect(created.issue.category).toBe('street_lighting');

    const unauthPatch = await fetch(`${base}/api/admin/issues/${created.issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress', note: 'Unauthorized attempt' }),
    });
    expect(unauthPatch.status).toBe(401);

    const loginRes = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'test-passcode' }),
    });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] ?? '';

    const patchRes = await fetch(`${base}/api/admin/issues/${created.issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ status: 'resolved', note: 'Replaced LED fixture and tested.' }),
    });
    expect(patchRes.status).toBe(200);
  });

  it('blocks cross-origin mutations and enforces per-IP rate limiting', async () => {
    const base = await bootTestServer(2);
    const csrf = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ passcode: 'test-passcode' }),
    });
    expect(csrf.status).toBe(403);

    expect((await fetch(`${base}/api/issues`)).status).toBe(200);
    expect((await fetch(`${base}/api/issues`)).status).toBe(200);
    const limited = await fetch(`${base}/api/issues`);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });
});
