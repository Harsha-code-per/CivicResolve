import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AiTriageClient } from '../../server/ai/triage.js';
import { createAiTriageClient } from '../../server/ai/triage.js';
import { createApp, type AppDependencies } from '../../server/app.js';
import { serveStaticAsset } from '../../server/lib/http.js';
import { createRateLimiter } from '../../server/lib/rate-limit.js';
import { createMemoryIssueStore, type IssueStore } from '../../server/store/issues.js';
import { PNG } from './fixtures.js';

const PASSCODE = 'test-passcode';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const complaint = {
  title: 'Broken streetlight near campus gate',
  description: 'Streetlight pole has been pitch dark for four evenings causing safety risks.',
  location: 'Neelambur Main Road',
};

let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
  close = undefined;
});

async function boot(overrides: Partial<AppDependencies> = {}): Promise<string> {
  const app = createApp({
    store: createMemoryIssueStore(),
    ai: createAiTriageClient([]),
    adminPasscode: PASSCODE,
    sessionSecret: 'test-session-secret-key-32-characters',
    isProduction: false,
    rateLimiter: createRateLimiter(100, 60_000),
    ...overrides,
  });
  const server = createServer((req, res) => {
    void app(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(body),
  });

async function login(base: string): Promise<string> {
  const res = await post(`${base}/api/admin/login`, { passcode: PASSCODE });
  return res.headers.get('set-cookie')?.split(';')[0] ?? '';
}

describe('public API', () => {
  it('serves health with security headers and lists issues with analytics', async () => {
    const base = await boot();
    const health = await fetch(`${base}/healthz`);
    expect(await health.json()).toEqual({ status: 'ok', service: 'civicresolve' });
    expect(health.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(health.headers.get('x-frame-options')).toBe('DENY');
    expect((await fetch(`${base}/api/health`)).status).toBe(200);

    const data = (await (await fetch(`${base}/api/issues`)).json()) as {
      issues: { priority: string }[];
      analytics: { total: number; departmentProgress: unknown[] };
    };
    expect(data.analytics.total).toBe(4);
    expect(data.analytics.departmentProgress).toHaveLength(6);
    expect(data.issues[0]?.priority).toBe('critical');
  });

  it('previews triage, files a complaint with a photo, and serves the photo separately', async () => {
    const base = await boot();
    const preview = await post(`${base}/api/triage`, complaint);
    expect(((await preview.json()) as { triage: { category: string } }).triage.category).toBe(
      'street_lighting',
    );

    const created = await post(`${base}/api/issues`, { ...complaint, imageDataUrl: PNG });
    expect(created.status).toBe(201);
    const { issue } = (await created.json()) as { issue: { id: string; hasImage: boolean } };
    expect(issue.hasImage).toBe(true);

    const detail = await fetch(`${base}/api/issues/${issue.id}`);
    expect(((await detail.json()) as { issue: { id: string } }).issue.id).toBe(issue.id);

    const image = await fetch(`${base}/api/issues/${issue.id}/image`);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(image.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${base}/api/issues/CR-2026-1001/image`)).status).toBe(404);
    expect((await fetch(`${base}/api/issues/CR-2026-9999`)).status).toBe(404);
  });

  it('rejects invalid bodies, wrong content types, spoofed images and oversized payloads', async () => {
    const base = await boot();
    const invalid = await post(`${base}/api/issues`, { ...complaint, title: 'x' });
    expect(invalid.status).toBe(400);
    expect(((await invalid.json()) as { error: string }).error).toMatch(/Title/);

    const spoof = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>').toString('base64')}`;
    expect((await post(`${base}/api/issues`, { ...complaint, imageDataUrl: spoof })).status).toBe(
      400,
    );

    const text = await fetch(`${base}/api/issues`, { method: 'POST', body: 'hello' });
    expect(text.status).toBe(415);

    const broken = await fetch(`${base}/api/issues`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: '{',
    });
    expect(broken.status).toBe(400);

    const huge = await post(`${base}/api/admin/login`, { passcode: 'x'.repeat(20_000) });
    expect(huge.status).toBe(413);
  });
});

describe('admin API', () => {
  it('requires a session, then updates status with an audit note', async () => {
    const base = await boot();
    const patch = (cookie: string, body: unknown, id = 'CR-2026-1002') =>
      fetch(`${base}/api/admin/issues/${id}`, {
        method: 'PATCH',
        headers: { ...JSON_HEADERS, Cookie: cookie },
        body: JSON.stringify(body),
      });

    expect((await patch('', { status: 'in_progress', note: 'Try' })).status).toBe(401);
    expect((await post(`${base}/api/admin/login`, { passcode: 'wrong-pass' })).status).toBe(401);

    const cookie = await login(base);
    const session = await fetch(`${base}/api/admin/session`, { headers: { Cookie: cookie } });
    expect(await session.json()).toEqual({ authenticated: true });

    const ok = await patch(cookie, { status: 'resolved', note: 'Bin cleared and sanitised.' });
    expect(((await ok.json()) as { issue: { status: string } }).issue.status).toBe('resolved');
    expect((await patch(cookie, { status: 'reported', note: 'Rewind' })).status).toBe(409);
    expect((await patch(cookie, { status: 'resolved', note: 'Done' }, 'CR-2026-9999')).status).toBe(
      404,
    );
    expect((await patch(cookie, { status: 'unknown', note: 'Bad' })).status).toBe(400);

    const logout = await post(`${base}/api/admin/logout`, {});
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});

describe('request pipeline', () => {
  it('blocks cross-origin mutations and rate limits per client', async () => {
    const base = await boot({ rateLimiter: createRateLimiter(2, 60_000) });
    const csrf = await post(
      `${base}/api/admin/login`,
      { passcode: PASSCODE },
      { Origin: 'https://evil.example' },
    );
    expect(csrf.status).toBe(403);
    expect((await fetch(`${base}/api/issues`)).status).toBe(200);
    expect((await fetch(`${base}/api/issues`)).status).toBe(200);
    const limited = await fetch(`${base}/api/issues`);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });

  it('hides internal errors behind a generic 500', async () => {
    const failing: IssueStore = {
      ...createMemoryIssueStore(),
      list: () => Promise.reject(new Error('database password leaked in stack')),
    };
    const ai: AiTriageClient = createAiTriageClient([]);
    const base = await boot({ store: failing, ai, now: () => 0 });
    const res = await fetch(`${base}/api/issues`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error.' });
  });

  it('serves static assets with caching, an SPA fallback, and blocks traversal', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'civic-static-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>CivicResolve</title>');
    writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)');
    writeFileSync(join(dir, 'data.bin'), 'x');
    const base = await boot({ staticDir: dir });

    const home = await fetch(`${base}/`);
    expect(home.headers.get('content-type')).toContain('text/html');
    expect(home.headers.get('cache-control')).toBe('no-cache');
    const asset = await fetch(`${base}/assets/app.js`);
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${base}/data.bin`)).headers.get('content-type')).toBe(
      'application/octet-stream',
    );
    expect(await (await fetch(`${base}/tracker`)).text()).toContain('CivicResolve');
    expect((await fetch(`${base}/missing.js`)).status).toBe(404);
    expect((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status).toBe(404);
    expect((await fetch(`${base}/`, { method: 'HEAD' })).status).toBe(200);
    expect((await fetch(`${base}/`, { method: 'DELETE' })).status).toBe(404);
  });

  it('uses the default rate limiter and refuses paths that escape the static root', async () => {
    const app = createApp({
      store: createMemoryIssueStore(),
      ai: createAiTriageClient([]),
      adminPasscode: PASSCODE,
      sessionSecret: 'test-session-secret-key-32-characters',
      isProduction: true,
    });
    const server = createServer((req, res) => {
      void app(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    close = () => new Promise<void>((resolve) => server.close(() => resolve()));
    const base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
    expect((await fetch(`${base}/api/issues`)).status).toBe(200);
    const res = { setHeader: () => undefined, end: () => undefined } as unknown as ServerResponse;
    expect(await serveStaticAsset(tmpdir(), '/../etc/passwd', res)).toBe(false);
  });

  it('returns 404 for the SPA fallback when no index.html exists', async () => {
    const base = await boot({ staticDir: mkdtempSync(join(tmpdir(), 'civic-empty-')) });
    expect((await fetch(`${base}/tracker`)).status).toBe(404);
  });
});
