import { Firestore } from '@google-cloud/firestore';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { geminiTriageModels } from './ai/model.js';
import { createAiTriageClient } from './ai/triage.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createFirestoreIssueStore } from './store/firestore.js';
import { createMemoryIssueStore } from './store/issues.js';

const config = loadConfig(process.env);

const handler = createApp({
  store: config.useFirestore
    ? createFirestoreIssueStore(new Firestore({ ignoreUndefinedProperties: true }))
    : createMemoryIssueStore(),
  ai: createAiTriageClient(
    config.geminiApiKey ? geminiTriageModels(config.geminiApiKey, config.geminiModels) : [],
  ),
  adminPasscode: config.adminPasscode,
  sessionSecret: config.sessionSecret,
  isProduction: config.isProduction,
  staticDir: resolve(process.cwd(), 'dist', 'client'),
  ...(config.publicOrigin ? { publicOrigin: config.publicOrigin } : {}),
});

const server = createServer((req, res) => {
  void handler(req, res);
});

server.listen(config.port, '0.0.0.0', () => {
  const store = config.useFirestore ? 'firestore' : 'memory';
  const ai = config.geminiApiKey ? config.geminiModels.join(' -> ') : 'rules only';
  console.info(`CivicResolve on :${String(config.port)} (store: ${store}, ai: ${ai})`);
});

const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
