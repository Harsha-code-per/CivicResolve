import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { createAiTriageClient } from './ai/triage.js';
import { createApp } from './app.js';
import { createIssueStore } from './store/issues.js';

const port = Number(process.env['PORT'] ?? '8080');
const isProduction = process.env['NODE_ENV'] === 'production';
const adminPasscode = process.env['ADMIN_PASSCODE'] ?? 'civic-admin-2026';
const sessionSecret = process.env['SESSION_SECRET'] ?? randomBytes(32).toString('hex');
const staticDir = resolve(process.cwd(), 'dist', 'client');

const handler = createApp({
  store: createIssueStore(),
  ai: createAiTriageClient(process.env['GEMINI_API_KEY']),
  adminPasscode,
  sessionSecret,
  isProduction,
  staticDir,
  ...(process.env['PUBLIC_ORIGIN'] ? { publicOrigin: process.env['PUBLIC_ORIGIN'] } : {}),
});

const server = createServer((req, res) => {
  void handler(req, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`CivicResolve listening on http://0.0.0.0:${String(port)}`);
});

const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
