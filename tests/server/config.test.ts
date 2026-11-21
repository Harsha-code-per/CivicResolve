import { describe, expect, it } from 'vitest';
import { DEFAULT_GEMINI_MODELS, DEV_ADMIN_PASSCODE, loadConfig } from '../../server/config.js';

const strongSecret = 's'.repeat(32);

describe('server configuration', () => {
  it('uses safe development defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 8080,
      isProduction: false,
      adminPasscode: DEV_ADMIN_PASSCODE,
      geminiModels: DEFAULT_GEMINI_MODELS,
      useFirestore: false,
    });
    expect(config.sessionSecret).toHaveLength(64);
    expect(config).not.toHaveProperty('geminiApiKey');
  });

  it('reads every variable, trimming blanks and splitting the model list', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '9000',
      ADMIN_PASSCODE: ' secret-pass ',
      SESSION_SECRET: strongSecret,
      GEMINI_API_KEY: 'key',
      GEMINI_MODELS: 'model-a, ,model-b',
      FIRESTORE_ENABLED: 'true',
      PUBLIC_ORIGIN: 'https://civic.example',
    });
    expect(config).toMatchObject({
      port: 9000,
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
