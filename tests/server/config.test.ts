import { describe, expect, it } from 'vitest';
import { DEFAULT_GEMINI_MODELS, DEV_ADMIN_PASSCODE, loadConfig } from '../../server/config.js';

const strongSecret = 's'.repeat(32);

describe('server configuration', () => {
  it('uses safe development defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 8080,
      rateLimitPerMinute: 60,
      isProduction: false,
      adminPasscode: DEV_ADMIN_PASSCODE,
      geminiModels: DEFAULT_GEMINI_MODELS,
      useFirestore: false,
    });
    expect(config.sessionSecret).toHaveLength(64);
    expect(config).not.toHaveProperty('geminiApiKey');
    expect(config).not.toHaveProperty('firebase');
    expect(config.adminEmails).toEqual([]);
  });

  it('leaves sign-in off unless all four Firebase values are set', () => {
    expect(loadConfig({ FIREBASE_API_KEY: 'k', FIREBASE_PROJECT_ID: 'p' })).not.toHaveProperty(
      'firebase',
    );
  });

  it('reads every variable, trimming blanks and splitting the model list', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '9000',
      RATE_LIMIT_PER_MINUTE: '600',
      ADMIN_PASSCODE: ' secret-pass ',
      SESSION_SECRET: strongSecret,
      GEMINI_API_KEY: 'key',
      GEMINI_MODELS: 'model-a, ,model-b',
      FIRESTORE_ENABLED: 'true',
      PUBLIC_ORIGIN: 'https://civic.example',
      FIREBASE_API_KEY: 'web-key',
      FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
      FIREBASE_PROJECT_ID: 'demo',
      FIREBASE_APP_ID: '1:2:web:3',
      ADMIN_EMAILS: 'Ops@City.gov, ,chief@city.gov',
    });
    expect(config).toMatchObject({
      firebase: {
        apiKey: 'web-key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo',
        appId: '1:2:web:3',
      },
      adminEmails: ['ops@city.gov', 'chief@city.gov'],
      port: 9000,
      rateLimitPerMinute: 600,
      isProduction: true,
      adminPasscode: 'secret-pass',
      geminiApiKey: 'key',
      geminiModels: ['model-a', 'model-b'],
      useFirestore: true,
      publicOrigin: 'https://civic.example',
    });
  });

  it('falls back to default models when the list is blank', () => {
    expect(loadConfig({ GEMINI_MODELS: ' , ', GEMINI_API_KEY: '  ' }).geminiModels).toEqual(
      DEFAULT_GEMINI_MODELS,
    );
  });

  it('refuses to start in production without a passcode or a strong secret', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', SESSION_SECRET: strongSecret })).toThrow(
      /ADMIN_PASSCODE/,
    );
    expect(() =>
      loadConfig({ NODE_ENV: 'production', ADMIN_PASSCODE: 'pass', SESSION_SECRET: 'short' }),
    ).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ NODE_ENV: 'production', ADMIN_PASSCODE: 'pass' })).toThrow(
      /SESSION_SECRET/,
    );
  });
});
